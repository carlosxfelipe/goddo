import { Goddo, t } from 'goddo'

const req = (app: Goddo, path: string, init?: RequestInit) =>
  app.handle(new Request(`http://localhost${path}`, init))

Deno.test('returns string as text/plain', async () => {
  const app = new Goddo().get('/', () => 'hi')
  const res = await req(app, '/')

  if (res.status !== 200) throw new Error(`status ${res.status}`)
  if ((await res.text()) !== 'hi') throw new Error('wrong body')
  if (!res.headers.get('content-type')?.includes('text/plain')) {
    throw new Error('wrong content-type')
  }
})

Deno.test('returns object as JSON', async () => {
  const app = new Goddo().get('/', () => ({ hello: 'world' }))
  const res = await req(app, '/')

  const body = await res.json()
  if (body.hello !== 'world') throw new Error('wrong body')
  if (!res.headers.get('content-type')?.includes('application/json')) {
    throw new Error('wrong content-type')
  }
})

Deno.test('path params', async () => {
  const app = new Goddo().get('/user/:id', ({ params: { id } }) => id)
  const res = await req(app, '/user/123')

  if ((await res.text()) !== '123') throw new Error('wrong param')
})

Deno.test('query params', async () => {
  const app = new Goddo().get('/q', ({ query }) => query)
  const res = await req(app, '/q?name=goddo&v=1')

  const body = await res.json()
  if (body.name !== 'goddo' || body.v !== '1') throw new Error('wrong query')
})

Deno.test('JSON body on POST', async () => {
  const app = new Goddo().post('/mirror', ({ body }) => body)
  const res = await req(app, '/mirror', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ a: 1 }),
  })

  const body = await res.json()
  if (body.a !== 1) throw new Error('wrong body')
})

Deno.test('404 for unknown route', async () => {
  const app = new Goddo().get('/', () => 'hi')
  const res = await req(app, '/nope')

  if (res.status !== 404) throw new Error(`status ${res.status}`)
  await res.body?.cancel()
})

Deno.test('onError intercepts error', async () => {
  const app = new Goddo()
    .get('/boom', () => {
      throw new Error('boom')
    })
    .onError(({ error }) => `caught: ${error.message}`)

  const res = await req(app, '/boom')
  if ((await res.text()) !== 'caught: boom') throw new Error('onError did not intercept')
})

Deno.test('group with prefix', async () => {
  const app = new Goddo().group('/api', (app) => app.get('/health', () => 'ok'))
  const res = await req(app, '/api/health')

  if ((await res.text()) !== 'ok') throw new Error('group failed')
})

Deno.test('wildcard', async () => {
  const app = new Goddo().get('/files/*', ({ params }) => params['*'])
  const res = await req(app, '/files/a/b/c.txt')

  if ((await res.text()) !== 'a/b/c.txt') throw new Error('wildcard failed')
})

Deno.test('shared state', async () => {
  const app = new Goddo().state('version', '1.0').get('/v', ({ store }) => store.version)
  const res = await req(app, '/v')

  if ((await res.text()) !== '1.0') throw new Error('state failed')
})

Deno.test('beforeHandle can short-circuit', async () => {
  const app = new Goddo()
    .onBeforeHandle(({ headers, set }) => {
      if (!headers['authorization']) {
        set.status = 401
        return 'Unauthorized'
      }
    })
    .get('/secret', () => 'secret')

  const denied = await req(app, '/secret')
  if (denied.status !== 401) throw new Error('should deny')
  await denied.body?.cancel()

  const allowed = await req(app, '/secret', { headers: { authorization: 'Bearer x' } })
  if ((await allowed.text()) !== 'secret') throw new Error('should allow')
})

Deno.test('use composes plugins', async () => {
  const plugin = new Goddo().get('/plugin', () => 'from plugin')
  const app = new Goddo().use(plugin).get('/', () => 'root')

  const res = await req(app, '/plugin')
  if ((await res.text()) !== 'from plugin') throw new Error('plugin failed')
})

// ---------------------------------------------------------------------------
// Phase 3 — Guard
// ---------------------------------------------------------------------------

Deno.test('guard applies shared hooks to grouped routes', async () => {
  const app = new Goddo()
    .guard(
      {
        beforeHandle: ({ headers, set }) => {
          if (!headers['x-api-key']) {
            set.status = 403
            return 'Forbidden'
          }
        },
      },
      (app) =>
        app
          .get('/admin', () => 'admin page')
          .get('/settings', () => 'settings page'),
    )
    .get('/public', () => 'public')

  // Public route should work without header
  const pub = await req(app, '/public')
  if ((await pub.text()) !== 'public') throw new Error('public should pass')

  // Guarded route without header
  const denied = await req(app, '/admin')
  if (denied.status !== 403) throw new Error('guard should deny')
  await denied.body?.cancel()

  // Guarded route with header
  const allowed = await req(app, '/admin', { headers: { 'x-api-key': 'valid' } })
  if ((await allowed.text()) !== 'admin page') throw new Error('guard should allow')
})

Deno.test('guard applies shared schema validation', async () => {
  const app = new Goddo()
    .guard(
      { headers: t.Object({ authorization: t.String({ minLength: 1 }) }) },
      (app) => app.get('/protected', () => 'ok'),
    )
    .onError(({ code }) => code === 'VALIDATION' ? 'invalid' : 'other')

  const res = await req(app, '/protected')
  if ((await res.text()) !== 'invalid') throw new Error('guard schema should reject')
})

// ---------------------------------------------------------------------------
// Phase 3 — Derive
// ---------------------------------------------------------------------------

Deno.test('derive extends context before validation', async () => {
  const app = new Goddo()
    .derive(({ headers }) => ({
      bearer: headers['authorization']?.replace('Bearer ', '') ?? 'none',
    }))
    // deno-lint-ignore no-explicit-any
    .get('/token', (ctx: any) => ctx.bearer)

  const res = await req(app, '/token', { headers: { authorization: 'Bearer mytoken' } })
  if ((await res.text()) !== 'mytoken') throw new Error('derive failed')
})

// ---------------------------------------------------------------------------
// Phase 3 — Resolve
// ---------------------------------------------------------------------------

Deno.test('resolve extends context after validation', async () => {
  const app = new Goddo()
    .resolve(({ headers }) => ({
      userId: headers['x-user-id'] ?? 'anonymous',
    }))
    // deno-lint-ignore no-explicit-any
    .get('/me', (ctx: any) => `user:${ctx.userId}`)

  const res = await req(app, '/me', { headers: { 'x-user-id': '42' } })
  if ((await res.text()) !== 'user:42') throw new Error('resolve failed')
})

// ---------------------------------------------------------------------------
// Phase 3 — Macro
// ---------------------------------------------------------------------------

Deno.test('macro expands custom route options into hooks', async () => {
  const app = new Goddo()
    .macro({
      auth: (enabled: boolean) => ({
        beforeHandle: (
          { headers, error }: { headers: Record<string, string>; error: (status: number) => Error },
        ) => {
          if (enabled && !headers['authorization']) throw error(401)
        },
      }),
    })
    .get('/public', () => 'public')
    .get('/secret', () => 'secret', { auth: true })
    .onError(({ error }) => `err:${(error as { status?: number }).status ?? 500}`)

  const pub = await req(app, '/public')
  if ((await pub.text()) !== 'public') throw new Error('public should pass')

  const denied = await req(app, '/secret')
  if ((await denied.text()) !== 'err:401') throw new Error('macro auth should deny')

  const allowed = await req(app, '/secret', { headers: { authorization: 'Bearer x' } })
  if ((await allowed.text()) !== 'secret') throw new Error('macro auth should allow')
})
