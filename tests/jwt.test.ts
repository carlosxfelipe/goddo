import { Goddo } from '@goddo/core'
import { jwt } from '@goddo/jwt'

const req = (app: Goddo, path: string, init?: RequestInit) =>
  app.handle(new Request(`http://localhost${path}`, init))

// ─── sign ────────────────────────────────────────────────────────────────────

Deno.test('JWT sign returns a three-part token', async () => {
  const app = new Goddo()
    .use(jwt<'jwt'>({ secret: 'super-secret-key-32-characters!!' }))
    .get('/sign', async ({ jwt }) => await jwt.sign({ sub: '123' }))

  const res = await req(app, '/sign')
  const token = await res.text()
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error(`expected 3 parts, got ${parts.length}: ${token}`)
})

// ─── verify ──────────────────────────────────────────────────────────────────

Deno.test('JWT verify returns payload for valid token', async () => {
  const app = new Goddo()
    .use(jwt({ secret: 'super-secret-key-32-characters!!' }))
    .get('/sign', async ({ jwt }) => await jwt.sign({ sub: '42', role: 'admin' }))
    .get('/verify', async ({ jwt, query }) => {
      const result = await jwt.verify(query.token ?? '')
      return result
    })

  const signRes = await req(app, '/sign')
  const token = await signRes.text()

  const verifyRes = await req(app, `/verify?token=${encodeURIComponent(token)}`)
  const payload = await verifyRes.json()

  if (payload.sub !== '42') throw new Error(`sub mismatch: ${payload.sub}`)
  if (payload.role !== 'admin') throw new Error(`role mismatch: ${payload.role}`)
})

Deno.test('JWT verify returns false for invalid signature', async () => {
  const app = new Goddo()
    .use(jwt({ secret: 'super-secret-key-32-characters!!' }))
    .get('/verify', async ({ jwt, query }) => {
      const result = await jwt.verify(query.token ?? '')
      return result === false ? 'false' : 'true'
    })

  const res = await req(app, '/verify?token=aaa.bbb.ccc')
  const body = await res.text()
  if (body !== 'false') throw new Error(`expected false, got ${body}`)
})

Deno.test('JWT verify returns false for expired token', async () => {
  // Sign with exp=-1 so the token is already expired
  const app = new Goddo()
    .use(jwt({ secret: 'super-secret-key-32-characters!!', exp: -1 }))
    .get('/sign', async ({ jwt }) => await jwt.sign({ sub: '1' }))
    .get('/verify', async ({ jwt, query }) => {
      const result = await jwt.verify(query.token ?? '')
      return result === false ? 'false' : 'true'
    })

  const signRes = await req(app, '/sign')
  const token = await signRes.text()

  const verifyRes = await req(app, `/verify?token=${encodeURIComponent(token)}`)
  const body = await verifyRes.text()
  if (body !== 'false') throw new Error(`expected false for expired token, got ${body}`)
})

// ─── custom name ─────────────────────────────────────────────────────────────

Deno.test('JWT supports custom context key name', async () => {
  const app = new Goddo()
    .use(jwt({ secret: 'super-secret-key-32-characters!!', name: 'auth' }))
    .get('/sign', async ({ auth }) => await auth.sign({ sub: 'x' }))

  const res = await req(app, '/sign')
  const token = await res.text()
  if (token.split('.').length !== 3) throw new Error('invalid token with custom name')
})

// ─── algorithm variants ──────────────────────────────────────────────────────

Deno.test('JWT HS384 sign and verify', async () => {
  const app = new Goddo()
    .use(jwt({ secret: 'super-secret-key-32-characters!!', alg: 'HS384' }))
    .get('/sign', async ({ jwt }) => await jwt.sign({ sub: '384' }))
    .get('/verify', async ({ jwt, query }) => {
      const result = await jwt.verify(query.token ?? '')
      return result
    })

  const token = await (await req(app, '/sign')).text()
  const payload = await (await req(app, `/verify?token=${encodeURIComponent(token)}`)).json()
  if (payload.sub !== '384') throw new Error(`sub mismatch: ${payload.sub}`)
})

Deno.test('JWT HS512 sign and verify', async () => {
  const app = new Goddo()
    .use(jwt({ secret: 'super-secret-key-32-characters!!', alg: 'HS512' }))
    .get('/sign', async ({ jwt }) => await jwt.sign({ sub: '512' }))
    .get('/verify', async ({ jwt, query }) => {
      const result = await jwt.verify(query.token ?? '')
      return result
    })

  const token = await (await req(app, '/sign')).text()
  const payload = await (await req(app, `/verify?token=${encodeURIComponent(token)}`)).json()
  if (payload.sub !== '512') throw new Error(`sub mismatch: ${payload.sub}`)
})
