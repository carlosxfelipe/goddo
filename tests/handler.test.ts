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
