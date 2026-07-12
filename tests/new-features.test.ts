import {
  assert,
  assertEquals,
  assertStringIncludes,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { Goddo, t, validate } from '@goddo/core'
import { sse } from '@goddo/core/handler'

Deno.test('onMapResponse transforms the payload before serialization', async () => {
  const app = new Goddo()
    .onMapResponse(({ response }) => ({ mapped: response }))
    .get('/', () => 'hello')

  const res = await app.handle(new Request('http://localhost/'))
  assertEquals(await res.json(), { mapped: 'hello' })
})

Deno.test('route-level mapResponse hook runs', async () => {
  const app = new Goddo()
    .get('/', () => 'hello', {
      mapResponse: ({ response }) => ({ routeMapped: response }),
    })

  const res = await app.handle(new Request('http://localhost/'))
  assertEquals(await res.json(), { routeMapped: 'hello' })
})

Deno.test('local plugin hooks do not leak to parent routes', async () => {
  const plugin = new Goddo()
    .onBeforeHandle(({ error, headers }) => {
      if (!headers.authorization) throw error(401)
    })

  const app = new Goddo()
    .use(plugin)
    .get('/public', () => 'ok')

  const res = await app.handle(new Request('http://localhost/public'))
  assertEquals(res.status, 200)
  assertEquals(await res.text(), 'ok')
})

Deno.test('scoped plugin hooks propagate to parent', async () => {
  const plugin = new Goddo()
    .onBeforeHandle(({ error, headers }) => {
      if (!headers.authorization) throw error(401)
    })
    .as('scoped')

  const app = new Goddo()
    .use(plugin)
    .get('/private', () => 'ok')

  const res = await app.handle(new Request('http://localhost/private'))
  assertEquals(res.status, 401)
})

Deno.test('plugin local hooks apply to their own routes', async () => {
  const plugin = new Goddo()
    .onBeforeHandle(({ error, headers }) => {
      if (!headers.authorization) throw error(401)
    })
    .get('/plugin-route', () => 'ok')

  const app = new Goddo().use(plugin)

  const denied = await app.handle(new Request('http://localhost/plugin-route'))
  assertEquals(denied.status, 401)
})

Deno.test('async generator handler streams SSE messages', async () => {
  const app = new Goddo().get('/events', async function* () {
    yield sse('hello')
    yield sse({ event: 'tick', data: { n: 1 }, id: 1 })
  })

  const res = await app.handle(new Request('http://localhost/events'))
  assertEquals(res.headers.get('content-type'), 'text/event-stream;charset=utf-8')

  const body = await res.text()
  assertStringIncludes(body, 'data: hello\n\n')
  assertStringIncludes(body, 'event: tick\n')
  assertStringIncludes(body, 'id: 1\n')
  assertStringIncludes(body, 'data: {"n":1}\n\n')
})

Deno.test('sync generator handler streams SSE', async () => {
  const app = new Goddo().get('/events', function* () {
    yield sse({ event: 'ping' })
  })

  const res = await app.handle(new Request('http://localhost/events'))
  assertEquals(res.status, 200)
  const body = await res.text()
  assertStringIncludes(body, 'event: ping')
})

Deno.test('t.Record validates arbitrary keys', () => {
  const schema = t.Record(t.Number())
  assertEquals(validate(schema, { a: 1, b: 2 }), { a: 1, b: 2 })
})

Deno.test('t.Record rejects invalid values', () => {
  const schema = t.Record(t.Number())
  let threw = false
  try {
    validate(schema, { a: 'not-a-number' })
  } catch {
    threw = true
  }
  assert(threw)
})

Deno.test('t.Tuple validates fixed length and positions', () => {
  const schema = t.Tuple([t.String(), t.Number()])
  assertEquals(validate(schema, ['hi', 42]), ['hi', 42])
})

Deno.test('t.Tuple rejects wrong length', () => {
  const schema = t.Tuple([t.String(), t.Number()])
  let threw = false
  try {
    validate(schema, ['hi'])
  } catch {
    threw = true
  }
  assert(threw)
})

Deno.test('t.Files validates multiple file uploads', () => {
  const schema = t.Files({ maxSize: 100 })
  const files = [new File(['a'], 'a.txt'), new File(['b'], 'b.txt')]
  assertEquals(validate(schema, files), files)
})

Deno.test('t.Files rejects oversized files', () => {
  const schema = t.Files({ maxSize: 1 })
  const files = [new File(['abc'], 'a.txt')]
  let threw = false
  try {
    validate(schema, files)
  } catch {
    threw = true
  }
  assert(threw)
})

Deno.test('t.File rejects wrong MIME type', () => {
  const schema = t.File({ type: 'image/*' })
  const file = new File([''], 'doc.txt', { type: 'text/plain' })
  let threw = false
  try {
    validate(schema, file)
  } catch {
    threw = true
  }
  assert(threw)
})

Deno.test('multipart body groups repeated keys into arrays', async () => {
  const form = new FormData()
  form.append('files', new File(['a'], 'a.txt'))
  form.append('files', new File(['b'], 'b.txt'))

  const app = new Goddo().post('/upload', ({ body }) => (body as Record<string, unknown>).files)
  const res = await app.handle(
    new Request('http://localhost/upload', {
      method: 'POST',
      body: form,
    }),
  )
  assert(Array.isArray(await res.json()))
})

Deno.test('.mount() forwards requests stripping the prefix', async () => {
  const mounted = new Goddo().get('/hello', () => 'mounted')
  const app = new Goddo().mount('/api', mounted)

  const res = await app.handle(new Request('http://localhost/api/hello'))
  assertEquals(await res.text(), 'mounted')
})

Deno.test('.mount() accepts a fetch function', async () => {
  const app = new Goddo().mount('/v1', (req) => new Response(req.url))
  const res = await app.handle(new Request('http://localhost/v1/users'))
  assertStringIncludes(await res.text(), '/users')
})

Deno.test('.model() resolves named schemas for body and response', async () => {
  const app = new Goddo()
    .model('user', t.Object({ id: t.Number(), name: t.String() }))
    .post('/users', ({ body }) => body, { body: 'user', response: 'user' })

  const res = await app.handle(
    new Request('http://localhost/users', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: 1, name: 'Ada' }),
    }),
  )
  assertEquals(await res.json(), { id: 1, name: 'Ada' })
})

Deno.test('.model() rejects invalid data via reference', async () => {
  const app = new Goddo()
    .model('user', t.Object({ id: t.Number(), name: t.String() }))
    .post('/users', ({ body }) => body, { body: 'user' })

  const res = await app.handle(
    new Request('http://localhost/users', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: 'not-a-number' }),
    }),
  )
  assertEquals(res.status, 422)
})

Deno.test('onTrace receives per-stage timing events', async () => {
  const events: string[] = []
  const app = new Goddo()
    .onTrace(({ event, duration }) => {
      events.push(event)
      assert(typeof duration === 'number')
    })
    .get('/', () => 'ok')
    .compile()

  await app.handle(new Request('http://localhost/'))
  assert(events.length > 0)
  assert(events.includes('handler'))
})

Deno.test('.state() injects named values into the context', async () => {
  const app = new Goddo()
    .state('version', '1.0.0')
    .get('/', ({ version }) => version)

  const res = await app.handle(new Request('http://localhost/'))
  assertEquals(await res.text(), '1.0.0')
})

Deno.test('.state() also works after .compile()', async () => {
  const app = new Goddo()
    .state('counter', 42)
    .get('/', ({ counter }) => String(counter))
    .compile()

  const res = await app.handle(new Request('http://localhost/'))
  assertEquals(await res.text(), '42')
})

Deno.test('.state() propagates through .use()', async () => {
  const plugin = new Goddo().state('fromPlugin', 'yes')
  const app = new Goddo().use(plugin).get('/', ({ fromPlugin }) => fromPlugin)

  const res = await app.handle(new Request('http://localhost/'))
  assertEquals(await res.text(), 'yes')
})

Deno.test('t.Intersect validates against all schemas', () => {
  const a = t.Object({ a: t.Number() })
  const b = t.Object({ b: t.String() })
  assertEquals(validate(t.Intersect([a, b]), { a: 1, b: 'x' }), { a: 1, b: 'x' })
})

Deno.test('t.Intersect rejects when any schema fails', () => {
  const a = t.Object({ a: t.Number() })
  const b = t.Object({ b: t.String() })
  let threw = false
  try {
    validate(t.Intersect([a, b]), { a: 1, b: 2 })
  } catch {
    threw = true
  }
  assert(threw)
})

Deno.test('t.ObjectString parses JSON string into object when coerced', () => {
  const schema = t.ObjectString(t.Object({ id: t.Number() }))
  assertEquals(validate(schema, '{"id":1}', { coerce: true }), { id: 1 })
})

Deno.test('t.ObjectString rejects invalid JSON', () => {
  let threw = false
  try {
    validate(t.ObjectString(t.Object({ id: t.Number() })), 'not-json', { coerce: true })
  } catch {
    threw = true
  }
  assert(threw)
})

Deno.test('config.aot: false skips AOT compilation in listen()', async () => {
  const events: string[] = []
  const app = new Goddo({ aot: false })
    .onTrace(({ event }) => events.push(event))
    .get('/', () => 'ok')

  app.listen(0)
  const res = await app.handle(new Request('http://localhost/'))
  assertEquals(await res.text(), 'ok')
  // Non-compiled path emits a single 'handle' trace event
  assert(events.includes('handle'))
  app.stop()
})
