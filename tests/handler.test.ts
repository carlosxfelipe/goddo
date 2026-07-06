import { Goddo } from '../lib/index.ts'
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'

const req = (app: Goddo, path: string, init?: RequestInit) =>
  app.handle(new Request(`http://localhost${path}`, init))

Deno.test('handler intercepts global beforeHandle and sets response', async () => {
  const app = new Goddo()
    .onBeforeHandle(() => {
      return new Response('intercepted', { status: 403 })
    })
    .get('/', () => 'ok')

  const res = await req(app, '/')
  assertEquals(res.status, 403)
  assertEquals(await res.text(), 'intercepted')
})

Deno.test('handler intercepts local beforeHandle and sets response', async () => {
  const app = new Goddo()
    .get('/', () => 'ok', {
      beforeHandle: () => 'local block',
    })

  const res = await req(app, '/')
  assertEquals(res.status, 200)
  assertEquals(await res.text(), 'local block')
})

Deno.test('handler applies local afterHandle', async () => {
  const app = new Goddo()
    .get('/', () => 'ok', {
      afterHandle: (ctx) => String((ctx as unknown as { response: string }).response) + ' appended',
    })

  const res = await req(app, '/')
  assertEquals(await res.text(), 'ok appended')
})

Deno.test('handler propagates errors from handler to onError', async () => {
  const app = new Goddo()
    .get('/', () => {
      throw new Error('custom boom')
    })
    .onError(({ error }) => `caught: ${error.message}`)

  const res = await req(app, '/')
  assertEquals(res.status, 500)
  assertEquals(await res.text(), 'caught: custom boom')
})

Deno.test('handler propagates error if onError throws', async () => {
  const app = new Goddo()
    .get('/', () => {
      throw new Error('boom')
    })
    .onError(() => {
      throw new Error('double boom')
    })

  let threw = false
  try {
    await req(app, '/')
  } catch (err) {
    threw = true
    if (err instanceof Error) assertEquals(err.message, 'double boom')
  }
  assertEquals(threw, true)
})

Deno.test('handler falls back to 404 for unknown route', async () => {
  const app = new Goddo()
  const res = await req(app, '/nowhere')
  assertEquals(res.status, 404)
  assertEquals(await res.text(), 'NOT_FOUND')
})

Deno.test('mapResponse: handles redirect', async () => {
  const app = new Goddo()
    .get('/redirect', ({ set }) => {
      set.redirect = '/target'
    })

  const res = await req(app, '/redirect')
  assertEquals(res.status, 302)
  assertEquals(res.headers.get('location'), '/target')
})

Deno.test('mapResponse: handles direct Response return', async () => {
  const app = new Goddo()
    .get('/res', ({ set }) => {
      set.headers['x-custom'] = 'added'
      return new Response('manual', { headers: { 'x-existing': 'kept' } })
    })

  const res = await req(app, '/res')
  assertEquals(await res.text(), 'manual')
  assertEquals(res.headers.get('x-custom'), 'added')
  assertEquals(res.headers.get('x-existing'), 'kept')
})

Deno.test('mapResponse: handles Blob/File', async () => {
  const app = new Goddo()
    .get('/blob', () => new Blob(['blob data']))

  const res = await req(app, '/blob')
  assertEquals(await res.text(), 'blob data')
})

Deno.test('mapResponse: handles ArrayBuffer/TypedArray', async () => {
  const app = new Goddo()
    .get('/buffer', () => new Uint8Array([104, 105])) // 'hi'

  const res = await req(app, '/buffer')
  assertEquals(await res.text(), 'hi')
})

Deno.test('mapResponse: handles ReadableStream', async () => {
  const app = new Goddo()
    .get('/stream', () => {
      let pullCount = 0
      return new ReadableStream({
        pull(controller) {
          if (pullCount === 0) {
            controller.enqueue(new TextEncoder().encode('chunk'))
            pullCount++
          } else {
            controller.close()
          }
        },
      })
    })

  const res = await req(app, '/stream')
  assertEquals(await res.text(), 'chunk')
})

Deno.test('mapResponse: handles primitives (number, boolean, bigint)', async () => {
  const app = new Goddo()
    .get('/num', () => 42)
    .get('/bool', () => true)
    .get('/bigint', () => 9007199254740991n)

  const [num, bool, bigint] = await Promise.all([
    req(app, '/num').then((r) => r.text()),
    req(app, '/bool').then((r) => r.text()),
    req(app, '/bigint').then((r) => r.text()),
  ])

  assertEquals(num, '42')
  assertEquals(bool, 'true')
  assertEquals(bigint, '9007199254740991')
})

Deno.test('mapResponse: handles undefined and null', async () => {
  const app = new Goddo()
    .get('/undefined', () => undefined)
    .get('/null', () => null)

  const [undefRes, nullRes] = await Promise.all([
    req(app, '/undefined').then((r) => r.text()),
    req(app, '/null').then((r) => r.text()),
  ])

  assertEquals(undefRes, '')
  assertEquals(nullRes, '')
})
