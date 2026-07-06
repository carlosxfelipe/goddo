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

Deno.test('cookie parsing skips malformed segments', async () => {
  const app = new Goddo().get('/', ({ cookie }) => cookie.valid.value ?? 'no')
  // 'malformed' has no '=', should be skipped, 'valid=yes' should be parsed
  const res = await req(app, '/', { headers: { cookie: 'malformed; valid=yes' } })
  if ((await res.text()) !== 'yes') throw new Error('should parse valid segment')
})

Deno.test('Cookie proxy allows direct value assignment and iteration', async () => {
  const app = new Goddo().get('/', ({ cookie }) => {
    // Test proxy set trap
    cookie.direct = 'assigned'
    // Test proxy has / ownKeys
    const keys = Object.keys(cookie)
    return keys.includes('direct') ? 'ok' : 'fail'
  })
  const res = await req(app, '/')
  if ((await res.text()) !== 'ok') throw new Error('proxy traps failed')
  const setCookie = res.headers.get('set-cookie')
  if (!setCookie?.includes('direct=assigned')) throw new Error('did not set direct cookie')
})

Deno.test('Cookie properties getter/setter coverage', async () => {
  const app = new Goddo().get('/', ({ cookie }) => {
    cookie.test.value = 'val'
    cookie.test.domain = 'example.com'
    cookie.test.priority = 'high'
    // Also test isRemoved
    cookie.deleted.remove()
    if (!cookie.deleted.isRemoved) throw new Error('should be removed')
    return 'ok'
  })
  const res = await req(app, '/')
  const setCookies = res.headers.getSetCookie()
  const testCookie = setCookies.find((c) => c.startsWith('test='))
  if (!testCookie?.includes('Domain=example.com')) throw new Error('missing domain')
  if (!testCookie?.includes('Priority=High')) throw new Error('missing priority')
})

Deno.test('Signed Cookies: sign and verify with valid secret', async () => {
  const app = new Goddo({ cookieSecret: 'super-secret' })
    .get('/sign', async ({ cookie }) => {
      cookie.auth.value = 'hello'
      await cookie.auth.sign()
      return 'ok'
    })
    .get('/verify', async ({ cookie }) => {
      const isValid = await cookie.auth.verify()
      return isValid ? cookie.auth.value : 'invalid'
    })

  const res1 = await req(app, '/sign')
  const setCookies = res1.headers.getSetCookie()
  const authCookie = setCookies.find((c) => c.startsWith('auth='))
  if (!authCookie) throw new Error('cookie not set')

  // Extract just the cookie string without attributes for the second request
  const cookieStr = authCookie.split(';')[0]

  const res2 = await req(app, '/verify', { headers: { cookie: cookieStr ?? '' } })
  if ((await res2.text()) !== 'hello') throw new Error('signature verification failed')
})

Deno.test('Signed Cookies: verify fails with invalid signature', async () => {
  const app = new Goddo({ cookieSecret: 'super-secret' })
    .get('/verify', async ({ cookie }) => {
      const isValid = await cookie.auth.verify()
      return isValid ? cookie.auth.value : 'invalid'
    })

  // Provide a tampered value (missing or wrong signature)
  const res = await req(app, '/verify', { headers: { cookie: 'auth=hello.badsignature' } })
  if ((await res.text()) !== 'invalid') throw new Error('should reject invalid signature')
})

Deno.test('Signed Cookies: throws if no secret is configured', async () => {
  const app = new Goddo() // No secret
    .get('/sign', async ({ cookie }) => {
      try {
        cookie.auth.value = 'hello'
        await cookie.auth.sign()
        return 'ok'
      } catch (e) {
        return (e as Error).message
      }
    })

  const res = await req(app, '/sign')
  const text = await res.text()
  if (!text.includes('cookieSecret is not configured')) throw new Error('should throw error')
})
