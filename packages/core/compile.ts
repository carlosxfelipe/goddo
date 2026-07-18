/**
 * @module
 * compile.ts module for @goddo/core
 */

import { compileSchema, validate } from './schema.ts'
import { mapResponse } from './handler.ts'
import { cleanupMap, parseBody, runCleanups } from './context.ts'
import { GoddoError, NotFoundError } from './error.ts'
import { CookieJar } from './cookie.ts'
import type { Context, SetContext } from './context.ts'
import type { CookieProxy } from './cookie.ts'
import type { TSchema } from './schema.ts'
import type { Handler, HTTPMethod, LifeCycleStore, LocalHooks, ModelRef } from './types.ts'
import type { RouteMatch } from './router.ts'

const toArray = <T>(value?: T | T[]): T[] => {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

/** Detect whether a function is async (returns a Promise) by source inspection. */
const isAsyncFn = (fn: Handler): boolean => {
  const str = fn.toString()
  return str.startsWith('async ') || str.includes('await ') ||
    str.includes('return new Promise') || str.includes('Promise(')
}

/** Pre-merged lifecycle hooks for a single compiled route. */
export interface CompiledHooks {
  /** Global request hooks. */
  request: Handler[]
  /** Route-level request hooks (run right after route matching). */
  localRequest: Handler[]
  /** Request parse hooks. */
  parse: Handler[]
  /** Context transform hooks. */
  transform: Handler[]
  /** Context derive hooks. */
  derive: Handler[]
  /** Pre-handler hooks. */
  beforeHandle: Handler[]
  /** Resolve hooks. */
  resolve: Handler[]
  /** Post-handler hooks. */
  afterHandle: Handler[]
  /** Response mapping hooks (transform the payload before serialization). */
  mapResponse: Handler[]
  /** Post-response hooks. */
  afterResponse: Handler[]
  /** Error handlers. */
  error: ((ctx: Context & { error: Error; code: string }) => unknown)[]
}

/** A fully compiled route — all hooks merged, all flags pre-computed. */
export interface CompiledRoute {
  /** The HTTP method for the compiled route. */
  method: HTTPMethod
  /** The URL path for the compiled route. */
  path: string
  /** The route handler function. */
  handler: Handler
  /** The local hooks registered for the route. */
  hooks: LocalHooks
  /** JIT-compiled validator for the request body. */
  bodyValidator?: (value: unknown) => unknown
  /** JIT-compiled validator for the request query. */
  queryValidator?: (value: unknown) => unknown
  /** JIT-compiled validator for the request params. */
  paramsValidator?: (value: unknown) => unknown
  /** JIT-compiled validator for the request headers. */
  headersValidator?: (value: unknown) => unknown
  /** JIT-compiled validators for responses, keyed by status code. */
  responseValidators?: Record<number, (value: unknown) => unknown>
  /** JIT-compiled validator for generic response schemas (without status map). */
  fallbackResponseValidator?: (value: unknown) => unknown
  /** The pre-compiled execution context flags and hooks. */
  compiled: {
    hooks: CompiledHooks
    hasLocalRequest: boolean
    hasParse: boolean
    hasTransform: boolean
    hasDerive: boolean
    hasResolve: boolean
    hasBeforeHandle: boolean
    hasAfterHandle: boolean
    hasMapResponse: boolean
    hasAfterResponse: boolean
    hasParams: boolean
    hasQuery: boolean
    hasHeaders: boolean
    hasBody: boolean
    hasCookie: boolean
    hasResponse: boolean
    handlerIsAsync: boolean
  }
}

/** The fully compiled global HTTP request handler function. */
export type CompiledHandler = (
  request: Request,
  info?: Deno.ServeHandlerInfo | null,
) => Promise<Response>

/**
 * Compile all routes of a Goddo instance into optimized handler functions.
 *
 * This pre-merges global + route-level lifecycle hooks, pre-computes validation
 * flags, and detects async handlers (sucrose) to skip unnecessary `await`.
 */
export const compileRoutes = (
  routes: { method: HTTPMethod; path: string; handler: Handler; hooks: LocalHooks }[],
  event: LifeCycleStore,
  store: Record<string, unknown>,
  decorators: Record<string, unknown>,
  router: { find(method: HTTPMethod, path: string): RouteMatch | null },
  errorHooks: ((ctx: Context & { error: Error; code: string }) => unknown)[],
  cookieSecret?: string,
  models: Record<string, TSchema> = {},
): CompiledHandler => {
  const resolveModel = (schema: TSchema | string): TSchema => {
    if (typeof schema !== 'string') return schema
    const model = models[schema]
    if (!model) throw new GoddoError(`Model '${schema}' not found`)
    return model
  }
  // Pre-merge hooks for each route
  const compiledRoutes: CompiledRoute[] = routes.map((route) => {
    const hooks: CompiledHooks = {
      request: event.request,
      localRequest: toArray(route.hooks.request),
      parse: [...event.parse, ...toArray(route.hooks.parse)],
      transform: [...event.transform, ...toArray(route.hooks.transform)],
      derive: [...event.derive, ...toArray(route.hooks.derive)],
      beforeHandle: [...event.beforeHandle, ...toArray(route.hooks.beforeHandle)],
      resolve: [...event.resolve, ...toArray(route.hooks.resolve)],
      afterHandle: [...event.afterHandle, ...toArray(route.hooks.afterHandle) as Handler[]],
      mapResponse: [...event.mapResponse, ...toArray(route.hooks.mapResponse) as Handler[]],
      afterResponse: [...event.afterResponse, ...toArray(route.hooks.afterResponse)],
      error: [...errorHooks, ...toArray(route.hooks.error)],
    }

    return {
      method: route.method,
      path: route.path,
      handler: route.handler,
      hooks: route.hooks,
      compiled: {
        hooks,
        hasLocalRequest: hooks.localRequest.length > 0,
        hasParse: hooks.parse.length > 0,
        hasTransform: hooks.transform.length > 0,
        hasDerive: hooks.derive.length > 0,
        hasResolve: hooks.resolve.length > 0,
        hasBeforeHandle: hooks.beforeHandle.length > 0,
        hasAfterHandle: hooks.afterHandle.length > 0,
        hasMapResponse: hooks.mapResponse.length > 0,
        hasAfterResponse: hooks.afterResponse.length > 0,
        hasParams: !!route.hooks.params,
        hasQuery: !!route.hooks.query,
        hasHeaders: !!route.hooks.headers,
        hasBody: !!route.hooks.body,
        hasCookie: !!route.hooks.cookie,
        hasResponse: !!route.hooks.response,
        handlerIsAsync: isAsyncFn(route.handler),
      },
      bodyValidator: route.hooks.body
        ? compileSchema(resolveModel(route.hooks.body), { coerce: false, path: 'body' })
        : undefined,
      queryValidator: route.hooks.query
        ? compileSchema(resolveModel(route.hooks.query), { coerce: true, path: 'query' })
        : undefined,
      paramsValidator: route.hooks.params
        ? compileSchema(resolveModel(route.hooks.params), { coerce: true, path: 'params' })
        : undefined,
      headersValidator: route.hooks.headers
        ? compileSchema(resolveModel(route.hooks.headers), { coerce: true, path: 'headers' })
        : undefined,
      responseValidators: (() => {
        const res = route.hooks.response
        if (res && typeof res === 'object' && res !== null && !('type' in res)) {
          return Object.fromEntries(
            Object.entries(res as Record<string, TSchema | ModelRef>).map(([status, schema]) => [
              status,
              compileSchema(resolveModel(schema), { coerce: false, path: 'response' }),
            ]),
          )
        }
        return undefined
      })(),
      fallbackResponseValidator: (() => {
        const res = route.hooks.response
        if (
          typeof res === 'string' ||
          (res && typeof res === 'object' && res !== null && 'type' in res)
        ) {
          return compileSchema(resolveModel(res as TSchema | ModelRef), {
            coerce: false,
            path: 'response',
          })
        }
        return undefined
      })(),
    }
  })

  // Build static route map for O(1) lookup (routes with no dynamic segments)
  // Two-level Map<method, Map<path, CompiledRoute>> avoids per-request string concat.
  const staticMap = new Map<HTTPMethod, Map<string, CompiledRoute>>()
  // Build handler-to-compiled-route map for dynamic route lookup
  const handlerMap = new Map<Handler, CompiledRoute>()
  for (const cr of compiledRoutes) {
    handlerMap.set(cr.handler, cr)
    if (!cr.path.includes(':') && !cr.path.includes('*')) {
      let methodMap = staticMap.get(cr.method)
      if (!methodMap) {
        methodMap = new Map<string, CompiledRoute>()
        staticMap.set(cr.method, methodMap)
      }
      methodMap.set(cr.path, cr)
    }
  }

  const hasGlobalRequest = event.request.length > 0
  const hasGlobalError = errorHooks.length > 0

  class GoddoContext implements Context {
    request: Request
    server: Deno.ServeHandlerInfo | null
    path: string
    method: string
    params: Record<string, string> = {}
    body: unknown = undefined
    set: SetContext
    store: Record<string, unknown>

    #urlStr: string
    #pathEnd: number
    #queryCache?: Record<string, string>
    #headersCache?: Record<string, string>
    #jar?: CookieJar
    #cookieCache?: CookieProxy
    /** Tracks whether any cleanup callbacks were registered for this context. */
    hasCleanups = false
    /** Mutable reference passed into afterHandle/mapResponse/afterResponse hooks. */
    response: unknown = undefined

    constructor(
      request: Request,
      path: string,
      method: string,
      urlStr: string,
      pathEnd: number,
      set: SetContext,
      store: Record<string, unknown>,
      info: Deno.ServeHandlerInfo | null,
    ) {
      this.request = request
      this.server = info
      this.path = path
      this.method = method
      this.#urlStr = urlStr
      this.#pathEnd = pathEnd
      this.set = set
      this.store = store
    }

    get query() {
      if (!this.#queryCache) {
        this.#queryCache = {}
        if (this.#pathEnd !== -1) {
          const searchParams = new URLSearchParams(this.#urlStr.substring(this.#pathEnd))
          for (const [key, value] of searchParams) this.#queryCache[key] = value
        }
      }
      return this.#queryCache
    }
    set query(v) {
      this.#queryCache = v
    }

    get headers() {
      if (!this.#headersCache) {
        this.#headersCache = {}
        for (const [key, value] of this.request.headers) this.#headersCache[key] = value
      }
      return this.#headersCache
    }
    set headers(v) {
      this.#headersCache = v
    }

    get cookie() {
      if (this.#cookieCache) return this.#cookieCache
      this.#jar = new CookieJar(this.request.headers.get('cookie'), cookieSecret)
      this.#cookieCache = this.#jar as unknown as CookieProxy
      return this.#cookieCache
    }
    set cookie(v) {
      this.#cookieCache = v
    }

    getJar() {
      return this.#jar
    }
    setJar(jar: CookieJar) {
      this.#jar = jar
      this.#cookieCache = undefined
    }

    onCleanup = (fn: () => void | Promise<void>) => {
      let cleanups = cleanupMap.get(this)
      if (!cleanups) {
        cleanups = []
        cleanupMap.set(this, cleanups)
      }
      cleanups.push(fn)
      this.hasCleanups = true
    }

    error(status: number, message?: string) {
      const err = new GoddoError(message ?? String(status))
      err.status = status
      return err
    }

    redirect(location: string, status = 302) {
      return new Response(null, { status, headers: { location } })
    }
  }

  // Pre-apply store and decorators to the prototype to avoid per-request Object.assign overhead.
  // We use getters/setters so that dynamic updates to the global store are reflected.
  const contextDescriptors: PropertyDescriptorMap = {}
  for (const key of Object.keys(store)) {
    contextDescriptors[key] = {
      get: () => store[key],
      set: (val) => {
        store[key] = val
      },
      enumerable: true,
    }
  }
  for (const key of Object.keys(decorators)) {
    contextDescriptors[key] = {
      get: () => decorators[key],
      set: (val) => {
        decorators[key] = val
      },
      enumerable: true,
    }
  }
  Object.defineProperties(GoddoContext.prototype, contextDescriptors)

  // The compiled handler
  return async (request: Request, info: Deno.ServeHandlerInfo | null = null): Promise<Response> => {
    const urlStr = request.url
    const method = request.method as HTTPMethod

    const protocolEnd = urlStr.indexOf('://')
    let pathStart = 0
    if (protocolEnd !== -1) {
      pathStart = urlStr.indexOf('/', protocolEnd + 3)
      if (pathStart === -1) pathStart = urlStr.length
    }
    const pathEnd = urlStr.indexOf('?', pathStart)
    const path = pathStart === urlStr.length
      ? '/'
      : (pathEnd === -1 ? urlStr.substring(pathStart) : urlStr.substring(pathStart, pathEnd))

    // Build set
    const set: SetContext = { headers: {} }

    const context = new GoddoContext(request, path, method, urlStr, pathEnd, set, store, info)

    const hasTrace = event.trace.length > 0
    const runTrace = async (name: string, start: number) => {
      if (!hasTrace) return
      const duration = performance.now() - start
      for (const hook of event.trace) {
        await hook(Object.assign(context, { event: name, duration }))
      }
    }

    let cr: CompiledRoute | undefined

    try {
      let stageStart = 0
      if (hasTrace) stageStart = performance.now()

      // --- onRequest (global only, pre-compiled) ---
      if (hasGlobalRequest) {
        for (const hook of event.request) {
          const result = await hook(context)
          if (result !== undefined) {
            if (hasTrace) await runTrace('request', stageStart)
            return mapResponse(result, set, context.getJar())
          }
        }
      }
      if (hasTrace) await runTrace('request', stageStart)

      // --- Route lookup ---
      // Fast path: static route O(1) without string concat
      cr = staticMap.get(method)?.get(path)

      // Fallback to radix tree for dynamic routes
      if (!cr) {
        const match = router.find(method, path)
        if (!match) throw new NotFoundError()
        context.params = match.params
        // Look up compiled route by handler identity
        cr = handlerMap.get(match.handler)
        if (!cr) throw new NotFoundError()
      }

      const c = cr.compiled
      const ch = c.hooks

      // --- route-level onRequest ---
      if (hasTrace) stageStart = performance.now()
      if (c.hasLocalRequest) {
        for (const hook of ch.localRequest) {
          const result = await hook(context)
          if (result !== undefined) {
            if (hasTrace) await runTrace('localRequest', stageStart)
            return mapResponse(result, set, context.getJar())
          }
        }
      }
      if (hasTrace) await runTrace('localRequest', stageStart)

      // --- onParse ---
      if (hasTrace) stageStart = performance.now()
      if (method !== 'GET' && method !== 'HEAD') {
        if (c.hasParse) {
          for (const hook of ch.parse) {
            const result = await hook(context)
            if (result !== undefined) {
              context.body = result
              break
            }
          }
          if (context.body === undefined) {
            try {
              context.body = await parseBody(request)
            } catch (err) {
              throw context.error(400, err instanceof Error ? err.message : 'Invalid Body')
            }
          }
        } else {
          try {
            context.body = await parseBody(request)
          } catch (err) {
            throw context.error(400, err instanceof Error ? err.message : 'Invalid Body')
          }
        }
      }

      if (cr.bodyValidator) {
        context.body = cr.bodyValidator(context.body)
      }
      if (hasTrace) await runTrace('parse', stageStart)

      // --- onTransform ---
      if (hasTrace) stageStart = performance.now()
      if (c.hasTransform) {
        for (const hook of ch.transform) {
          await hook(context)
        }
      }
      if (hasTrace) await runTrace('transform', stageStart)

      // --- derive ---
      if (hasTrace) stageStart = performance.now()
      if (c.hasDerive) {
        for (const hook of ch.derive) {
          const derived = await hook(context)
          if (derived && typeof derived === 'object') Object.assign(context, derived)
        }
      }
      if (hasTrace) await runTrace('derive', stageStart)

      // --- Validation (pre-computed flags, no conditional on schema existence) ---
      if (hasTrace) stageStart = performance.now()

      // Validation: Query
      if (c.hasQuery && cr.queryValidator) {
        context.query = cr.queryValidator(context.query) as Record<string, string>
      }

      // Validation: Params
      if (c.hasParams && cr.paramsValidator) {
        context.params = cr.paramsValidator(context.params) as Record<string, string>
      }

      // Validation: Headers
      if (c.hasHeaders && cr.headersValidator) {
        context.headers = cr.headersValidator(context.headers) as Record<string, string>
      }

      if (c.hasCookie) {
        let jar = context.getJar()
        if (!jar) {
          jar = new CookieJar(request.headers.get('cookie'), cookieSecret)
          context.setJar(jar)
        }
        const cookieObj: Record<string, string | undefined> = {}
        for (const name of jar.keys()) {
          cookieObj[name] = jar.get(name).value
        }
        validate(resolveModel(cr.hooks.cookie!), cookieObj, { path: 'cookie' })
      }
      if (hasTrace) await runTrace('validation', stageStart)

      // --- resolve ---
      if (hasTrace) stageStart = performance.now()
      if (c.hasResolve) {
        for (const hook of ch.resolve) {
          const resolved = await hook(context)
          if (resolved && typeof resolved === 'object') Object.assign(context, resolved)
        }
      }
      if (hasTrace) await runTrace('resolve', stageStart)

      // --- onBeforeHandle ---
      if (hasTrace) stageStart = performance.now()
      if (c.hasBeforeHandle) {
        for (const hook of ch.beforeHandle) {
          const result = await hook(context)
          if (result !== undefined) {
            if (hasTrace) await runTrace('beforeHandle', stageStart)
            return mapResponse(result, set, context.getJar())
          }
        }
      }
      if (hasTrace) await runTrace('beforeHandle', stageStart)

      // --- Handler (sucrose: skip await for sync handlers) ---
      if (hasTrace) stageStart = performance.now()
      let response: unknown
      if (c.handlerIsAsync) {
        response = await cr.handler(context)
      } else {
        response = cr.handler(context)
        if (response instanceof Promise) {
          response = await response
        }
      }
      if (hasTrace) await runTrace('handler', stageStart)

      // --- onAfterHandle ---
      if (hasTrace) stageStart = performance.now()
      if (c.hasAfterHandle) {
        for (const hook of ch.afterHandle) {
          context.response = response
          const result = await hook(context)
          if (result !== undefined) response = result
        }
      }
      if (hasTrace) await runTrace('afterHandle', stageStart)

      // --- Response validation ---
      if (hasTrace) stageStart = performance.now()
      if (cr.responseValidators || cr.fallbackResponseValidator) {
        const status = set.status ?? 200
        const validator = cr.responseValidators?.[status] ?? cr.fallbackResponseValidator
        if (validator) {
          response = validator(response)
        }
      }
      if (hasTrace) await runTrace('responseValidation', stageStart)

      // --- mapResponse ---
      if (hasTrace) stageStart = performance.now()
      if (c.hasMapResponse) {
        for (const hook of ch.mapResponse) {
          context.response = response
          const result = await hook(context)
          if (result !== undefined) response = result
        }
      }
      if (hasTrace) await runTrace('mapResponse', stageStart)

      const jar = context.getJar()
      const mapped = mapResponse(response, set, jar)

      // --- onAfterResponse ---
      if (hasTrace) stageStart = performance.now()
      if (c.hasAfterResponse) {
        for (const hook of ch.afterResponse) {
          context.response = mapped
          await hook(context)
        }
      }
      if (hasTrace) await runTrace('afterResponse', stageStart)

      return mapped
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      const code = error instanceof GoddoError ? error.code : 'UNKNOWN'
      const status = error instanceof GoddoError ? error.status : 500

      const routeErrorHooks = cr?.compiled.hooks.error ?? errorHooks
      if (hasGlobalError || routeErrorHooks.length > 0) {
        for (const hook of routeErrorHooks) {
          const result = await hook(Object.assign(context, { error, code }))
          if (result !== undefined) {
            if (!set.status || set.status < 400) set.status = status
            return mapResponse(result, set, context.getJar())
          }
        }
      }

      return new Response(error.message, { status })
    } finally {
      if (context.hasCleanups) await runCleanups(context)
    }
  }
}
