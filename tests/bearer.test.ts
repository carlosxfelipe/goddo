import { Goddo } from 'goddo'
import { bearer } from '@goddo/bearer'

const makeApp = () =>
  new Goddo()
    .use(bearer())
    .get('/token', (ctx) => (ctx as unknown as { bearer?: string }).bearer ?? 'none')

Deno.test('bearer: extracts token from Authorization header', async () => {
  const app = makeApp()
  const res = await app.handle(
    new Request('http://localhost/token', {
      headers: { authorization: 'Bearer abc123' },
    }),
  )
  const text = await res.text()
  if (text !== 'abc123') throw new Error(`Expected "abc123", got "${text}"`)
})

Deno.test('bearer: extracts token from access_token query param', async () => {
  const app = makeApp()
  const res = await app.handle(new Request('http://localhost/token?access_token=xyz789'))
  const text = await res.text()
  if (text !== 'xyz789') throw new Error(`Expected "xyz789", got "${text}"`)
})

Deno.test('bearer: header takes precedence over query', async () => {
  const app = makeApp()
  const res = await app.handle(
    new Request('http://localhost/token?access_token=fromquery', {
      headers: { authorization: 'Bearer fromheader' },
    }),
  )
  const text = await res.text()
  if (text !== 'fromheader') throw new Error(`Expected "fromheader", got "${text}"`)
})

Deno.test('bearer: undefined when no token present', async () => {
  const app = makeApp()
  const res = await app.handle(new Request('http://localhost/token'))
  const text = await res.text()
  if (text !== 'none') throw new Error(`Expected "none", got "${text}"`)
})

Deno.test('bearer: undefined for non-Bearer authorization schemes', async () => {
  const app = makeApp()
  const res = await app.handle(
    new Request('http://localhost/token', {
      headers: { authorization: 'Basic dXNlcjpwYXNz' },
    }),
  )
  const text = await res.text()
  if (text !== 'none') throw new Error(`Expected "none", got "${text}"`)
})

Deno.test('bearer: custom context name', async () => {
  const app = new Goddo()
    .use(bearer({ name: 'token' }))
    .get('/t', (ctx) => (ctx as unknown as { token?: string }).token ?? 'none')

  const res = await app.handle(
    new Request('http://localhost/t', {
      headers: { authorization: 'Bearer custom' },
    }),
  )
  const text = await res.text()
  if (text !== 'custom') throw new Error(`Expected "custom", got "${text}"`)
})

Deno.test('bearer: query extraction can be disabled', async () => {
  const app = new Goddo()
    .use(bearer({ query: false }))
    .get('/t', (ctx) => (ctx as unknown as { bearer?: string }).bearer ?? 'none')

  const res = await app.handle(new Request('http://localhost/t?access_token=ignored'))
  const text = await res.text()
  if (text !== 'none') throw new Error(`Expected "none", got "${text}"`)
})

Deno.test('bearer: works in beforeHandle guard (401 flow)', async () => {
  const app = new Goddo()
    .use(bearer())
    .get('/protected', () => 'secret', {
      beforeHandle(ctx) {
        const token = (ctx as unknown as { bearer?: string }).bearer
        if (!token) {
          ctx.set.status = 401
          return 'Unauthorized'
        }
      },
    })

  const denied = await app.handle(new Request('http://localhost/protected'))
  if (denied.status !== 401) throw new Error(`Expected 401, got ${denied.status}`)
  await denied.text()

  const allowed = await app.handle(
    new Request('http://localhost/protected', {
      headers: { authorization: 'Bearer ok' },
    }),
  )
  const text = await allowed.text()
  if (text !== 'secret') throw new Error(`Expected "secret", got "${text}"`)
})
