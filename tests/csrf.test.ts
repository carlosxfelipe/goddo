import { Goddo } from '../lib/index.ts'
import { csrf } from '../lib/plugins/csrf.ts'

const req = (app: Goddo, path: string, init?: RequestInit) =>
  app.handle(new Request(`http://localhost${path}`, init))

Deno.test('csrf: generates and sets csrf cookie on GET', async () => {
  const app = new Goddo()
    .use(csrf())
    .get('/', () => 'ok')

  const res = await req(app, '/')
  const setCookies = res.headers.getSetCookie()
  const csrfCookie = setCookies.find((c) => c.startsWith('csrf='))

  if (!csrfCookie) throw new Error('csrf cookie not generated')
})

Deno.test('csrf: rejects POST without token', async () => {
  const app = new Goddo()
    .use(csrf())
    .post('/', () => 'ok')

  const res = await req(app, '/', { method: 'POST' })
  if (res.status !== 403) throw new Error('should reject missing token')
  if ((await res.json()).error !== 'Invalid CSRF token') throw new Error('wrong error format')
})

Deno.test('csrf: rejects POST with mismatched token', async () => {
  const app = new Goddo()
    .use(csrf())
    .post('/', () => 'ok')

  const res = await req(app, '/', {
    method: 'POST',
    headers: {
      cookie: 'csrf=good-token',
      'x-csrf-token': 'bad-token',
    },
  })
  if (res.status !== 403) throw new Error('should reject mismatched token')
})

Deno.test('csrf: accepts POST with matching token', async () => {
  const app = new Goddo()
    .use(csrf())
    .post('/', () => 'ok')

  const res = await req(app, '/', {
    method: 'POST',
    headers: {
      cookie: 'csrf=valid-token',
      'x-csrf-token': 'valid-token',
    },
  })
  if (res.status !== 200) throw new Error('should accept matching token')
  if (await res.text() !== 'ok') throw new Error('wrong response body')
})

Deno.test('csrf: exposes csrfToken() in context', async () => {
  const app = new Goddo()
    .use(csrf())
    .get('/token', ({ csrfToken }) => csrfToken())

  const res = await req(app, '/token')
  const token = await res.text()

  if (token.length < 10) throw new Error('token looks invalid')
})
