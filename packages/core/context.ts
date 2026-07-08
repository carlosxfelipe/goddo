import { GoddoError, ParseError } from './error.ts'
import { CookieJar } from './cookie.ts'
import type { CookieProxy } from './cookie.ts'

/** Represents the mutable context that shapes the final HTTP response. */
export interface SetContext {
  /** Outgoing HTTP response headers. */
  headers: Record<string, string>
  /** Outgoing HTTP response status code. */
  status?: number
  /** A URL to redirect the client to. */
  redirect?: string
}

/** The primary Goddo request context passed to all route handlers and lifecycle hooks. */
export interface Context<
  Params extends Record<string, string> = Record<string, string>,
  Body = unknown,
  Store extends Record<string, unknown> = Record<string, unknown>,
> {
  /** The incoming native Fetch API Request object. */
  request: Request
  /** Information about the Deno server connection, if available. */
  server: Deno.ServeHandlerInfo | null
  /** The requested URL path string. */
  path: string
  /** The HTTP request method. */
  method: string
  /** Dynamic URL path parameters extracted by the router. */
  params: Params
  /** URL query string parameters. */
  query: Record<string, string>
  /** Incoming request headers. */
  headers: Record<string, string>
  /** The parsed request body payload. */
  body: Body
  /** Reactive proxy for reading and setting cookies. */
  cookie: CookieProxy
  /** Exposes mutable properties to shape the HTTP response (headers, status, redirect). */
  set: SetContext
  /** Custom data store shared across lifecycle hooks in this context. */
  store: Store
  /** Helper function to create an error response. */
  error: (status: number, message?: string) => GoddoError
  /** Helper function to trigger a redirect response. */
  redirect: (url: string, status?: number) => Response
  /** Registers a cleanup callback that will be executed after the request is finished. */
  onCleanup: (fn: () => void | Promise<void>) => void
}

/** Internal weak map storing cleanup functions for context instances. */
export const cleanupMap: WeakMap<object, (() => void | Promise<void>)[]> = new WeakMap<
  object,
  (() => void | Promise<void>)[]
>()

/**
 * Executes all registered cleanup callbacks for a given context.
 * This is called automatically by Goddo at the end of the request lifecycle.
 * @param ctx The context object tracking cleanups.
 */
export const runCleanups = async (ctx: object): Promise<void> => {
  const cleanups = cleanupMap.get(ctx)
  if (!cleanups) return

  for (let i = cleanups.length - 1; i >= 0; i--) {
    const fn = cleanups[i]
    if (!fn) continue
    try {
      const res = fn()
      if (res instanceof Promise) await res.catch(console.error)
    } catch (err) {
      console.error(err)
    }
  }
}

/**
 * Factory function to initialize a new Goddo Context instance.
 * @param request The native HTTP request.
 * @param store The shared global store.
 * @param info Optional server handler information.
 * @param cookieSecret Optional secret for cookie signing.
 * @returns A fully initialized Goddo Context.
 */
export const createContext = (
  request: Request,
  store: Record<string, unknown>,
  info: Deno.ServeHandlerInfo | null = null,
  cookieSecret?: string,
): Context => {
  const url = new URL(request.url)

  const query: Record<string, string> = {}
  for (const [key, value] of url.searchParams) query[key] = value

  const headers: Record<string, string> = {}
  for (const [key, value] of request.headers) headers[key] = value

  const set: SetContext = {
    headers: {},
  }

  const cookie = new CookieJar(request.headers.get('cookie'), cookieSecret) as CookieProxy
  const cleanups: (() => void | Promise<void>)[] = []

  const ctx = {
    request,
    server: info,
    path: url.pathname,
    method: request.method,
    params: {},
    query,
    headers,
    body: undefined,
    cookie,
    set,
    store,
    error: (status: number, message?: string) => {
      const err = new GoddoError(message ?? String(status))
      err.status = status
      return err
    },
    redirect: (location: string, status = 302) =>
      new Response(null, {
        status,
        headers: { location },
      }),
    onCleanup: (fn: () => void | Promise<void>) => cleanups.push(fn),
  }

  cleanupMap.set(ctx, cleanups)
  return ctx
}

/**
 * Parses the incoming request body based on its `Content-Type` header.
 * @param request The incoming HTTP request.
 * @returns The parsed body payload, or undefined if the method is GET/HEAD.
 */
export const parseBody = async (request: Request): Promise<unknown> => {
  if (request.method === 'GET' || request.method === 'HEAD') return undefined

  const contentType = request.headers.get('content-type')?.split(';')[0]?.trim()
  if (!contentType) return undefined

  try {
    switch (contentType) {
      case 'application/json':
        return await request.json()

      case 'text/plain':
        return await request.text()

      case 'application/x-www-form-urlencoded': {
        const form = new URLSearchParams(await request.text())
        const result: Record<string, string> = {}
        for (const [key, value] of form) result[key] = value
        return result
      }

      case 'multipart/form-data': {
        const form = await request.formData()
        const result: Record<string, FormDataEntryValue> = {}
        for (const [key, value] of form) result[key] = value
        return result
      }

      case 'application/octet-stream':
        return await request.arrayBuffer()

      default:
        return await request.text()
    }
  } catch {
    throw new ParseError()
  }
}
