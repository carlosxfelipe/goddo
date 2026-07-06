import type { Context } from '@goddo/context'
import type { Static, TSchema } from '@goddo/schema'

export type HTTPMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'DELETE'
  | 'PATCH'
  | 'HEAD'
  | 'OPTIONS'
  | 'CONNECT'
  | 'TRACE'
  | 'ALL'

export type MaybePromise<T> = T | Promise<T>

// deno-lint-ignore no-explicit-any
export type Handler<C = Context> = (context: C) => MaybePromise<any>

export type ResponseSchema = TSchema | Record<number | string, TSchema>

export interface RouteSchema {
  body?: TSchema
  query?: TSchema
  params?: TSchema
  headers?: TSchema
  response?: ResponseSchema
  cookie?: TSchema
}

type ParamsFromPath<Path extends string> = Path extends `${string}:${infer Rest}`
  ? Rest extends `${infer Param}/${infer Tail}`
    ? { [K in Param]: string } & ParamsFromPath<`/${Tail}`>
  : { [K in Rest]: string }
  : Path extends `${string}*` ? { '*': string }
  : Record<string, string>

export type InferContext<
  S extends RouteSchema = RouteSchema,
  Path extends string = string,
> =
  & Omit<Context, 'body' | 'query' | 'params' | 'headers'>
  & {
    body: S['body'] extends TSchema ? Static<S['body']> : Context['body']
    query: S['query'] extends TSchema ? Static<S['query']> : Record<string, string>
    params: S['params'] extends TSchema ? Static<S['params']> : ParamsFromPath<Path>
    headers: S['headers'] extends TSchema ? Static<S['headers']> : Record<string, string>
  }

export interface LifeCycleStore {
  request: Handler[]
  parse: Handler[]
  transform: Handler[]
  derive: Handler[]
  beforeHandle: Handler[]
  resolve: Handler[]
  afterHandle: Handler[]
  mapResponse: Handler[]
  afterResponse: Handler[]
  error: ErrorHandler[]
  start: VoidHandler[]
  stop: VoidHandler[]
}

export type LifeCycleEvent = keyof LifeCycleStore

// deno-lint-ignore no-explicit-any
export type ErrorHandler = (context: Context & { error: Error; code: string }) => MaybePromise<any>

// deno-lint-ignore no-explicit-any
export type VoidHandler = (app: any) => MaybePromise<void>

export interface DocumentDetail {
  summary?: string
  description?: string
  tags?: string[]
  operationId?: string
  deprecated?: boolean
  hide?: boolean
  [key: string]: unknown
}

/** Factory returned by a macro definition — returns lifecycle hooks to merge. */
// deno-lint-ignore no-explicit-any
export type MacroFactory = (value: any) => Partial<LocalHooks>

export type MacroDefinitions = Record<string, MacroFactory>

export interface LocalHooks extends RouteSchema {
  detail?: DocumentDetail
  parse?: Handler | Handler[]
  transform?: Handler | Handler[]
  beforeHandle?: Handler | Handler[]
  afterHandle?: Handler | Handler[]
  mapResponse?: Handler | Handler[]
  afterResponse?: Handler | Handler[]
  error?: ErrorHandler | ErrorHandler[]
  // Allow arbitrary keys for macro-defined options
  [key: string]: unknown
}

export interface Route {
  method: HTTPMethod
  path: string
  handler: Handler
  hooks: LocalHooks
}

export interface ListenOptions {
  port?: number
  hostname?: string
  onListen?: (params: { hostname: string; port: number }) => void
}

export interface GoddoConfig {
  name?: string
  prefix?: string
}

// ---------------------------------------------------------------------------
// Treaty — Route Registry
// ---------------------------------------------------------------------------

/** Shape of a single registered route's I/O, inferred from its schemas. */
export interface RouteEntry {
  body?: unknown
  query?: unknown
  params?: unknown
  response?: unknown
}

/**
 * Maps `path → HTTP method → RouteEntry`.
 * Accumulated generically inside `Goddo<Routes>` at each route registration.
 */
export type RouteRegistry = Record<string, Partial<Record<string, RouteEntry>>>

/** Convert a RouteSchema's TSchema fields into a plain RouteEntry. */
export type BuildRouteEntry<S extends RouteSchema> = {
  body: S['body'] extends TSchema ? Static<S['body']> : unknown
  query: S['query'] extends TSchema ? Static<S['query']> : unknown
  params: S['params'] extends TSchema ? Static<S['params']> : unknown
  response: S['response'] extends TSchema ? Static<S['response']> : unknown
}

/** Intersect a new route into an existing registry. */
export type AddRoute<
  Reg extends RouteRegistry,
  Method extends string,
  Path extends string,
  S extends RouteSchema,
> = Reg & { [P in Path]: { [M in Method]: BuildRouteEntry<S> } }

// ---------------------------------------------------------------------------
// Treaty — Reserved segment guard
// ---------------------------------------------------------------------------

/**
 * HTTP method names (lowercase) that the Treaty proxy intercepts at the
 * property-access level. A path segment with any of these names would be
 * silently shadowed by the proxy and never reachable from the client.
 */
export type TreatyReservedSegment =
  | 'get'
  | 'post'
  | 'put'
  | 'delete'
  | 'patch'
  | 'head'
  | 'options'
  | 'subscribe'

/**
 * Splits a path string into its URL segments as a string union (strips leading `/`).
 * `"/user/get/info"` → `"user" | "get" | "info"`
 */
type PathSegments<S extends string> = S extends `/${infer Rest}` ? PathSegments<Rest>
  : S extends `${infer Head}/${infer Tail}` ? Head | PathSegments<Tail>
  : S

/**
 * Extracts the subset of path segments that collide with Treaty-reserved words.
 * Returns `never` when there is no collision.
 *
 * Uses a distributive conditional type so each member of the `PathSegments<Path>`
 * union is checked individually.
 */
type ReservedSegmentsIn<Path extends string> = PathSegments<Path> extends infer Seg extends string
  ? Seg extends TreatyReservedSegment ? Seg
  : never
  : never

/**
 * Resolves to a descriptive error-tuple when `Path` contains a segment that
 * collides with a Treaty-reserved word; otherwise resolves to `Path` itself.
 *
 * The check is exhaustive: it catches reserved words at any position in the
 * path, including mid-path (e.g. `"/user/get/info"`).
 *
 * @example
 * // ✅ Fine — no reserved segments
 * type Ok = AssertNoReservedSegment<"/user/:id/profile">  // → "/user/:id/profile"
 *
 * // ❌ Compile error — "get" is reserved by the Treaty proxy
 * type Err = AssertNoReservedSegment<"/get">  // → error message tuple
 *
 * // ❌ Compile error — reserved segment mid-path
 * type Err2 = AssertNoReservedSegment<"/user/get/info">  // → error message tuple
 */
export type AssertNoReservedSegment<Path extends string> = [ReservedSegmentsIn<Path>] extends
  [never] ? Path
  : [
    `Treaty conflict: the path segment "${ReservedSegmentsIn<
      Path
    >}" is reserved by the Treaty proxy (it matches an HTTP method name). Rename this segment to avoid a silent client-side collision.`,
  ]
