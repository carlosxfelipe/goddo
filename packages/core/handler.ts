/**
 * @module
 * handler.ts module for @goddo/core
 */

import type { SetContext } from './context.ts'
import type { CookieJar } from './cookie.ts'

/**
 * Maps any unknown response value into a standard Web API Response object.
 * Applies cookies, headers, and status codes set in the request context.
 *
 * @param response The raw response payload returned by a handler.
 * @param set The set context containing mutable headers, status, and redirect info.
 * @param jar Optional cookie jar instance to serialize cookies.
 * @returns A standard Web API Response.
 */
export const mapResponse = (response: unknown, set: SetContext, jar?: CookieJar): Response => {
  if (set.redirect) {
    set.headers['location'] = set.redirect
    if (!set.status || set.status < 300 || set.status >= 400) set.status = 302
  }

  // Serialize dirty cookies into Set-Cookie headers
  const cookieHeaders: string[] = jar ? jar.serialize() : []

  if (response instanceof Response) {
    for (const [key, value] of Object.entries(set.headers)) {
      if (!response.headers.has(key)) response.headers.set(key, value)
    }
    for (const h of cookieHeaders) {
      response.headers.append('set-cookie', h)
    }
    return response
  }

  const init: ResponseInit = {
    status: set.status ?? 200,
    headers: set.headers,
  }

  let result: Response

  switch (typeof response) {
    case 'string':
      if (!set.headers['content-type']) {
        set.headers['content-type'] = 'text/plain;charset=utf-8'
      }
      result = new Response(response, init)
      break

    case 'object': {
      if (response === null) {
        result = new Response(null, init)
        break
      }

      if (response instanceof Blob || response instanceof File) {
        result = new Response(response, init)
        break
      }

      if (response instanceof ArrayBuffer || ArrayBuffer.isView(response)) {
        result = new Response(response as BodyInit, init)
        break
      }

      if (response instanceof ReadableStream) {
        result = new Response(response, init)
        break
      }

      if (!set.headers['content-type']) {
        set.headers['content-type'] = 'application/json;charset=utf-8'
      }
      result = new Response(JSON.stringify(response), init)
      break
    }

    case 'number':
    case 'boolean':
    case 'bigint':
      if (!set.headers['content-type']) {
        set.headers['content-type'] = 'text/plain;charset=utf-8'
      }
      result = new Response(String(response), init)
      break

    case 'undefined':
      result = new Response(null, init)
      break

    default:
      result = new Response(String(response), init)
      break
  }

  for (const h of cookieHeaders) {
    result.headers.append('set-cookie', h)
  }

  return result
}
