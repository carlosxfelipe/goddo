import { assertEquals, assertRejects } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { cleanupMap, parseBody, runCleanups } from '@goddo/core/context'
import { ParseError } from '@goddo/core/error'

Deno.test('parseBody: returns undefined for GET and HEAD', async () => {
  const getReq = new Request('http://localhost/', { method: 'GET' })
  const headReq = new Request('http://localhost/', { method: 'HEAD' })

  assertEquals(await parseBody(getReq), undefined)
  assertEquals(await parseBody(headReq), undefined)
})

Deno.test('parseBody: returns undefined if no content-type', async () => {
  const req = new Request('http://localhost/', { method: 'POST' })
  assertEquals(await parseBody(req), undefined)
})

Deno.test('parseBody: parses application/json', async () => {
  const req = new Request('http://localhost/', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ok: true }),
  })
  assertEquals(await parseBody(req), { ok: true })
})

Deno.test('parseBody: parses text/plain', async () => {
  const req = new Request('http://localhost/', {
    method: 'POST',
    headers: { 'content-type': 'text/plain' },
    body: 'hello world',
  })
  assertEquals(await parseBody(req), 'hello world')
})

Deno.test('parseBody: parses application/x-www-form-urlencoded', async () => {
  const req = new Request('http://localhost/', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: 'foo=bar&baz=qux',
  })
  assertEquals(await parseBody(req), { foo: 'bar', baz: 'qux' })
})

Deno.test('parseBody: parses multipart/form-data', async () => {
  const form = new FormData()
  form.append('field1', 'value1')

  const req = new Request('http://localhost/', {
    method: 'POST',
    body: form,
  })
  // req automatically gets content-type multipart/form-data with boundary

  assertEquals(await parseBody(req), { field1: 'value1' })
})

Deno.test('parseBody: parses application/octet-stream', async () => {
  const req = new Request('http://localhost/', {
    method: 'POST',
    headers: { 'content-type': 'application/octet-stream' },
    body: new Uint8Array([1, 2, 3]),
  })

  const body = await parseBody(req) as ArrayBuffer
  assertEquals(new Uint8Array(body), new Uint8Array([1, 2, 3]))
})

Deno.test('parseBody: falls back to text for unknown content-type', async () => {
  const req = new Request('http://localhost/', {
    method: 'POST',
    headers: { 'content-type': 'application/custom' },
    body: 'custom data',
  })

  assertEquals(await parseBody(req), 'custom data')
})

Deno.test('parseBody: throws ParseError on failure', async () => {
  const req = new Request('http://localhost/', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: 'not-json',
  })

  await assertRejects(() => parseBody(req), ParseError)
})

Deno.test('runCleanups: safely executes and handles errors', async () => {
  const ctx = {}
  let counter = 0

  cleanupMap.set(ctx, [
    () => {
      counter++
    },
    () => {
      throw new Error('sync error')
    }, // Sync error swallowed
    () => {
      counter++
      return Promise.resolve()
    },
    () => Promise.reject(new Error('async error')), // Async error swallowed
  ])

  // Suppress console.error during test
  const originalError = console.error
  console.error = () => {}

  await runCleanups(ctx)

  console.error = originalError

  // Cleanups run in reverse order
  assertEquals(counter, 2)
})
