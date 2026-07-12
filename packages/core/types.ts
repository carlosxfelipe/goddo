/**
 * @module
 * types.ts module for @goddo/core
 */

import type { Context } from './context.ts'
import type { Static, TSchema } from './schema.ts'
import type { Goddo } from './index.ts'

/** Represents a Goddo instance with any route registry and store. */
// deno-lint-ignore no-explicit-any
export type AnyGoddo = Goddo<any, any>

/** Standard HTTP methods supported by the framework. */
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

/** Utility type for synchronous or asynchronous returns. */
export type MaybePromise<T> = T | Promise<T>

/** A standard route handler function. */
export type Handler<C = Context> = (context: C) => MaybePromise<unknown>

/** A reference to a named model registered with `app.model()`. */
export type ModelRef = string

/** Defines the expected response schema, optionally mapped by HTTP status code. */
export type ResponseSchema = TSchema | ModelRef | Record<number | string, TSchema | ModelRef>

/** Schema definitions for validating a route's inputs and outputs. */
export interface RouteSchema {
  /** Schema for the request body (or a named model reference). */
  body?: TSchema | ModelRef
  /** Schema for the query string parameters (or a named model reference). */
  query?: TSchema | ModelRef
  /** Schema for the URL path parameters (or a named model reference). */
  params?: TSchema | ModelRef
  /** Schema for the request headers (or a named model reference). */
  headers?: TSchema | ModelRef
  /** Schema for the HTTP response (or a named model reference). */
  response?: ResponseSchema
  /** Schema for the cookies (or a named model reference). */
  cookie?: TSchema | ModelRef
}

/** Extracts URL parameters from a path string. */
export type ParamsFromPath<Path extends string> = Path extends `${string}:${infer Rest}`
  ? Rest extends `${infer Param}/${infer Tail}`
    ? { [K in Param]: string } & ParamsFromPath<`/${Tail}`>
  : { [K in Rest]: string }
  : Path extends `${string}*` ? { '*': string }
  : Record<string, string>

/** Infers the full context type for a route based on its path and schema. */
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

/** Storage for all lifecycle hook handlers. */
export interface LifeCycleStore {
  /** Hook running before request parsing. */
  request: Handler[]
  /** Hook for custom body parsing. */
  parse: Handler[]
  /** Hook for transforming the context before validation. */
  transform: Handler[]
  /** Hook for deriving new properties on the context. */
  derive: Handler[]
  /** Hook running immediately before the main route handler. */
  beforeHandle: Handler[]
  /** Hook for resolving values. */
  resolve: Handler[]
  /** Hook running immediately after the main route handler. */
  afterHandle: Handler[]
  /** Hook for transforming the response payload. */
  mapResponse: Handler[]
  /** Hook running before sending the final response. */
  afterResponse: Handler[]
  /** Hook for handling errors. */
  error: ErrorHandler[]
  /** Hook for receiving per-stage timing traces. */
  trace: TraceHandler[]
  /** Hook running when the server starts. */
  start: VoidHandler[]
  /** Hook running when the server stops. */
  stop: VoidHandler[]
}

/** Identifies a specific lifecycle hook event. */
export type LifeCycleEvent = keyof LifeCycleStore

/** A handler specifically tailored for dealing with errors. */
export type ErrorHandler = (
  context: Context & { error: Error; code: string },
) => MaybePromise<unknown>

/** A handler that receives timing information for a lifecycle stage. */
export type TraceHandler = (
  context: Context & { event: string; duration: number },
) => MaybePromise<unknown>

/** A lifecycle handler that returns no value, used for start/stop events. */
export type VoidHandler = (app: unknown) => MaybePromise<void>

/**
 * Hook propagation scope applied when an instance is mounted via `use()`.
 * - `'local'` (default): hooks only apply to the plugin's own routes.
 * - `'scoped'`: hooks propagate to the direct parent instance.
 * - `'global'`: hooks propagate to every ancestor instance.
 */
export type PluginScope = 'local' | 'scoped' | 'global'

/** OpenAPI document details for a specific route. */
export interface DocumentDetail {
  /** Short summary of what the route does. */
  summary?: string
  /** Detailed description of the route. */
  description?: string
  /** OpenAPI tags for grouping. */
  tags?: string[]
  /** Unique operation identifier. */
  operationId?: string
  /** Indicates if the route is deprecated. */
  deprecated?: boolean
  /** Indicates if the route should be hidden from docs. */
  hide?: boolean
  /** Any other OpenAPI operation properties. */
  [key: string]: unknown
}

/** Factory returned by a macro definition — returns lifecycle hooks to merge. */
export type MacroFactory = (value: unknown) => Partial<LocalHooks>

/** A map of macro names to their corresponding factories. */
export type MacroDefinitions = Record<string, MacroFactory>

/** Local hooks and configurations applied to a specific route. */
export interface LocalHooks extends RouteSchema {
  /** OpenAPI documentation details. */
  detail?: DocumentDetail
  /** Local request hook (runs right after route matching). */
  request?: Handler | Handler[]
  /** Local parse hook. */
  parse?: Handler | Handler[]
  /** Local transform hook. */
  transform?: Handler | Handler[]
  /** Local derive hook (extends the context before validation). */
  derive?: Handler | Handler[]
  /** Local resolve hook (extends the context after validation). */
  resolve?: Handler | Handler[]
  /** Local beforeHandle hook. */
  beforeHandle?: Handler | Handler[]
  /** Local afterHandle hook. */
  afterHandle?: Handler<Context & { response: unknown }> | Handler<
    Context & { response: unknown }
  >[]
  /** Local mapResponse hook. */
  mapResponse?: Handler<Context & { response: unknown }> | Handler<
    Context & { response: unknown }
  >[]
  /** Local afterResponse hook. */
  afterResponse?: Handler | Handler[]
  /** Local error hook. */
  error?: ErrorHandler | ErrorHandler[]
  /** Allow arbitrary keys for macro-defined options */
  [key: string]: unknown
}

/** Represents a compiled route entry in the framework. */
export interface Route {
  /** The HTTP method for the route. */
  method: HTTPMethod
  /** The URL path pattern. */
  path: string
  /** The main handler function. */
  handler: Handler
  /** The local hooks and configuration for this route. */
  hooks: LocalHooks
}

/** Options for configuring the HTTP server listener. */
export interface ListenOptions {
  /** The port to listen on. */
  port?: number
  /** The hostname to bind to. */
  hostname?: string
  /** Callback fired when the server successfully starts listening. */
  onListen?: (params: { hostname: string; port: number }) => void
}

/** Global configuration options for the Goddo instance. */
export interface GoddoConfig {
  /** The application name. */
  name?: string
  /** A global URL prefix for all routes. */
  prefix?: string
  /** Secret key(s) used for signing and verifying cookies. */
  cookieSecret?: string | string[]
  /**
   * Whether to compile routes ahead-of-time before serving.
   * When `false`, requests are handled by the interpreted path.
   * Default: `true`
   */
  aot?: boolean
}

// ---------------------------------------------------------------------------
// Treaty — Route Registry
// ---------------------------------------------------------------------------

/** Shape of a single registered route's I/O, inferred from its schemas. */
export interface RouteEntry {
  /** The expected body type. */
  body?: unknown
  /** The expected query parameters type. */
  query?: unknown
  /** The expected path parameters type. */
  params?: unknown
  /** The returned response type. */
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
export type PathSegments<S extends string> = S extends `/${infer Rest}` ? PathSegments<Rest>
  : S extends `${infer Head}/${infer Tail}` ? Head | PathSegments<Tail>
  : S

/**
 * Extracts the subset of path segments that collide with Treaty-reserved words.
 * Returns `never` when there is no collision.
 *
 * Uses a distributive conditional type so each member of the `PathSegments<Path>`
 * union is checked individually.
 */
export type ReservedSegmentsIn<Path extends string> = PathSegments<Path> extends
  infer Seg extends string ? Seg extends TreatyReservedSegment ? Seg
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
