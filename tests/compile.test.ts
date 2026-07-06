import { Goddo, t } from '@goddo/core'
import { compileRoutes } from '@goddo/core/compile'
import { Router } from '@goddo/core/router'

const startApp = async (app: Goddo, port: number): Promise<void> => {
  app.listen(port)
  await new Promise((r) => setTimeout(r, 100))
}

const stopApp = async (app: Goddo): Promise<void> => {
  await app.stop()
}

Deno.test('Compiled route: basic GET returns text', async () => {
  const app = new Goddo().get('/', () => 'Hello Goddo')
  await startApp(app, 4201)

  const res = await fetch('http://localhost:4201/')
  const text = await res.text()
  await stopApp(app)

  if (text !== 'Hello Goddo') throw new Error(`Expected "Hello Goddo", got "${text}"`)
})

Deno.test('Compiled route: JSON response auto-serialized', async () => {
  const app = new Goddo().get('/json', () => ({ ok: true }))
  await startApp(app, 4202)

  const res = await fetch('http://localhost:4202/json')
  const json = await res.json()
  await stopApp(app)

  if (!json.ok) throw new Error('Expected { ok: true }')
})

Deno.test('Compiled route: path params extracted correctly', async () => {
  const app = new Goddo().get('/user/:id', ({ params }) => params.id)
  await startApp(app, 4203)

  const res = await fetch('http://localhost:4203/user/42')
  const text = await res.text()
  await stopApp(app)

  if (text !== '42') throw new Error(`Expected "42", got "${text}"`)
})

Deno.test('Compiled route: query params parsed', async () => {
  const app = new Goddo().get('/q', ({ query }) => query.name)
  await startApp(app, 4204)

  const res = await fetch('http://localhost:4204/q?name=Carlos')
  const text = await res.text()
  await stopApp(app)

  if (text !== 'Carlos') throw new Error(`Expected "Carlos", got "${text}"`)
})

Deno.test('Compiled route: POST body parsed as JSON', async () => {
  const app = new Goddo().post('/mirror', ({ body }) => body)
  await startApp(app, 4205)

  const res = await fetch('http://localhost:4205/mirror', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ hello: 'world' }),
  })
  const json = await res.json()
  await stopApp(app)

  if (json.hello !== 'world') throw new Error('Body not mirrored correctly')
})

Deno.test('Compiled route: validation works (body schema)', async () => {
  const app = new Goddo().post(
    '/user',
    ({ body }) => body.name,
    { body: t.Object({ name: t.String() }) },
  )
  await startApp(app, 4206)

  const res = await fetch('http://localhost:4206/user', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Carlos' }),
  })
  const text = await res.text()
  await stopApp(app)

  if (text !== 'Carlos') throw new Error(`Expected "Carlos", got "${text}"`)
})

Deno.test('Compiled route: validation rejects invalid body with 422', async () => {
  const app = new Goddo().post(
    '/user',
    ({ body }) => body.name,
    { body: t.Object({ name: t.String() }) },
  )
  await startApp(app, 4207)

  const res = await fetch('http://localhost:4207/user', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ age: 25 }),
  })
  const status = res.status
  await res.text()
  await stopApp(app)

  if (status !== 422) throw new Error(`Expected 422, got ${status}`)
})

Deno.test('Compiled route: params coercion works', async () => {
  const app = new Goddo().get(
    '/double/:id',
    ({ params }) => params.id * 2,
    { params: t.Object({ id: t.Numeric() }) },
  )
  await startApp(app, 4208)

  const res = await fetch('http://localhost:4208/double/21')
  const text = await res.text()
  await stopApp(app)

  if (text !== '42') throw new Error(`Expected "42", got "${text}"`)
})

Deno.test('Compiled route: 404 for unknown routes', async () => {
  const app = new Goddo().get('/', () => 'ok')
  await startApp(app, 4209)

  const res = await fetch('http://localhost:4209/nope')
  const status = res.status
  await res.text()
  await stopApp(app)

  if (status !== 404) throw new Error(`Expected 404, got ${status}`)
})

Deno.test('Compiled route: lifecycle hooks fire correctly', async () => {
  let beforeCalled = false
  let afterCalled = false

  const app = new Goddo()
    .onBeforeHandle(() => {
      beforeCalled = true
    })
    .onAfterHandle(() => {
      afterCalled = true
    })
    .get('/', () => 'ok')
  await startApp(app, 4210)

  await fetch('http://localhost:4210/')
  await stopApp(app)

  if (!beforeCalled) throw new Error('onBeforeHandle did not fire')
  if (!afterCalled) throw new Error('onAfterHandle did not fire')
})

Deno.test('Compiled route: onError fires on thrown errors', async () => {
  let errorCalled = false

  const app = new Goddo()
    .onError(() => {
      errorCalled = true
      return 'caught'
    })
    .get('/throw', () => {
      throw new Error('boom')
    })
  await startApp(app, 4211)

  const res = await fetch('http://localhost:4211/throw')
  const text = await res.text()
  await stopApp(app)

  if (!errorCalled) throw new Error('onError did not fire')
  if (text !== 'caught') throw new Error(`Expected "caught", got "${text}"`)
})

Deno.test('Compiled route: wildcard routes work', async () => {
  const app = new Goddo().get('/files/*', ({ params }) => params['*'])
  await startApp(app, 4212)

  const res = await fetch('http://localhost:4212/files/a/b/c')
  const text = await res.text()
  await stopApp(app)

  if (text !== 'a/b/c') throw new Error(`Expected "a/b/c", got "${text}"`)
})

Deno.test('Compiled route: derive extends context', async () => {
  const app = new Goddo()
    .derive(({ headers }) => ({ bearer: headers.authorization ?? 'none' }))
    .get('/token', (ctx) => (ctx as Record<string, unknown>).bearer as string)
  await startApp(app, 4213)

  const res = await fetch('http://localhost:4213/token', {
    headers: { authorization: 'Bearer abc123' },
  })
  const text = await res.text()
  await stopApp(app)

  if (text !== 'Bearer abc123') throw new Error(`Expected "Bearer abc123", got "${text}"`)
})

Deno.test('Compiled route: resolve extends context after validation', async () => {
  const app = new Goddo()
    .resolve(() => ({ user: 'Carlos' }))
    .get('/me', (ctx) => (ctx as Record<string, unknown>).user as string)
  await startApp(app, 4214)

  const res = await fetch('http://localhost:4214/me')
  const text = await res.text()
  await stopApp(app)

  if (text !== 'Carlos') throw new Error(`Expected "Carlos", got "${text}"`)
})

Deno.test('Compiled route: compile() can be called manually', async () => {
  const app = new Goddo().get('/', () => 'compiled')
  app.compile()
  await startApp(app, 4215)

  const res = await fetch('http://localhost:4215/')
  const text = await res.text()
  await stopApp(app)

  if (text !== 'compiled') throw new Error(`Expected "compiled", got "${text}"`)
})

Deno.test('Compiled route: compileRoutes works standalone', async () => {
  const router = new Router()
  const handler = () => 'standalone'
  router.add('GET', '/test', handler, {})

  const compiledHandler = compileRoutes(
    [{ method: 'GET', path: '/test', handler, hooks: {} }],
    {
      request: [],
      parse: [],
      transform: [],
      derive: [],
      beforeHandle: [],
      resolve: [],
      afterHandle: [],
      mapResponse: [],
      afterResponse: [],
      error: [],
      start: [],
      stop: [],
    },
    {},
    {},
    router,
    [],
  )

  const request = new Request('http://localhost/test')
  const response = await compiledHandler(request)
  const text = await response.text()

  if (text !== 'standalone') throw new Error(`Expected "standalone", got "${text}"`)
})

Deno.test('Compiled route: async handler works with sucrose detection', async () => {
  const app = new Goddo().get('/async', async () => {
    await new Promise((r) => setTimeout(r, 10))
    return 'async result'
  })
  await startApp(app, 4216)

  const res = await fetch('http://localhost:4216/async')
  const text = await res.text()
  await stopApp(app)

  if (text !== 'async result') throw new Error(`Expected "async result", got "${text}"`)
})

Deno.test('Compiled route: group routes work', async () => {
  const app = new Goddo().group('/api', (app) => app.get('/health', () => 'ok'))
  await startApp(app, 4217)

  const res = await fetch('http://localhost:4217/api/health')
  const text = await res.text()
  await stopApp(app)

  if (text !== 'ok') throw new Error(`Expected "ok", got "${text}"`)
})

Deno.test('Compiled route: guard hooks apply to scoped routes', async () => {
  const app = new Goddo()
    .guard(
      {
        beforeHandle: ({ headers, error }) => {
          if (!headers.authorization) throw error(401)
        },
      },
      (app) => app.get('/admin', () => 'admin'),
    )
    .get('/public', () => 'public')
  await startApp(app, 4218)

  const resAdmin = await fetch('http://localhost:4218/admin')
  const statusAdmin = resAdmin.status
  await resAdmin.text()

  const resPublic = await fetch('http://localhost:4218/public')
  const textPublic = await resPublic.text()
  await stopApp(app)

  if (statusAdmin !== 401) throw new Error(`Expected 401, got ${statusAdmin}`)
  if (textPublic !== 'public') throw new Error(`Expected "public", got "${textPublic}"`)
})

Deno.test('Compiled route: Context getters/setters (query, headers, cookie)', async () => {
  const app = new Goddo().get('/ctx', (ctx) => {
    // Modify query
    ctx.query = { foo: 'bar' }

    // Modify headers
    ctx.headers = { 'x-foo': 'baz' } // Modify cookie
     // Need to cast to bypass readonly type definitions for test purposes
    ;(ctx as unknown as Record<string, unknown>).cookie = { test: 'cookie' }

    return {
      query: ctx.query,
      headers: ctx.headers,
      cookie: (ctx as unknown as Record<string, unknown>).cookie,
      jar: typeof (ctx as unknown as Record<string, unknown>).getJar === 'function'
        ? (ctx as unknown as { getJar(): unknown }).getJar()
        : undefined,
    }
  })
  await startApp(app, 4219)

  const res = await fetch('http://localhost:4219/ctx')
  const json = await res.json()
  await stopApp(app)

  if (json.query.foo !== 'bar') throw new Error('query setter failed')
  if (json.headers['x-foo'] !== 'baz') throw new Error('headers setter failed')
  if (json.cookie.test !== 'cookie') throw new Error('cookie setter failed')
})

Deno.test('Compiled route: onCleanup catches errors internally', async () => {
  let counter = 0
  const app = new Goddo().get('/cleanup-error', ({ onCleanup }) => {
    onCleanup(() => {
      counter++
    })
    onCleanup(() => {
      throw new Error('boom')
    })
    onCleanup(() => {
      counter++
    })
    return 'ok'
  })

  await startApp(app, 4220)

  // Suppress console.error during test
  const originalError = console.error
  console.error = () => {}

  const res = await fetch('http://localhost:4220/cleanup-error')
  const text = await res.text()

  console.error = originalError
  await stopApp(app)

  if (text !== 'ok') throw new Error('response failed')
  if (counter !== 2) throw new Error(`Expected counter to be 2, got ${counter}`)
})
