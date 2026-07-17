/**
 * @module
 * handler.ts module for @goddo/core
 */

import type { SetContext } from './context.ts'
import type { CookieJar } from './cookie.ts'

/** Internal marker identifying payloads created by the `sse()` helper. */
const SSE: unique symbol = Symbol.for('goddo.sse')

/** A Server-Sent Event message accepted by the `sse()` helper. */
export interface SSEMessage {
  /** Optional event name (`event:` field). */
  event?: string
  /** Event payload — objects are serialized to JSON automatically. */
  data?: unknown
  /** Optional event id (`id:` field). */
  id?: string | number
  /** Optional reconnection delay in milliseconds (`retry:` field). */
  retry?: number
}

/**
 * Creates a Server-Sent Event message to be yielded from a generator handler.
 *
 * ```ts
 * app.get('/events', function* () {
 *   yield sse('hello')
 *   yield sse({ event: 'update', data: { id: 1 }, id: 1 })
 * })
 * ```
 */
export const sse = (message: string | SSEMessage): SSEMessage => {
  const payload: SSEMessage = typeof message === 'string' ? { data: message } : { ...message }
  Object.defineProperty(payload, SSE, { value: true })
  return payload
}

/** Formats a yielded chunk as a `text/event-stream` message. */
const formatSSE = (chunk: unknown): string => {
  let out = ''
  let data: unknown = chunk

  if (chunk !== null && typeof chunk === 'object' && SSE in chunk) {
    const message = chunk as SSEMessage
    if (message.event !== undefined) out += `event: ${message.event}\n`
    if (message.id !== undefined) out += `id: ${message.id}\n`
    if (message.retry !== undefined) out += `retry: ${message.retry}\n`
    data = message.data
  }

  const text = typeof data === 'string' ? data : JSON.stringify(data)
  for (const line of (text ?? '').split('\n')) out += `data: ${line}\n`
  return out + '\n'
}

/** Detects generator/async-generator objects returned by route handlers. */
const isGeneratorResponse = (value: object): value is AsyncIterable<unknown> | Iterable<unknown> =>
  Symbol.asyncIterator in value ||
  (Symbol.iterator in value && typeof (value as { next?: unknown }).next === 'function')

/**
 * Wraps a generator (sync or async) into a streaming `text/event-stream` body.
 * Each yielded value is sent as an SSE message; `Uint8Array` chunks are sent raw.
 */
const streamResponse = (
  generator: AsyncIterable<unknown> | Iterable<unknown>,
  init: ResponseInit,
): Response => {
  const encoder = new TextEncoder()
  const iterator = Symbol.asyncIterator in generator
    ? (generator as AsyncIterable<unknown>)[Symbol.asyncIterator]()
    : (generator as Iterable<unknown>)[Symbol.iterator]()

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await iterator.next()
        if (done) {
          controller.close()
          return
        }
        if (value instanceof Uint8Array) controller.enqueue(value)
        else controller.enqueue(encoder.encode(formatSSE(value)))
      } catch (error) {
        controller.error(error)
      }
    },
    async cancel() {
      await iterator.return?.(undefined)
    },
  })

  return new Response(stream, init)
}

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

  let hasSetHeaders = false
  for (const _ in set.headers) {
    hasSetHeaders = true
    break
  }

  if (response instanceof Response) {
    if (hasSetHeaders) {
      for (const key in set.headers) {
        if (!response.headers.has(key)) response.headers.set(key, set.headers[key]!)
      }
    }
    if (cookieHeaders.length > 0) {
      for (const h of cookieHeaders) {
        response.headers.append('set-cookie', h)
      }
    }
    return response
  }

  const init: ResponseInit = {
    status: set.status ?? 200,
  }
  if (hasSetHeaders) init.headers = set.headers

  let result: Response

  switch (typeof response) {
    case 'string':
      if (!set.headers['content-type']) {
        set.headers['content-type'] = 'text/plain;charset=utf-8'
        init.headers = set.headers
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

      if (isGeneratorResponse(response)) {
        if (!set.headers['content-type']) {
          set.headers['content-type'] = 'text/event-stream;charset=utf-8'
        }
        if (!set.headers['cache-control']) set.headers['cache-control'] = 'no-cache'
        init.headers = set.headers
        result = streamResponse(response, init)
        break
      }

      if (!set.headers['content-type']) {
        set.headers['content-type'] = 'application/json;charset=utf-8'
        init.headers = set.headers
      }
      result = new Response(JSON.stringify(response), init)
      break
    }

    case 'number':
    case 'boolean':
    case 'bigint':
      if (!set.headers['content-type']) {
        set.headers['content-type'] = 'text/plain;charset=utf-8'
        init.headers = set.headers
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
