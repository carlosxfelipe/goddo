import { validate } from '@goddo/schema'
import { mapResponse } from '@goddo/handler'
import { cleanupMap, parseBody, runCleanups } from '@goddo/context'
import { GoddoError, NotFoundError } from '@goddo/error'
import { CookieJar } from '@goddo/cookie'
import type { Context, SetContext } from '@goddo/context'
import type { CookieProxy } from '@goddo/cookie'
import type { TSchema } from '@goddo/schema'
import type { ResponseSchema } from '@goddo/types'
import type { Handler, HTTPMethod, LifeCycleStore, LocalHooks } from '@goddo/types'
import type { RouteMatch } from '@goddo/router'

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
  request: Handler[]
  parse: Handler[]
  transform: Handler[]
  derive: Handler[]
  beforeHandle: Handler[]
  resolve: Handler[]
  afterHandle: Handler[]
  afterResponse: Handler[]
  error: ((ctx: Context & { error: Error; code: string }) => unknown)[]
}

/** A fully compiled route — all hooks merged, all flags pre-computed. */
export interface CompiledRoute {
  method: HTTPMethod
  path: string
  handler: Handler
  hooks: LocalHooks
  compiled: {
    hooks: CompiledHooks
    hasParse: boolean
    hasTransform: boolean
    hasDerive: boolean
    hasResolve: boolean
    hasBeforeHandle: boolean
    hasAfterHandle: boolean
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
): CompiledHandler => {
  // Pre-merge hooks for each route
  const compiledRoutes: CompiledRoute[] = routes.map((route) => {
    const hooks: CompiledHooks = {
      request: event.request,
      parse: [...event.parse, ...toArray(route.hooks.parse)],
      transform: [...event.transform, ...toArray(route.hooks.transform)],
      derive: event.derive,
      beforeHandle: [...event.beforeHandle, ...toArray(route.hooks.beforeHandle)],
      resolve: event.resolve,
      afterHandle: [...event.afterHandle, ...toArray(route.hooks.afterHandle)],
      afterResponse: [...event.afterResponse, ...toArray(route.hooks.afterResponse)],
      error: errorHooks,
    }

    return {
      method: route.method,
      path: route.path,
      handler: route.handler,
      hooks: route.hooks,
      compiled: {
        hooks,
        hasParse: hooks.parse.length > 0,
        hasTransform: hooks.transform.length > 0,
        hasDerive: hooks.derive.length > 0,
        hasResolve: hooks.resolve.length > 0,
        hasBeforeHandle: hooks.beforeHandle.length > 0,
        hasAfterHandle: hooks.afterHandle.length > 0,
        hasAfterResponse: hooks.afterResponse.length > 0,
        hasParams: !!route.hooks.params,
        hasQuery: !!route.hooks.query,
        hasHeaders: !!route.hooks.headers,
        hasBody: !!route.hooks.body,
        hasCookie: !!route.hooks.cookie,
        hasResponse: !!route.hooks.response,
        handlerIsAsync: isAsyncFn(route.handler),
      },
    }
  })

  // Build static route map for O(1) lookup (routes with no dynamic segments)
  const staticMap = new Map<string, CompiledRoute>()
  // Build handler-to-compiled-route map for dynamic route lookup
  const handlerMap = new Map<Handler, CompiledRoute>()
  for (const cr of compiledRoutes) {
    handlerMap.set(cr.handler, cr)
    if (!cr.path.includes(':') && !cr.path.includes('*')) {
      staticMap.set(`${cr.method}:${cr.path}`, cr)
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
    Object.assign(context, decorators)

    try {
      // --- onRequest (global only, pre-compiled) ---
      if (hasGlobalRequest) {
        for (const hook of event.request) {
          const result = await hook(context)
          if (result !== undefined) return mapResponse(result, set, context.getJar())
        }
      }

      // --- Route lookup ---
      // Fast path: static route O(1)
      let cr: CompiledRoute | undefined = staticMap.get(`${method}:${path}`)

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

      // --- onParse ---
      if (method !== 'GET' && method !== 'HEAD') {
        if (c.hasParse) {
          for (const hook of ch.parse) {
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
      if (c.hasTransform) {
        for (const hook of ch.transform) {
          await hook(context)
        }
      }

      // --- derive ---
      if (c.hasDerive) {
        for (const hook of ch.derive) {
          const derived = await hook(context)
          if (derived && typeof derived === 'object') Object.assign(context, derived)
        }
      }

      // --- Validation (pre-computed flags, no conditional on schema existence) ---
      if (c.hasParams) {
        context.params = validate(cr.hooks.params!, context.params, {
          coerce: true,
          path: 'params',
        }) as Record<string, string>
      }

      if (c.hasQuery) {
        context.query = validate(cr.hooks.query!, context.query, {
          coerce: true,
          path: 'query',
        }) as Record<string, string>
      }

      if (c.hasHeaders) {
        context.headers = validate(cr.hooks.headers!, context.headers, {
          coerce: true,
          path: 'headers',
        }) as Record<string, string>
      }

      if (c.hasBody) {
        context.body = validate(cr.hooks.body!, context.body, { path: 'body' })
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
        validate(cr.hooks.cookie!, cookieObj, { path: 'cookie' })
      }

      // --- resolve ---
      if (c.hasResolve) {
        for (const hook of ch.resolve) {
          const resolved = await hook(context)
          if (resolved && typeof resolved === 'object') Object.assign(context, resolved)
        }
      }

      // --- onBeforeHandle ---
      if (c.hasBeforeHandle) {
        for (const hook of ch.beforeHandle) {
          const result = await hook(context)
          if (result !== undefined) return mapResponse(result, set, context.getJar())
        }
      }

      // --- Handler (sucrose: skip await for sync handlers) ---
      let response: unknown
      if (c.handlerIsAsync) {
        response = await cr.handler(context)
      } else {
        response = cr.handler(context)
        if (response instanceof Promise) {
          response = await response
        }
      }

      // --- onAfterHandle ---
      if (c.hasAfterHandle) {
        for (const hook of ch.afterHandle) {
          const result = await hook(Object.assign(context, { response }))
          if (result !== undefined) response = result
        }
      }

      // --- Response validation ---
      if (c.hasResponse) {
        let resSchema: ResponseSchema | undefined = cr.hooks.response
        if (typeof resSchema === 'object' && resSchema !== null && !('type' in resSchema)) {
          const status = set.status || 200
          const record = resSchema as Record<string | number, TSchema>
          resSchema = record[status] ?? record[String(status)]
        }
        if (resSchema) {
          response = validate(resSchema as TSchema, response, {
            path: 'response',
          })
        }
      }

      const mapped = mapResponse(response, set, context.getJar())

      // --- onAfterResponse ---
      if (c.hasAfterResponse) {
        for (const hook of ch.afterResponse) {
          await hook(Object.assign(context, { response: mapped }))
        }
      }

      return mapped
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      const code = error instanceof GoddoError ? error.code : 'UNKNOWN'
      const status = error instanceof GoddoError ? error.status : 500

      if (hasGlobalError) {
        for (const hook of errorHooks) {
          const result = await hook(Object.assign(context, { error, code }))
          if (result !== undefined) {
            if (!set.status || set.status < 400) set.status = status
            return mapResponse(result, set, context.getJar())
          }
        }
      }

      return new Response(error.message, { status })
    } finally {
      await runCleanups(context)
    }
  }
}
