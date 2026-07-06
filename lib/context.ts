import { GoddoError, ParseError } from '@goddo/error'
import { CookieJar } from '@goddo/cookie'
import type { CookieProxy } from '@goddo/cookie'

export interface SetContext {
  headers: Record<string, string>
  status?: number
  redirect?: string
}

export interface Context<
  Params extends Record<string, string> = Record<string, string>,
  Body = unknown,
  Store extends Record<string, unknown> = Record<string, unknown>,
> {
  request: Request
  server: Deno.ServeHandlerInfo | null
  path: string
  method: string
  params: Params
  query: Record<string, string>
  headers: Record<string, string>
  body: Body
  cookie: CookieProxy
  set: SetContext
  store: Store
  error: (status: number, message?: string) => GoddoError
  redirect: (url: string, status?: number) => Response
}

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

  return {
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
  }
}

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
