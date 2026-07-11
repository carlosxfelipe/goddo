/**
 * @goddo/treaty — Type-safe HTTP client for Goddo.
 *
 * Equivalent to Elysia Eden Treaty: a Proxy-based client that maps
 * `client.path.segment.method(opts)` to typed `fetch` calls, with full
 * end-to-end TypeScript inference from the server's route definitions.
 */

import type { RouteEntry, RouteRegistry } from '@goddo/core'
export type { RouteEntry, RouteRegistry } from '@goddo/core'

// ---------------------------------------------------------------------------
// Response type
// ---------------------------------------------------------------------------

/** Structured response returned by every Treaty method call. */
export type TreatyResponse<T> = Promise<
  | { data: Awaited<T>; error: null; status: number; headers: Headers; response: Response }
  | { data: null; error: Error; status: number; headers: Headers; response: Response | null }
>

// ---------------------------------------------------------------------------
// Type utilities
// ---------------------------------------------------------------------------

/** Convert a Union type to an Intersection type. */
export type UnionToIntersection<U> = (U extends unknown ? (x: U) => void : never) extends
  (x: infer I) => void ? I
  : never

/**
 * Split a path string into its segments.
 * "/user/:id/posts" → ["user", ":id", "posts"]
 * "/"              → []
 */
export type SplitPath<S extends string> = S extends `/${infer Rest}` ? SplitPath<Rest>
  : S extends `${infer Head}/${infer Tail}` ? Head extends '' ? SplitPath<Tail>
    : [Head, ...SplitPath<Tail>]
  : S extends '' ? []
  : [S]

/** Extract the param name: ":id" → "id" */
export type ParamName<S extends string> = S extends `:${infer N}` ? N : never

/** True when a segment is a named param */
export type IsParamSeg<S extends string> = S extends `:${string}` ? true : false

/** Per-call options accepted by every method function */
export type CallOptions<E extends RouteEntry> = {
  body?: E['body']
  query?: E['query'] extends Record<string, unknown> ? Partial<E['query']>
    : Record<string, unknown>
  headers?: Record<string, string>
  fetch?: Omit<RequestInit, 'method' | 'body' | 'headers'>
}

/** A single HTTP method call: accepts options, returns a structured response */
export type MethodFn<E extends RouteEntry> = (
  options?: CallOptions<E>,
) => TreatyResponse<E['response']>

/** Map uppercase HTTP method keys → lowercase method functions */
export type MethodsProxy<Methods extends Partial<Record<string, RouteEntry>>> = {
  [M in keyof Methods & string as Lowercase<M>]: Methods[M] extends RouteEntry
    ? MethodFn<Methods[M]>
    : never
}

/** Recursively build the proxy shape from path segments */
export type SegmentsToProxy<
  Segs extends string[],
  Methods extends Partial<Record<string, RouteEntry>>,
> = Segs extends [] ? MethodsProxy<Methods>
  : Segs extends [infer Head extends string, ...infer Tail extends string[]]
    ? IsParamSeg<Head> extends true
      ? (params: { [K in ParamName<Head>]: string }) => SegmentsToProxy<Tail, Methods>
    : { [K in Head]: SegmentsToProxy<Tail, Methods> }
  : never

/** Build proxy type from a single path string */
export type PathProxy<
  Path extends string,
  Methods extends Partial<Record<string, RouteEntry>>,
> = SegmentsToProxy<SplitPath<Path>, Methods>

/**
 * Build the complete, merged proxy type from a `RouteRegistry`.
 * Each registered path is converted to its callable proxy shape and then
 * all shapes are intersected together.
 */
export type TreatyProxyFrom<Registry extends RouteRegistry> = UnionToIntersection<
  {
    [Path in keyof Registry & string]: PathProxy<Path, Registry[Path]>
  }[keyof Registry & string]
>

// ---------------------------------------------------------------------------
// Global options
// ---------------------------------------------------------------------------

/** Options applied globally to every request made by the treaty client. */
export interface TreatyOptions {
  /** Default headers merged into every request. */
  headers?: Record<string, string>
  /** Default fetch options merged into every request (method/body/headers excluded). */
  fetch?: Omit<RequestInit, 'method' | 'body' | 'headers'>
}

// ---------------------------------------------------------------------------
// Runtime implementation
// ---------------------------------------------------------------------------

const HTTP_METHODS = new Set(['get', 'post', 'put', 'delete', 'patch', 'head', 'options'])

function buildUrl(baseUrl: string, segments: string[], query?: Record<string, unknown>): URL {
  const trimmed = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
  const path = segments.length > 0 ? `/${segments.join('/')}` : '/'
  const url = new URL(trimmed + path)
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value))
      }
    }
  }
  return url
}

function createProxy(baseUrl: string, segments: string[], globalOpts: TreatyOptions): unknown {
  return new Proxy(
    // A named function target makes the proxy both property-accessible AND callable
    function _goddo() {},
    {
      get(_target, prop: string | symbol) {
        if (typeof prop !== 'string') return undefined

        // ── HTTP method call ───────────────────────────────────────────────
        if (HTTP_METHODS.has(prop)) {
          return async (
            opts: {
              body?: unknown
              query?: Record<string, unknown>
              headers?: Record<string, string>
              fetch?: RequestInit
            } = {},
          ) => {
            const url = buildUrl(baseUrl, segments, opts.query)
            const hasBody = opts.body !== undefined

            const headers: Record<string, string> = {
              ...(hasBody ? { 'content-type': 'application/json' } : {}),
              ...globalOpts.headers,
              ...opts.headers,
            }

            const fetchInit: RequestInit = {
              ...globalOpts.fetch,
              ...opts.fetch,
              method: prop.toUpperCase(),
              headers,
              ...(hasBody ? { body: JSON.stringify(opts.body) } : {}),
            }

            try {
              const response = await fetch(url.toString(), fetchInit)
              const ct = response.headers.get('content-type') ?? ''
              const raw: unknown = ct.includes('application/json')
                ? await response.json()
                : await response.text()

              if (!response.ok) {
                const message = typeof raw === 'string' ? raw : JSON.stringify(raw)
                return {
                  data: null,
                  error: new Error(message),
                  status: response.status,
                  headers: response.headers,
                  response,
                }
              }

              return {
                data: raw,
                error: null,
                status: response.status,
                headers: response.headers,
                response,
              }
            } catch (err) {
              return {
                data: null,
                error: err instanceof Error ? err : new Error(String(err)),
                status: 0,
                headers: new Headers(),
                response: null,
              }
            }
          }
        }

        // ── WebSocket upgrade ──────────────────────────────────────────────
        if (prop === 'subscribe') {
          return (opts: { query?: Record<string, string> } = {}) => {
            const wsBase = baseUrl.replace(/^https?/, (m) => (m === 'https' ? 'wss' : 'ws'))
            const url = buildUrl(wsBase, segments, opts.query)
            return new WebSocket(url.toString())
          }
        }

        // ── Path segment — extend and recurse ─────────────────────────────
        return createProxy(baseUrl, [...segments, prop], globalOpts)
      },

      /**
       * Called when a proxy node is invoked as a function.
       * Resolves named param placeholders or appends positional values.
       *
       * client.user({ id: '1' })  →  segments: ['user', '1']
       */
      apply(_target, _thisArg, [params]: [Record<string, string>?]) {
        if (!params || typeof params !== 'object') {
          return createProxy(baseUrl, segments, globalOpts)
        }

        const newSegs = [...segments]
        for (const [key, value] of Object.entries(params)) {
          // Replace a named :param placeholder in existing segments
          const idx = newSegs.findIndex((s) => s === `:${key}`)
          if (idx !== -1) {
            newSegs[idx] = encodeURIComponent(String(value))
          } else {
            // No placeholder — append as the next positional segment
            newSegs.push(encodeURIComponent(String(value)))
          }
        }

        return createProxy(baseUrl, newSegs, globalOpts)
      },
    },
  )
}

/**
 * Create a type-safe HTTP client for a Goddo application.
 *
 * Pass `typeof app` (or a named export type) as the generic parameter to get
 * full end-to-end type inference for paths, bodies, queries, and responses.
 *
 * @param baseUrl Base URL of the Goddo server, e.g. `'http://localhost:3000'`.
 * @param options Default headers and fetch options applied to every request.
 *
 * @example
 * ```ts
 * import { treaty } from '@goddo/treaty'
 * import type { App } from './server.ts'
 *
 * const client = treaty<App>('http://localhost:3000', {
 *   headers: { Authorization: 'Bearer token' },
 * })
 *
 * // GET /
 * const { data } = await client.get()
 *
 * // GET /user/1
 * const { data } = await client.user({ id: '1' }).get()
 *
 * // POST /user  (body type is inferred from the route schema)
 * const { data, error } = await client.user.post({ body: { name: 'Carlos' } })
 *
 * // GET /list?page=2
 * const { data } = await client.list.get({ query: { page: '2' } })
 *
 * // WebSocket /chat
 * const ws = client.chat.subscribe()
 * ws.onmessage = (e) => console.log(e.data)
 * ```
 */
export const treaty = <App extends { readonly _routes: RouteRegistry }>(
  baseUrl: string,
  options: TreatyOptions = {},
): TreatyProxyFrom<App['_routes']> => {
  return createProxy(baseUrl, [], options) as TreatyProxyFrom<App['_routes']>
}
