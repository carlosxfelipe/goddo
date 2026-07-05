import { Goddo, t } from 'goddo'

const req = (app: Goddo, path: string, init?: RequestInit) =>
  app.handle(new Request(`http://localhost${path}`, init))

Deno.test('reads incoming cookies', async () => {
  const app = new Goddo().get('/', ({ cookie }) => cookie.session.value ?? 'none')
  const res = await req(app, '/', { headers: { cookie: 'session=abc123' } })

  if ((await res.text()) !== 'abc123') throw new Error('cookie not read')
})

Deno.test('returns undefined for missing cookie', async () => {
  const app = new Goddo().get('/', ({ cookie }) => cookie.missing.value ?? 'nope')
  const res = await req(app, '/')

  if ((await res.text()) !== 'nope') throw new Error('should be undefined')
})

Deno.test('sets a cookie on response', async () => {
  const app = new Goddo().get('/', ({ cookie }) => {
    cookie.token.value = 'xyz'
    return 'ok'
  })

  const res = await req(app, '/')
  const setCookie = res.headers.get('set-cookie')

  if (!setCookie) throw new Error('no set-cookie header')
  if (!setCookie.includes('token=xyz')) throw new Error(`unexpected set-cookie: ${setCookie}`)
})

Deno.test('sets cookie with attributes', async () => {
  const app = new Goddo().get('/', ({ cookie }) => {
    cookie.session.value = 's1'
    cookie.session.httpOnly = true
    cookie.session.path = '/'
    cookie.session.sameSite = 'lax'
    cookie.session.secure = true
    cookie.session.maxAge = 3600
    return 'ok'
  })

  const res = await req(app, '/')
  const setCookie = res.headers.get('set-cookie') ?? ''

  if (!setCookie.includes('HttpOnly')) throw new Error('missing HttpOnly')
  if (!setCookie.includes('Path=/')) throw new Error('missing Path')
  if (!setCookie.includes('SameSite=Lax')) throw new Error('missing SameSite')
  if (!setCookie.includes('Secure')) throw new Error('missing Secure')
  if (!setCookie.includes('Max-Age=3600')) throw new Error('missing Max-Age')
})

Deno.test('sets cookie attributes via .set()', async () => {
  const app = new Goddo().get('/', ({ cookie }) => {
    cookie.token.value = 'v1'
    cookie.token.set({ httpOnly: true, path: '/', maxAge: 7200 })
    return 'ok'
  })

  const res = await req(app, '/')
  const setCookie = res.headers.get('set-cookie') ?? ''

  if (!setCookie.includes('HttpOnly')) throw new Error('missing HttpOnly')
  if (!setCookie.includes('Max-Age=7200')) throw new Error('missing Max-Age')
})

Deno.test('removes a cookie', async () => {
  const app = new Goddo().get('/', ({ cookie }) => {
    cookie.session.remove()
    return 'removed'
  })

  const res = await req(app, '/', { headers: { cookie: 'session=abc' } })
  const setCookie = res.headers.get('set-cookie') ?? ''

  if (!setCookie.includes('Max-Age=0')) throw new Error('cookie not removed')
})

Deno.test('does not emit Set-Cookie for untouched cookies', async () => {
  const app = new Goddo().get('/', ({ cookie }) => cookie.name.value ?? 'no')

  const res = await req(app, '/', { headers: { cookie: 'name=test' } })
  // Reading without modifying should NOT produce Set-Cookie headers,
  // BUT the proxy creates a new Cookie for 'name' on read which is not dirty.
  // The pre-populated cookie from parsing is also not dirty.
  const setCookie = res.headers.get('set-cookie')

  if (setCookie) throw new Error('should not set cookies for read-only access')
})

Deno.test('cookie validation rejects invalid cookies', async () => {
  const app = new Goddo()
    .get('/', ({ cookie }) => cookie.session.value, {
      cookie: t.Object({ session: t.String({ minLength: 1 }) }),
    })
    .onError(({ code }) => code === 'VALIDATION' ? 'invalid' : 'other')

  // Missing session cookie
  const res = await req(app, '/')
  if ((await res.text()) !== 'invalid') throw new Error('should reject missing cookie')
})

Deno.test('parses multiple cookies', async () => {
  const app = new Goddo().get(
    '/',
    ({ cookie }) => `${cookie.a.value},${cookie.b.value},${cookie.c.value}`,
  )

  const res = await req(app, '/', { headers: { cookie: 'a=1; b=2; c=3' } })
  if ((await res.text()) !== '1,2,3') throw new Error('wrong multi-cookie parse')
})
