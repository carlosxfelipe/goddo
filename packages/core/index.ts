/**
 * @module
 * index.ts module for @goddo/core
 */

import { Router } from './router.ts'
import { createContext, parseBody, runCleanups } from './context.ts'
import type { Context } from './context.ts'
import { mapResponse } from './handler.ts'
import { GoddoError, NotFoundError } from './error.ts'
import { validate } from './schema.ts'
import type { TSchema } from './schema.ts'
import { compileRoutes } from './compile.ts'
import type { CompiledHandler } from './compile.ts'
import { GoddoWebSocket, WS_CLEANUP } from './ws.ts'
import type { TopicMap, WSOptions } from './ws.ts'
import type {
  AddRoute,
  AnyGoddo,
  AssertNoReservedSegment,
  ErrorHandler,
  GoddoConfig,
  Handler,
  HTTPMethod,
  InferContext,
  LifeCycleStore,
  ListenOptions,
  LocalHooks,
  MacroDefinitions,
  MaybePromise,
  ModelRef,
  PluginScope,
  Route,
  RouteRegistry,
  TraceHandler,
  VoidHandler,
} from './types.ts'

const toArray = <T>(value?: T | T[]): T[] => {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

/**
 * The core Goddo framework application instance.
 * It handles route registration, plugin mounting, lifecycle events, and HTTP requests.
 */
export class Goddo<
  InstanceContext extends Record<string, unknown> = Record<never, never>,
  Routes extends RouteRegistry = Record<never, never>,
> {
  /** Internal typing artifact for inference (do not use at runtime). */
  declare readonly _context: InstanceContext
  /** Internal typing artifact for routing (do not use at runtime). */
  declare readonly _routes: Routes

  /** Global application configuration. */
  config: GoddoConfig
  /** The Radix-based router instance. */
  router: Router = new Router()
  /** Flat list of all registered routes. */
  routes: Route[] = []
  /** Reference to the active Deno HTTP server, if listening. */
  server: Deno.HttpServer | null = null

  /** Shared state injected into all route contexts. */
  store: Record<string, unknown> = {}
  /** Custom functions/properties decorated onto all route contexts. */
  decorators: Record<string, unknown> = {}
  /** Map of registered macro definitions. */
  macros: MacroDefinitions = {}

  /** Named reusable schemas referenced by string in routes. */
  models: Record<string, TSchema> = {}

  /** Hook propagation scope applied when this instance is mounted via use(). */
  scope: PluginScope = 'local'

  /** Compiled handler — set by compile(), used by listen() */
  private compiledHandler: CompiledHandler | null = null

  /** Shared pub/sub topic registry for all WebSocket connections on this instance. */
  topics: TopicMap = new Map()

  /** Container for all global lifecycle event hooks. */
  event: LifeCycleStore = {
    request: [],
    parse: [],
    transform: [],
    derive: [],
    beforeHandle: [],
    resolve: [],
    afterHandle: [],
    mapResponse: [],
    afterResponse: [],
    error: [],
    trace: [],
    start: [],
    stop: [],
  }

  /**
   * Initializes a new Goddo application instance.
   * @param config Optional global configuration settings.
   */
  constructor(config: GoddoConfig = {}) {
    this.config = config
  }

  /** Internal helper to register a route and expand its macros. */
  private add(method: HTTPMethod, path: string, handler: Handler, hooks: LocalHooks = {}): this {
    const prefixed = `${this.config.prefix ?? ''}${path}` || '/'

    // Expand macro-defined keys in hooks
    const expanded = this.expandMacros(hooks)

    this.routes.push({ method, path: prefixed, handler, hooks: expanded })
    this.router.add(method, prefixed, handler, expanded)
    return this
  }

  /** Expand macro keys found in local hooks into real lifecycle hooks. */
  private expandMacros(hooks: LocalHooks): LocalHooks {
    if (Object.keys(this.macros).length === 0) return hooks

    const result = { ...hooks }

    for (const [key, factory] of Object.entries(this.macros)) {
      if (key in result) {
        const macroValue = result[key]
        delete result[key]

        const generated = factory(macroValue)

        // Merge each generated hook array/value into the result
        for (const [hookKey, hookValue] of Object.entries(generated)) {
          if (hookValue === undefined) continue

          const existing = result[hookKey]
          if (existing !== undefined) {
            // Merge arrays or wrap in arrays
            result[hookKey] = [...toArray(existing), ...toArray(hookValue)]
          } else {
            result[hookKey] = hookValue
          }
        }
      }
    }

    return result
  }

  /** Registers a GET route. */
  get<const Path extends string, const S extends LocalHooks>(
    path: Path & AssertNoReservedSegment<Path>,
    handler: Handler<InferContext<S, Path> & InstanceContext>,
    hooks?: S,
  ): Goddo<InstanceContext, AddRoute<Routes, 'GET', Path, S>> {
    this.add('GET', path, handler as Handler, hooks)
    return this as unknown as Goddo<InstanceContext, AddRoute<Routes, 'GET', Path, S>>
  }

  /** Registers a POST route. */
  post<const Path extends string, const S extends LocalHooks>(
    path: Path & AssertNoReservedSegment<Path>,
    handler: Handler<InferContext<S, Path> & InstanceContext>,
    hooks?: S,
  ): Goddo<InstanceContext, AddRoute<Routes, 'POST', Path, S>> {
    this.add('POST', path, handler as Handler, hooks)
    return this as unknown as Goddo<InstanceContext, AddRoute<Routes, 'POST', Path, S>>
  }

  /** Registers a PUT route. */
  put<const Path extends string, const S extends LocalHooks>(
    path: Path & AssertNoReservedSegment<Path>,
    handler: Handler<InferContext<S, Path> & InstanceContext>,
    hooks?: S,
  ): Goddo<InstanceContext, AddRoute<Routes, 'PUT', Path, S>> {
    this.add('PUT', path, handler as Handler, hooks)
    return this as unknown as Goddo<InstanceContext, AddRoute<Routes, 'PUT', Path, S>>
  }

  /** Registers a DELETE route. */
  delete<const Path extends string, const S extends LocalHooks>(
    path: Path & AssertNoReservedSegment<Path>,
    handler: Handler<InferContext<S, Path> & InstanceContext>,
    hooks?: S,
  ): Goddo<InstanceContext, AddRoute<Routes, 'DELETE', Path, S>> {
    this.add('DELETE', path, handler as Handler, hooks)
    return this as unknown as Goddo<InstanceContext, AddRoute<Routes, 'DELETE', Path, S>>
  }

  /** Registers a PATCH route. */
  patch<const Path extends string, const S extends LocalHooks>(
    path: Path & AssertNoReservedSegment<Path>,
    handler: Handler<InferContext<S, Path> & InstanceContext>,
    hooks?: S,
  ): Goddo<InstanceContext, AddRoute<Routes, 'PATCH', Path, S>> {
    this.add('PATCH', path, handler as Handler, hooks)
    return this as unknown as Goddo<InstanceContext, AddRoute<Routes, 'PATCH', Path, S>>
  }

  /** Registers a HEAD route. */
  head<const Path extends string, const S extends LocalHooks>(
    path: Path & AssertNoReservedSegment<Path>,
    handler: Handler<InferContext<S, Path> & InstanceContext>,
    hooks?: S,
  ): Goddo<InstanceContext, AddRoute<Routes, 'HEAD', Path, S>> {
    this.add('HEAD', path, handler as Handler, hooks)
    return this as unknown as Goddo<InstanceContext, AddRoute<Routes, 'HEAD', Path, S>>
  }

  /** Registers an OPTIONS route. */
  options<const Path extends string, const S extends LocalHooks>(
    path: Path & AssertNoReservedSegment<Path>,
    handler: Handler<InferContext<S, Path> & InstanceContext>,
    hooks?: S,
  ): Goddo<InstanceContext, AddRoute<Routes, 'OPTIONS', Path, S>> {
    this.add('OPTIONS', path, handler as Handler, hooks)
    return this as unknown as Goddo<InstanceContext, AddRoute<Routes, 'OPTIONS', Path, S>>
  }

  /** Registers a route that matches ALL HTTP methods. */
  all<const Path extends string, const S extends LocalHooks>(
    path: Path & AssertNoReservedSegment<Path>,
    handler: Handler<InferContext<S, Path> & InstanceContext>,
    hooks?: S,
  ): Goddo<InstanceContext, AddRoute<Routes, 'ALL', Path, S>> {
    this.add('ALL', path, handler as Handler, hooks)
    return this as unknown as Goddo<InstanceContext, AddRoute<Routes, 'ALL', Path, S>>
  }

  /**
   * Register a WebSocket endpoint.
   *
   * ```ts
   * app.ws('/chat', {
   *   body: t.Object({ text: t.String() }),
   *   open(ws) { ws.subscribe('room') },
   *   message(ws, msg) { ws.publish('room', msg) },
   *   close(ws) { ws.unsubscribe('room') },
   * })
   * ```
   */
  ws<const Path extends string>(path: Path, options: WSOptions): this {
    return this.add(
      'GET',
      path,
      (context) => {
        const { request } = context

        // Reject plain HTTP requests (not a WebSocket upgrade)
        if (request.headers.get('upgrade') !== 'websocket') {
          context.set.status = 426
          return { error: 'Expected a WebSocket upgrade request' }
        }

        const { response, socket } = Deno.upgradeWebSocket(request)
        const ws = new GoddoWebSocket(socket, context, this.topics)

        socket.onopen = () => {
          void options.open?.(ws)
        }

        socket.onmessage = async (event: MessageEvent) => {
          let message: unknown = event.data

          // Auto-parse JSON and validate against body schema
          if (options.body) {
            try {
              if (typeof message === 'string') {
                try {
                  message = JSON.parse(message)
                } catch { /* keep as raw string */ }
              }
              message = validate(options.body, message, { path: 'body' })
            } catch (err) {
              const error = err instanceof Error ? err : new Error(String(err))
              await options.error?.(ws, error)
              return
            }
          }

          await options.message?.(ws, message)
        }

        socket.onclose = async (event: CloseEvent) => {
          ws[WS_CLEANUP]()
          await options.close?.(ws, event.code, event.reason)
        }

        socket.onerror = async () => {
          await options.error?.(ws, new Error('WebSocket error'))
        }

        // Return the 101 Switching Protocols response — mapResponse passes it through as-is
        return response
      },
      {
        params: options.params,
        query: options.query,
        headers: options.headers,
        detail: options.detail,
        _ws: true, // marker: scalar plugin skips this route
      } as LocalHooks,
    )
  }

  /**
   * Mounts a fetch-compatible application under a URL prefix.
   *
   * The mounted app can be a function `(request) => Response`, an object with
   * a `handle` method, or any object exposing `fetch`.
   * The prefix is stripped from the incoming path before forwarding.
   *
   * ```ts
   * app.mount('/v1', (req) => new Response('v1'))
   * ```
   */
  mount(
    prefix: string,
    app:
      | ((request: Request) => MaybePromise<Response>)
      | { handle?: (request: Request) => MaybePromise<Response> }
      | { fetch?: (request: Request) => MaybePromise<Response> },
  ): this {
    const cleanPrefix = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix
    const pattern = `${cleanPrefix}/*`

    const handleRequest = 'fetch' in app && typeof (app as { fetch?: unknown }).fetch === 'function'
      ? (app as { fetch: (request: Request) => MaybePromise<Response> }).fetch
      : 'handle' in app && typeof (app as { handle?: unknown }).handle === 'function'
      ? (app as { handle: (request: Request) => MaybePromise<Response> }).handle
      : app as (request: Request) => MaybePromise<Response>

    this.all(pattern, async ({ request, params }) => {
      const url = new URL(request.url)
      const suffix = params['*'] ?? ''
      url.pathname = `/${suffix}`

      const mountedRequest = new Request(url, request)
      return await handleRequest(mountedRequest)
    })
    return this
  }

  /**
   * Registers a route dynamically by HTTP method.
   */
  route<const M extends HTTPMethod, const Path extends string, const S extends LocalHooks>(
    method: M,
    path: Path,
    handler: Handler<InferContext<S, Path> & InstanceContext>,
    hooks?: S,
  ): Goddo<InstanceContext, AddRoute<Routes, M, Path, S>> {
    this.add(method, path, handler as Handler, hooks)
    return this as unknown as Goddo<InstanceContext, AddRoute<Routes, M, Path, S>>
  }

  /**
   * Registers a named value in the shared state store.
   * The value is injected directly into every route context.
   *
   * ```ts
   * app.state('version', '1.0.0')
   * app.get('/', ({ version }) => version)
   * ```
   */
  state<const K extends string, V>(
    key: K,
    value: V,
  ): Goddo<InstanceContext & { [k in K]: V }, Routes> {
    this.store[key] = value
    return this as unknown as Goddo<InstanceContext & { [k in K]: V }, Routes>
  }

  /**
   * Decorates all route contexts with custom properties or functions.
   */
  decorate<K extends string, V>(
    key: K,
    value: V,
  ): Goddo<InstanceContext & { [key in K]: V }, Routes> {
    this.decorators[key] = value
    return this as unknown as Goddo<InstanceContext & { [key in K]: V }, Routes>
  }

  /**
   * Register macro definitions. Each key maps to a factory that receives the
   * route-level value and returns lifecycle hooks to merge.
   *
   * ```ts
   * app.macro({
   *   auth: (enabled: boolean) => ({
   *     beforeHandle({ headers, error }) {
   *       if (enabled && !headers.authorization) throw error(401)
   *     }
   *   })
   * })
   * .get('/admin', () => 'secret', { auth: true })
   * ```
   */
  macro(definitions: MacroDefinitions): this {
    Object.assign(this.macros, definitions)
    return this
  }

  /**
   * Registers a named reusable schema model.
   *
   * Models can be referenced in route schemas by their name:
   *
   * ```ts
   * app.model('user', t.Object({ id: t.Number(), name: t.String() }))
   * app.get('/users', () => ({ id: 1, name: 'Ada' }), { response: 'user' })
   * ```
   */
  model(name: string, schema: TSchema): this {
    this.models[name] = schema
    return this
  }

  /** Resolve a schema or model reference into a concrete TSchema. */
  private resolveModel(schema: TSchema | ModelRef): TSchema {
    if (typeof schema !== 'string') return schema
    const model = this.models[schema]
    if (!model) throw new GoddoError(`Model '${schema}' not found`)
    return model
  }

  /**
   * Sets the hook propagation scope of this instance when mounted via `use()`.
   *
   * By default an instance plugin is **encapsulated** (`'local'`): its lifecycle
   * hooks only apply to its own routes. Use `'scoped'` to propagate hooks to the
   * parent instance, or `'global'` to propagate them to every ancestor.
   *
   * ```ts
   * const plugin = new Goddo()
   *   .onBeforeHandle(({ error, headers }) => {
   *     if (!headers.authorization) throw error(401)
   *   })
   *   .as('scoped')
   * ```
   */
  as(scope: 'scoped' | 'global'): this {
    this.scope = scope
    return this
  }

  /** Bake an instance's global lifecycle hooks into a route's local hooks (encapsulation). */
  private bakeEventHooks(event: LifeCycleStore, hooks: LocalHooks): LocalHooks {
    const result: LocalHooks = { ...hooks }

    const bake = (key: keyof LocalHooks, globalHooks: unknown[]) => {
      if (globalHooks.length === 0) return
      result[key] = [...globalHooks, ...toArray(result[key])] as never
    }

    bake('request', event.request)
    bake('parse', event.parse)
    bake('transform', event.transform)
    bake('derive', event.derive)
    bake('beforeHandle', event.beforeHandle)
    bake('resolve', event.resolve)
    bake('afterHandle', event.afterHandle)
    bake('mapResponse', event.mapResponse)
    bake('afterResponse', event.afterResponse)
    bake('error', event.error)

    return result
  }

  /** Merge a typed Goddo plugin instance, accumulating its routes in the type. */
  use<PluginContext extends Record<string, unknown>, PluginRoutes extends RouteRegistry>(
    plugin: Goddo<PluginContext, PluginRoutes>,
  ): Goddo<InstanceContext & PluginContext, Routes & PluginRoutes>
  /** Mounts a Goddo plugin function. */
  use<
    Plugin extends AnyGoddo | ((app: this) => AnyGoddo),
  >(
    plugin: Plugin,
  ): Plugin extends (app: this) => infer PluginApp ? PluginApp : Plugin
  use(plugin: unknown): unknown {
    if (typeof plugin === 'function') {
      return (plugin as (app: this) => unknown)(this)
    }

    const instance = plugin as Goddo

    Object.assign(this.store, instance.store)
    Object.assign(this.decorators, instance.decorators)
    Object.assign(this.macros, instance.macros)
    Object.assign(this.models, instance.models)

    if (instance.scope === 'local') {
      // Encapsulated: bake the plugin's global hooks into its own routes only
      for (const route of instance.routes) {
        this.add(
          route.method,
          route.path,
          route.handler,
          this.bakeEventHooks(instance.event, route.hooks),
        )
      }

      // Server lifecycle events always propagate
      this.event.start.push(...instance.event.start)
      this.event.stop.push(...instance.event.stop)

      return this
    }

    // 'scoped' | 'global': hooks propagate to this (parent) instance
    for (const route of instance.routes) {
      this.add(route.method, route.path, route.handler, route.hooks)
    }

    for (const key of Object.keys(this.event) as (keyof LifeCycleStore)[]) {
      ;(this.event[key] as unknown[]).push(...instance.event[key])
    }

    // 'global' keeps propagating if this instance is mounted elsewhere
    if (instance.scope === 'global' && this.scope === 'local') this.scope = 'global'

    return this
  }

  /** Groups multiple routes under a common URL prefix. */
  group(prefix: string, configure: (app: Goddo) => Goddo): this {
    const instance = configure(new Goddo({ prefix }))

    for (const route of instance.routes) {
      this.add(route.method, route.path, route.handler, route.hooks)
    }

    return this
  }

  /**
   * Apply shared hooks and schemas to a group of routes.
   *
   * ```ts
   * app.guard(
   *   { headers: t.Object({ authorization: t.String() }) },
   *   (app) => app.get('/admin', () => 'ok')
   * )
   * ```
   */
  guard(guardHooks: LocalHooks, configure: (app: Goddo) => Goddo): this {
    const instance = new Goddo({ prefix: this.config.prefix })

    // Inherit macros so they work inside guard scope
    Object.assign(instance.macros, this.macros)

    configure(instance)

    for (const route of instance.routes) {
      const merged = this.mergeHooks(guardHooks, route.hooks)
      this.add(route.method, route.path, route.handler, merged)
    }

    return this
  }

  /** Merge guard-level hooks with route-level hooks (guard hooks run first). */
  private mergeHooks(guard: LocalHooks, local: LocalHooks): LocalHooks {
    const result: LocalHooks = { ...local }

    // Merge schema fields (guard provides defaults, local overrides)
    if (guard.body && !result.body) result.body = guard.body
    if (guard.query && !result.query) result.query = guard.query
    if (guard.params && !result.params) result.params = guard.params
    if (guard.headers && !result.headers) result.headers = guard.headers
    if (guard.response && !result.response) result.response = guard.response
    if (guard.cookie && !result.cookie) result.cookie = guard.cookie

    // Merge detail
    if (guard.detail && !result.detail) {
      result.detail = guard.detail
    }

    // Merge hook arrays (guard hooks prepended before local hooks)
    const hookKeys = [
      'request',
      'parse',
      'transform',
      'derive',
      'beforeHandle',
      'resolve',
      'afterHandle',
      'mapResponse',
      'afterResponse',
      'error',
    ] as const
    for (const key of hookKeys) {
      const guardArr = toArray(guard[key])
      const localArr = toArray(result[key])
      if (guardArr.length > 0 || localArr.length > 0) {
        result[key] = [...guardArr, ...localArr] as never
      }
    }

    return result
  }

  /**
   * Extend the context **before** validation (runs in the transform queue).
   * The returned object is merged into the context via `Object.assign`.
   *
   * ```ts
   * app.derive(({ headers }) => ({
   *   bearer: headers.authorization?.replace('Bearer ', '')
   * }))
   * ```
   */
  derive<Returned extends Record<string, unknown>>(
    handler: Handler<Context & InstanceContext>,
  ): Goddo<InstanceContext & Returned, Routes> {
    this.event.derive.push(handler as Handler)
    return this as unknown as Goddo<InstanceContext & Returned, Routes>
  }

  /**
   * Extend the context **after** validation (runs in the beforeHandle queue).
   * The returned object is merged into the context via `Object.assign`.
   *
   * ```ts
   * app.resolve(async ({ headers }) => ({
   *   user: await getUser(headers.authorization)
   * }))
   * ```
   */
  resolve<Returned extends Record<string, unknown>>(
    handler: Handler<Context & InstanceContext>,
  ): Goddo<InstanceContext & Returned, Routes> {
    this.event.resolve.push(handler as Handler)
    return this as unknown as Goddo<InstanceContext & Returned, Routes>
  }

  /** Registers a global request hook (runs before everything else). */
  onRequest(handler: Handler<Context & InstanceContext>): this {
    this.event.request.push(handler as Handler)
    return this
  }

  /** Registers a global custom parsing hook. */
  onParse(handler: Handler<Context & InstanceContext>): this {
    this.event.parse.push(handler as Handler)
    return this
  }

  /** Registers a global context transform hook (runs before validation). */
  onTransform(handler: Handler<Context & InstanceContext>): this {
    this.event.transform.push(handler as Handler)
    return this
  }

  /** Registers a global beforeHandle hook (runs after validation, before the route handler). */
  onBeforeHandle(handler: Handler<Context & InstanceContext>): this {
    this.event.beforeHandle.push(handler as Handler)
    return this
  }

  /** Registers a global afterHandle hook (runs right after the route handler). */
  onAfterHandle(handler: Handler<Context & InstanceContext & { response: unknown }>): this {
    this.event.afterHandle.push(handler as Handler)
    return this
  }

  /** Registers a global mapResponse hook (transforms the payload before serialization). */
  onMapResponse(handler: Handler<Context & InstanceContext & { response: unknown }>): this {
    this.event.mapResponse.push(handler as Handler)
    return this
  }

  /** Registers a global afterResponse hook (runs before the response is finally sent). */
  onAfterResponse(handler: Handler<Context & InstanceContext & { response: Response }>): this {
    this.event.afterResponse.push(handler as Handler)
    return this
  }

  /** Registers a global error handler hook. */
  onError(
    handler: (context: Context & InstanceContext & { error: Error; code: string }) => unknown,
  ): this {
    this.event.error.push(handler as ErrorHandler)
    return this
  }

  /**
   * Registers a trace hook that receives timing information for each lifecycle stage.
   *
   * ```ts
   * app.onTrace(({ event, duration }) => {
   *   console.log(`${event}: ${duration.toFixed(3)}ms`)
   * })
   * ```
   */
  onTrace(handler: TraceHandler): this {
    this.event.trace.push(handler)
    return this
  }

  /** Registers a callback that fires when the server starts. */
  onStart(handler: VoidHandler): this {
    this.event.start.push(handler)
    return this
  }

  /** Registers a callback that fires when the server stops. */
  onStop(handler: VoidHandler): this {
    this.event.stop.push(handler)
    return this
  }

  /** Compile all routes into an optimized handler (AOT). Called automatically by listen(). */
  compile(): this {
    this.compiledHandler = compileRoutes(
      this.routes,
      this.event,
      this.store,
      this.decorators,
      this.router,
      this.event.error,
      Array.isArray(this.config.cookieSecret)
        ? this.config.cookieSecret[0]
        : this.config.cookieSecret,
      this.models,
    )
    // Bypass the uncompiled wrapper so handle() invokes the compiled pipeline directly.
    this.handle = this.compiledHandler
    return this
  }

  /** Processes an incoming HTTP Request and resolves it to a Response. */
  handle: (
    request: Request,
    info?: Deno.ServeHandlerInfo | null,
  ) => Response | Promise<Response> = async (
    request: Request,
    info?: Deno.ServeHandlerInfo | null,
  ): Promise<Response> => {
    // Use compiled handler if available (AOT fast path)
    if (this.compiledHandler) return this.compiledHandler(request, info)

    const secret = Array.isArray(this.config.cookieSecret)
      ? this.config.cookieSecret[0]
      : this.config.cookieSecret
    const context = createContext(request, this.store, info, secret)
    Object.assign(context, this.store, this.decorators)

    let route: ReturnType<Router['find']> = null
    const handleStart = performance.now()

    try {
      // --- onRequest ---
      for (const hook of this.event.request) {
        const result = await hook(context)
        if (result !== undefined) return mapResponse(result, context.set, context.cookie)
      }

      route = this.router.find(request.method as HTTPMethod, context.path)
      if (!route) throw new NotFoundError()

      context.params = route.params

      // --- route-level onRequest ---
      for (const hook of toArray(route.hooks.request)) {
        const result = await hook(context)
        if (result !== undefined) return mapResponse(result, context.set, context.cookie)
      }

      // --- onParse ---
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        let done = false
        if (this.event.parse.length || toArray(route.hooks.parse).length) {
          for (const hook of this.event.parse) {
            const result = await hook(context)
            if (result !== undefined) {
              context.body = result
              done = true
              break
            }
          }
          if (!done) {
            for (const hook of toArray(route.hooks.parse)) {
              const result = await hook(context)
              if (result !== undefined) {
                context.body = result
                done = true
                break
              }
            }
          }
          if (!done) context.body = await parseBody(request)
        } else {
          context.body = await parseBody(request)
        }
      }

      // --- onTransform ---
      for (const hook of this.event.transform) await hook(context)
      for (const hook of toArray(route.hooks.transform)) await hook(context)

      // --- derive (extends context before validation) ---
      for (const hook of this.event.derive) {
        const derived = await hook(context)
        if (derived && typeof derived === 'object') Object.assign(context, derived)
      }
      for (const hook of toArray(route.hooks.derive)) {
        const derived = await hook(context)
        if (derived && typeof derived === 'object') Object.assign(context, derived)
      }

      // --- Validation ---
      if (route.hooks.params) {
        context.params = validate(this.resolveModel(route.hooks.params), context.params, {
          coerce: true,
          path: 'params',
        }) as Record<string, string>
      }

      if (route.hooks.query) {
        context.query = validate(this.resolveModel(route.hooks.query), context.query, {
          coerce: true,
          path: 'query',
        }) as Record<string, string>
      }

      if (route.hooks.headers) {
        context.headers = validate(this.resolveModel(route.hooks.headers), context.headers, {
          coerce: true,
          path: 'headers',
        }) as Record<string, string>
      }

      if (route.hooks.body) {
        context.body = validate(this.resolveModel(route.hooks.body), context.body, { path: 'body' })
      }

      if (route.hooks.cookie) {
        // Validate cookie values as a plain object
        const cookieObj: Record<string, string | undefined> = {}
        for (const name of context.cookie.keys()) {
          cookieObj[name] = context.cookie.get(name).value
        }
        validate(this.resolveModel(route.hooks.cookie), cookieObj, { path: 'cookie' })
      }

      // --- resolve (extends context after validation) ---
      for (const hook of this.event.resolve) {
        const resolved = await hook(context)
        if (resolved && typeof resolved === 'object') Object.assign(context, resolved)
      }
      for (const hook of toArray(route.hooks.resolve)) {
        const resolved = await hook(context)
        if (resolved && typeof resolved === 'object') Object.assign(context, resolved)
      }

      // --- onBeforeHandle ---
      for (const hook of this.event.beforeHandle) {
        const result = await hook(context)
        if (result !== undefined) return mapResponse(result, context.set, context.cookie)
      }
      for (const hook of toArray(route.hooks.beforeHandle)) {
        const result = await hook(context)
        if (result !== undefined) return mapResponse(result, context.set, context.cookie)
      }

      // --- Handler ---
      let response = await route.handler(context)

      // --- onAfterHandle ---
      for (const hook of this.event.afterHandle) {
        const result = await hook(Object.assign(context, { response }))
        if (result !== undefined) response = result
      }
      for (const hook of toArray(route.hooks.afterHandle)) {
        const result = await hook(Object.assign(context, { response }))
        if (result !== undefined) response = result
      }

      // --- Response validation ---
      if (route.hooks.response) {
        let resSchema: TSchema | undefined
        if (typeof route.hooks.response === 'string') {
          resSchema = this.resolveModel(route.hooks.response)
        } else if (
          typeof route.hooks.response === 'object' &&
          route.hooks.response !== null &&
          !('type' in route.hooks.response)
        ) {
          const status = context.set.status || 200
          const record = route.hooks.response as Record<string | number, TSchema | ModelRef>
          const candidate = record[status] ?? record[String(status)]
          if (candidate) resSchema = this.resolveModel(candidate)
        } else {
          resSchema = this.resolveModel(route.hooks.response as TSchema)
        }
        if (resSchema) {
          response = validate(resSchema, response, {
            path: 'response',
          })
        }
      }

      // --- mapResponse ---
      for (const hook of this.event.mapResponse) {
        const result = await hook(Object.assign(context, { response }))
        if (result !== undefined) response = result
      }
      for (const hook of toArray(route.hooks.mapResponse)) {
        const result = await hook(Object.assign(context, { response }))
        if (result !== undefined) response = result
      }

      const mapped = mapResponse(response, context.set, context.cookie)

      // --- onAfterResponse ---
      for (const hook of this.event.afterResponse) {
        await hook(Object.assign(context, { response: mapped }))
      }
      for (const hook of toArray(route.hooks.afterResponse)) {
        await hook(Object.assign(context, { response: mapped }))
      }

      return mapped
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      const code = error instanceof GoddoError ? error.code : 'UNKNOWN'
      const status = error instanceof GoddoError ? error.status : 500

      for (const hook of this.event.error) {
        const result = await hook(Object.assign(context, { error, code }))
        if (result !== undefined) {
          if (!context.set.status || context.set.status < 400) context.set.status = status
          return mapResponse(result, context.set, context.cookie)
        }
      }
      for (const hook of toArray(route?.hooks.error)) {
        const result = await hook(Object.assign(context, { error, code }))
        if (result !== undefined) {
          if (!context.set.status || context.set.status < 400) context.set.status = status
          return mapResponse(result, context.set, context.cookie)
        }
      }

      return new Response(error.message, { status })
    } finally {
      if (this.event.trace.length > 0) {
        const duration = performance.now() - handleStart
        for (const hook of this.event.trace) {
          await hook(Object.assign(context, { event: 'handle', duration }))
        }
      }
      await runCleanups(context)
    }
  }

  /**
   * Starts the internal Deno HTTP server.
   * @param options Configuration options or just a port number.
   * @param callback Optional callback invoked after the server has successfully started listening.
   */
  listen(options: number | ListenOptions, callback?: (server: Deno.HttpServer) => void): this {
    const config: ListenOptions = typeof options === 'number' ? { port: options } : options

    // AOT compile routes before serving unless explicitly disabled
    if (this.config.aot !== false && !this.compiledHandler) this.compile()

    this.server = Deno.serve(
      {
        port: config.port ?? 3000,
        hostname: config.hostname ?? '0.0.0.0',
        onListen: config.onListen ??
          (({ hostname, port }) => {
            console.log(`🦕 Goddo is running at http://${hostname}:${port}`)
          }),
      },
      this.handle,
    )

    for (const hook of this.event.start) hook(this)
    callback?.(this.server)

    return this
  }

  /** Gracefully stops the HTTP server. */
  async stop(): Promise<void> {
    if (!this.server) return
    await this.server.shutdown()
    for (const hook of this.event.stop) await hook(this)
    this.server = null
  }
}

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

/** Helper function to create a new GoddoError with a specific HTTP status. */
export { error } from './error.ts'
/** Base class for all Goddo framework errors. */
export { GoddoError } from './error.ts'
/** Error thrown when an unexpected server condition occurs. */
export { InternalServerError } from './error.ts'
/** Error thrown when a requested route or resource is not found. */
export { NotFoundError } from './error.ts'
/** Error thrown when incoming data fails to parse (e.g., malformed JSON). */
export { ParseError } from './error.ts'
/** Error thrown when incoming data fails schema validation. */
export { ValidationError } from './error.ts'

// ---------------------------------------------------------------------------
// Schema validation
// ---------------------------------------------------------------------------

/** Schema builder object, similar to TypeBox's `Type`. */
export { t } from './schema.ts'
/**
 * Validates a value against a given schema. Throws ValidationError on failure.
 */
export { validate } from './schema.ts'

/** Options specific to array validation. */
export type { ArrayOptions } from './schema.ts'
/** Options specific to file validation. */
export type { FileOptions } from './schema.ts'
/** Internal representation of file options after the `type` key is renamed. */
export type { FileSchemaOptions } from './schema.ts'
/** Computes the intersection of a tuple of static schema types. */
export type { IntersectStatics } from './schema.ts'
/** Options specific to number validation. */
export type { NumberOptions } from './schema.ts'
/** Options specific to object validation. */
export type { ObjectOptions } from './schema.ts'
/** Internal helper to extract optional keys. */
export type { OptionalKeys } from './schema.ts'
/** Internal helper to prettify object types. */
export type { Prettify } from './schema.ts'
/** Internal helper to extract required keys. */
export type { RequiredKeys } from './schema.ts'
/** Base options for all schema types. */
export type { SchemaOptions } from './schema.ts'
/** Extracts the static TypeScript type from a TSchema. */
export type { Static } from './schema.ts'
/** Infers the static type of an object from its properties. */
export type { StaticProperties } from './schema.ts'
/** Options specific to string validation. */
export type { StringOptions } from './schema.ts'
/** Schema representing any value. */
export type { TAny } from './schema.ts'
/** Schema representing an array of items. */
export type { TArray } from './schema.ts'
/** Schema representing a boolean. */
export type { TBoolean } from './schema.ts'
/** Schema representing a Date object. */
export type { TDate } from './schema.ts'
/** Schema representing an enum of specific values. */
export type { TEnum } from './schema.ts'
/** Schema representing a File object. */
export type { TFile } from './schema.ts'
/** Schema representing an array of File objects (multipart file upload). */
export type { TFiles } from './schema.ts'
/** Schema representing an integer. */
export type { TInteger } from './schema.ts'
/** Schema representing an intersection of multiple schemas (must satisfy all). */
export type { TIntersect } from './schema.ts'
/** Schema representing an exact literal value. */
export type { TLiteral } from './schema.ts'
/** Schema representing a null value. */
export type { TNull } from './schema.ts'
/** Schema representing a number. */
export type { TNumber } from './schema.ts'
/** Schema representing a number that accepts a coercible string. */
export type { TNumeric } from './schema.ts'
/** Schema representing an object with specific properties. */
export type { TObject } from './schema.ts'
/** Schema representing a string that encodes an object. */
export type { TObjectString } from './schema.ts'
/** Schema modifier marking a property as optional. */
export type { TOptional } from './schema.ts'
/** Record of object properties mapped to their schemas. */
export type { TProperties } from './schema.ts'
/** Schema representing a record of arbitrary string keys to typed values. */
export type { TRecord } from './schema.ts'
/** Base interface for all TypeBox-like schemas. */
export type { TSchema } from './schema.ts'
/** Schema representing a string. */
export type { TString } from './schema.ts'
/** Schema representing a fixed-length tuple of typed items. */
export type { TTuple } from './schema.ts'
/** Schema representing a union of multiple schemas. */
export type { TUnion } from './schema.ts'
/** Schema representing an unknown value. */
export type { TUnknown } from './schema.ts'
/** Options for runtime validation. */
export type { ValidateOptions } from './schema.ts'

// ---------------------------------------------------------------------------
// Route compilation
// ---------------------------------------------------------------------------

/**
 * Compile all routes of a Goddo instance into optimized handler functions.
 */
export { compileRoutes } from './compile.ts'
/** The fully compiled global HTTP request handler function. */
export type { CompiledHandler } from './compile.ts'
/** Pre-merged lifecycle hooks for a single compiled route. */
export type { CompiledHooks } from './compile.ts'
/** A fully compiled route — all hooks merged, all flags pre-computed. */
export type { CompiledRoute } from './compile.ts'

// ---------------------------------------------------------------------------
// Response handling and Server-Sent Events
// ---------------------------------------------------------------------------

/** Maps any unknown response value into a standard Web API Response object. */
export { mapResponse } from './handler.ts'
/** Creates a Server-Sent Event message to be yielded from a generator handler. */
export { sse } from './handler.ts'
/** A Server-Sent Event message accepted by the `sse()` helper. */
export type { SSEMessage } from './handler.ts'

// ---------------------------------------------------------------------------
// Cookie manipulation
// ---------------------------------------------------------------------------

/** Represents a single HTTP cookie with reactive properties. */
export { Cookie } from './cookie.ts'
/** A proxy-backed cookie store for reactive cookie access. */
export { CookieJar } from './cookie.ts'
/** Asynchronously signs a cookie value using HMAC-SHA256. */
export { signCookie } from './cookie.ts'
/** Asynchronously verifies a signed cookie value. */
export { verifyCookie } from './cookie.ts'
/** Configuration attributes for an HTTP cookie. */
export type { CookieAttributes } from './cookie.ts'
/** Type wrapper allowing proxy-style property access to Cookies on the Jar. */
export type { CookieProxy } from './cookie.ts'

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

/** High-performance Radix Tree router used by Goddo. */
export { Router } from './router.ts'
/** Internal Radix Tree node structure. */
export type { RadixNode } from './router.ts'
/** Data stored at a matching route node. */
export type { RouteData } from './router.ts'
/** Represents a matched route during find(). */
export type { RouteMatch } from './router.ts'

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

/** The primary Goddo request context passed to all route handlers and lifecycle hooks. */
export type { Context } from './context.ts'
/** Represents the mutable context that shapes the final HTTP response. */
export type { SetContext } from './context.ts'

// ---------------------------------------------------------------------------
// WebSocket
// ---------------------------------------------------------------------------

/** Wrapper around the native WebSocket with Elysia-compatible pub/sub helpers. */
export { GoddoWebSocket } from './ws.ts'
/** One Map per Goddo instance mapping topic names to subscriber sets. */
export type { TopicMap } from './ws.ts'
/** Options for configuring a Goddo WebSocket upgrade. */
export type { WSOptions } from './ws.ts'

// ---------------------------------------------------------------------------
// Framework and routing types
// ---------------------------------------------------------------------------

/** Intersect a new route into an existing registry. */
export type { AddRoute } from './types.ts'
/** Represents a Goddo instance with any route registry and store. */
export type { AnyGoddo } from './types.ts'
/** Compile-time guard that prevents Treaty-reserved path segments. */
export type { AssertNoReservedSegment } from './types.ts'
/** Convert a RouteSchema's TSchema fields into a plain RouteEntry. */
export type { BuildRouteEntry } from './types.ts'
/** OpenAPI document details for a specific route. */
export type { DocumentDetail } from './types.ts'
/** A handler specifically tailored for dealing with errors. */
export type { ErrorHandler } from './types.ts'
/** Global configuration options for the Goddo instance. */
export type { GoddoConfig } from './types.ts'
/** A standard route handler function. */
export type { Handler } from './types.ts'
/** Standard HTTP methods supported by the framework. */
export type { HTTPMethod } from './types.ts'
/** Infers the full context type for a route based on its path and schema. */
export type { InferContext } from './types.ts'
/** Identifies a specific lifecycle hook event. */
export type { LifeCycleEvent } from './types.ts'
/** Storage for all lifecycle hook handlers. */
export type { LifeCycleStore } from './types.ts'
/** Options for configuring the HTTP server listener. */
export type { ListenOptions } from './types.ts'
/** Local hooks and configurations applied to a specific route. */
export type { LocalHooks } from './types.ts'
/** A map of macro names to their corresponding factories. */
export type { MacroDefinitions } from './types.ts'
/** Factory returned by a macro definition — returns lifecycle hooks to merge. */
export type { MacroFactory } from './types.ts'
/** Utility type for synchronous or asynchronous returns. */
export type { MaybePromise } from './types.ts'
/** A reference to a named model registered with `app.model()`. */
export type { ModelRef } from './types.ts'
/** Extracts URL parameters from a path string. */
export type { ParamsFromPath } from './types.ts'
/** Splits a path string into its URL segments as a string union. */
export type { PathSegments } from './types.ts'
/** Hook propagation scope applied when an instance is mounted via `use()`. */
export type { PluginScope } from './types.ts'
/** Extracts the subset of path segments that collide with Treaty-reserved words. */
export type { ReservedSegmentsIn } from './types.ts'
/** Defines the expected response schema, optionally mapped by HTTP status code. */
export type { ResponseSchema } from './types.ts'
/** Represents a compiled route entry in the framework. */
export type { Route } from './types.ts'
/** Shape of a single registered route's I/O, inferred from its schemas. */
export type { RouteEntry } from './types.ts'
/** Maps path to HTTP method to RouteEntry. */
export type { RouteRegistry } from './types.ts'
/** Schema definitions for validating a route's inputs and outputs. */
export type { RouteSchema } from './types.ts'
/** A handler that receives timing information for a lifecycle stage. */
export type { TraceHandler } from './types.ts'
/** HTTP method names (lowercase) reserved by the Treaty proxy. */
export type { TreatyReservedSegment } from './types.ts'
/** A lifecycle handler that returns no value, used for start/stop events. */
export type { VoidHandler } from './types.ts'

export default Goddo
