import { Router } from '@goddo/router'
import { createContext, parseBody } from '@goddo/context'
import type { Context } from '@goddo/context'
import { mapResponse } from '@goddo/handler'
import { GoddoError, NotFoundError } from '@goddo/error'
import { validate } from '@goddo/schema'
import { compileRoutes } from '@goddo/compile'
import type { CompiledHandler } from '@goddo/compile'
import { GoddoWebSocket } from '@goddo/ws'
import type { TopicMap, WSOptions } from '@goddo/ws'
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
  Route,
  RouteRegistry,
  VoidHandler,
} from '@goddo/types'

const toArray = <T>(value?: T | T[]): T[] => {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

export class Goddo<
  InstanceContext extends Record<string, unknown> = Record<never, never>,
  Routes extends RouteRegistry = Record<never, never>,
> {
  declare readonly _context: InstanceContext
  declare readonly _routes: Routes

  config: GoddoConfig
  router: Router = new Router()
  routes: Route[] = []
  server: Deno.HttpServer | null = null

  store: Record<string, unknown> = {}
  decorators: Record<string, unknown> = {}
  macros: MacroDefinitions = {}

  /** Compiled handler — set by compile(), used by listen() */
  private compiledHandler: CompiledHandler | null = null

  /** Shared pub/sub topic registry for all WebSocket connections on this instance. */
  topics: TopicMap = new Map()

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
    start: [],
    stop: [],
  }

  constructor(config: GoddoConfig = {}) {
    this.config = config
  }

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

  get<const Path extends string, const S extends LocalHooks>(
    path: Path & AssertNoReservedSegment<Path>,
    handler: Handler<InferContext<S, Path> & InstanceContext>,
    hooks?: S,
  ): Goddo<InstanceContext, AddRoute<Routes, 'GET', Path, S>> {
    this.add('GET', path, handler as Handler, hooks)
    return this as unknown as Goddo<InstanceContext, AddRoute<Routes, 'GET', Path, S>>
  }

  post<const Path extends string, const S extends LocalHooks>(
    path: Path & AssertNoReservedSegment<Path>,
    handler: Handler<InferContext<S, Path> & InstanceContext>,
    hooks?: S,
  ): Goddo<InstanceContext, AddRoute<Routes, 'POST', Path, S>> {
    this.add('POST', path, handler as Handler, hooks)
    return this as unknown as Goddo<InstanceContext, AddRoute<Routes, 'POST', Path, S>>
  }

  put<const Path extends string, const S extends LocalHooks>(
    path: Path & AssertNoReservedSegment<Path>,
    handler: Handler<InferContext<S, Path> & InstanceContext>,
    hooks?: S,
  ): Goddo<InstanceContext, AddRoute<Routes, 'PUT', Path, S>> {
    this.add('PUT', path, handler as Handler, hooks)
    return this as unknown as Goddo<InstanceContext, AddRoute<Routes, 'PUT', Path, S>>
  }

  delete<const Path extends string, const S extends LocalHooks>(
    path: Path & AssertNoReservedSegment<Path>,
    handler: Handler<InferContext<S, Path> & InstanceContext>,
    hooks?: S,
  ): Goddo<InstanceContext, AddRoute<Routes, 'DELETE', Path, S>> {
    this.add('DELETE', path, handler as Handler, hooks)
    return this as unknown as Goddo<InstanceContext, AddRoute<Routes, 'DELETE', Path, S>>
  }

  patch<const Path extends string, const S extends LocalHooks>(
    path: Path & AssertNoReservedSegment<Path>,
    handler: Handler<InferContext<S, Path> & InstanceContext>,
    hooks?: S,
  ): Goddo<InstanceContext, AddRoute<Routes, 'PATCH', Path, S>> {
    this.add('PATCH', path, handler as Handler, hooks)
    return this as unknown as Goddo<InstanceContext, AddRoute<Routes, 'PATCH', Path, S>>
  }

  head<const Path extends string, const S extends LocalHooks>(
    path: Path & AssertNoReservedSegment<Path>,
    handler: Handler<InferContext<S, Path> & InstanceContext>,
    hooks?: S,
  ): Goddo<InstanceContext, AddRoute<Routes, 'HEAD', Path, S>> {
    this.add('HEAD', path, handler as Handler, hooks)
    return this as unknown as Goddo<InstanceContext, AddRoute<Routes, 'HEAD', Path, S>>
  }

  options<const Path extends string, const S extends LocalHooks>(
    path: Path & AssertNoReservedSegment<Path>,
    handler: Handler<InferContext<S, Path> & InstanceContext>,
    hooks?: S,
  ): Goddo<InstanceContext, AddRoute<Routes, 'OPTIONS', Path, S>> {
    this.add('OPTIONS', path, handler as Handler, hooks)
    return this as unknown as Goddo<InstanceContext, AddRoute<Routes, 'OPTIONS', Path, S>>
  }

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
          ws._cleanup()
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

  route<const M extends HTTPMethod, const Path extends string, const S extends LocalHooks>(
    method: M,
    path: Path,
    handler: Handler<InferContext<S, Path> & InstanceContext>,
    hooks?: S,
  ): Goddo<InstanceContext, AddRoute<Routes, M, Path, S>> {
    this.add(method, path, handler as Handler, hooks)
    return this as unknown as Goddo<InstanceContext, AddRoute<Routes, M, Path, S>>
  }

  state<K extends string, V>(key: K, value: V): Goddo<InstanceContext & { [key in K]: V }, Routes> {
    this.store[key] = value
    return this as unknown as Goddo<InstanceContext & { [key in K]: V }, Routes>
  }

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

  /** Merge a typed Goddo plugin instance, accumulating its routes in the type. */
  use<PluginContext extends Record<string, unknown>, PluginRoutes extends RouteRegistry>(
    plugin: Goddo<PluginContext, PluginRoutes>,
  ): Goddo<InstanceContext & PluginContext, Routes & PluginRoutes>
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

    for (const route of instance.routes) {
      this.add(route.method, route.path, route.handler, route.hooks)
    }

    Object.assign(this.store, instance.store)
    Object.assign(this.decorators, instance.decorators)
    Object.assign(this.macros, instance.macros)

    for (const key of Object.keys(this.event) as (keyof LifeCycleStore)[]) {
      ;(this.event[key] as unknown[]).push(...instance.event[key])
    }

    return this
  }

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
      'parse',
      'transform',
      'beforeHandle',
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

  onRequest(handler: Handler<Context & InstanceContext>): this {
    this.event.request.push(handler as Handler)
    return this
  }

  onParse(handler: Handler<Context & InstanceContext>): this {
    this.event.parse.push(handler as Handler)
    return this
  }

  onTransform(handler: Handler<Context & InstanceContext>): this {
    this.event.transform.push(handler as Handler)
    return this
  }

  onBeforeHandle(handler: Handler<Context & InstanceContext>): this {
    this.event.beforeHandle.push(handler as Handler)
    return this
  }

  onAfterHandle(handler: Handler<Context & InstanceContext & { response: unknown }>): this {
    this.event.afterHandle.push(handler as Handler)
    return this
  }

  onAfterResponse(handler: Handler<Context & InstanceContext & { response: Response }>): this {
    this.event.afterResponse.push(handler as Handler)
    return this
  }

  onError(
    handler: (context: Context & InstanceContext & { error: Error; code: string }) => unknown,
  ): this {
    this.event.error.push(handler as ErrorHandler)
    return this
  }

  onStart(handler: VoidHandler): this {
    this.event.start.push(handler)
    return this
  }

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
    )
    return this
  }

  handle = async (request: Request, info?: Deno.ServeHandlerInfo | null): Promise<Response> => {
    // Use compiled handler if available (AOT fast path)
    if (this.compiledHandler) return this.compiledHandler(request, info)

    const secret = Array.isArray(this.config.cookieSecret)
      ? this.config.cookieSecret[0]
      : this.config.cookieSecret
    const context = createContext(request, this.store, info, secret)
    Object.assign(context, this.decorators)

    try {
      // --- onRequest ---
      for (const hook of this.event.request) {
        const result = await hook(context)
        if (result !== undefined) return mapResponse(result, context.set, context.cookie)
      }

      const route = this.router.find(request.method as HTTPMethod, context.path)
      if (!route) throw new NotFoundError()

      context.params = route.params

      // --- onParse ---
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        if (this.event.parse.length || toArray(route.hooks.parse).length) {
          for (const hook of [...this.event.parse, ...toArray(route.hooks.parse)]) {
            const result = await hook(context)
            if (result !== undefined) {
              context.body = result
              break
            }
          }
          if (context.body === undefined) context.body = await parseBody(request)
        } else {
          context.body = await parseBody(request)
        }
      }

      // --- onTransform ---
      for (const hook of [...this.event.transform, ...toArray(route.hooks.transform)]) {
        await hook(context)
      }

      // --- derive (extends context before validation) ---
      for (const hook of this.event.derive) {
        const derived = await hook(context)
        if (derived && typeof derived === 'object') Object.assign(context, derived)
      }

      // --- Validation ---
      if (route.hooks.params) {
        context.params = validate(route.hooks.params, context.params, {
          coerce: true,
          path: 'params',
        }) as Record<string, string>
      }

      if (route.hooks.query) {
        context.query = validate(route.hooks.query, context.query, {
          coerce: true,
          path: 'query',
        }) as Record<string, string>
      }

      if (route.hooks.headers) {
        context.headers = validate(route.hooks.headers, context.headers, {
          coerce: true,
          path: 'headers',
        }) as Record<string, string>
      }

      if (route.hooks.body) {
        context.body = validate(route.hooks.body, context.body, { path: 'body' })
      }

      if (route.hooks.cookie) {
        // Validate cookie values as a plain object
        const cookieObj: Record<string, string | undefined> = {}
        for (const name of context.cookie.keys()) {
          cookieObj[name] = context.cookie.get(name).value
        }
        validate(route.hooks.cookie, cookieObj, { path: 'cookie' })
      }

      // --- resolve (extends context after validation) ---
      for (const hook of this.event.resolve) {
        const resolved = await hook(context)
        if (resolved && typeof resolved === 'object') Object.assign(context, resolved)
      }

      // --- onBeforeHandle ---
      for (const hook of [...this.event.beforeHandle, ...toArray(route.hooks.beforeHandle)]) {
        const result = await hook(context)
        if (result !== undefined) return mapResponse(result, context.set, context.cookie)
      }

      // --- Handler ---
      let response = await route.handler(context)

      // --- onAfterHandle ---
      for (const hook of [...this.event.afterHandle, ...toArray(route.hooks.afterHandle)]) {
        const result = await hook(Object.assign(context, { response }))
        if (result !== undefined) response = result
      }

      // --- Response validation ---
      if (route.hooks.response) {
        let resSchema: import('@goddo/types').ResponseSchema | undefined = route.hooks.response
        if (typeof resSchema === 'object' && resSchema !== null && !('type' in resSchema)) {
          const status = context.set.status || 200
          const record = resSchema as Record<string | number, import('@goddo/schema').TSchema>
          resSchema = record[status] ?? record[String(status)]
        }
        if (resSchema) {
          response = validate(resSchema as import('@goddo/schema').TSchema, response, {
            path: 'response',
          })
        }
      }

      const mapped = mapResponse(response, context.set, context.cookie)

      // --- onAfterResponse ---
      for (const hook of [...this.event.afterResponse, ...toArray(route.hooks.afterResponse)]) {
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

      return new Response(error.message, { status })
    }
  }

  listen(options: number | ListenOptions, callback?: (server: Deno.HttpServer) => void): this {
    const config: ListenOptions = typeof options === 'number' ? { port: options } : options

    // AOT compile routes before serving
    if (!this.compiledHandler) this.compile()

    this.server = Deno.serve(
      {
        port: config.port ?? 3000,
        hostname: config.hostname ?? '0.0.0.0',
        onListen: config.onListen ??
          (({ hostname, port }) => {
            console.log(`🦊 Goddo is running at http://${hostname}:${port}`)
          }),
      },
      this.handle,
    )

    for (const hook of this.event.start) hook(this)
    callback?.(this.server)

    return this
  }

  async stop(): Promise<void> {
    if (!this.server) return
    await this.server.shutdown()
    for (const hook of this.event.stop) await hook(this)
    this.server = null
  }
}

export {
  error,
  GoddoError,
  InternalServerError,
  NotFoundError,
  ParseError,
  ValidationError,
} from '@goddo/error'
export { t, validate } from '@goddo/schema'
export type { Static, TSchema } from '@goddo/schema'
export { compileRoutes } from '@goddo/compile'
export type { CompiledHandler, CompiledRoute } from '@goddo/compile'
export { Cookie, CookieJar } from '@goddo/cookie'
export type { CookieProxy } from '@goddo/cookie'
export type { Context } from '@goddo/context'
export { GoddoWebSocket } from '@goddo/ws'
export type { TopicMap, WSOptions } from '@goddo/ws'
export type {
  AddRoute,
  AnyGoddo,
  Handler,
  HTTPMethod,
  InferContext,
  LifeCycleStore,
  LocalHooks,
  MacroDefinitions,
  RouteEntry,
  RouteRegistry,
  RouteSchema,
} from '@goddo/types'

export default Goddo
