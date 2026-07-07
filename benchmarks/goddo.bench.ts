import { Router } from '@goddo/core/router'
import { Goddo, t } from '@goddo/core'

// --- Router lookup benchmarks ---

const router = new Router()
const handler = () => 'ok'

// Register a mix of static and parametric routes
const paths = [
  ['GET', '/'],
  ['GET', '/users'],
  ['GET', '/users/:id'],
  ['GET', '/users/:id/posts'],
  ['GET', '/users/:id/posts/:postId'],
  ['POST', '/users'],
  ['PUT', '/users/:id'],
  ['DELETE', '/users/:id'],
  ['GET', '/api/v1/status'],
  ['GET', '/api/v1/health'],
  ['GET', '/files/*'],
  ['GET', '/products'],
  ['GET', '/products/:slug'],
  ['POST', '/products'],
  ['GET', '/orders/:orderId/items'],
] as const

for (const [method, path] of paths) {
  router.add(method, path, handler, {})
}

Deno.bench('Router: static route lookup (/)', { group: 'router' }, () => {
  router.find('GET', '/')
})

Deno.bench('Router: static route lookup (/api/v1/status)', { group: 'router' }, () => {
  router.find('GET', '/api/v1/status')
})

Deno.bench('Router: param route lookup (/users/42)', { group: 'router' }, () => {
  router.find('GET', '/users/42')
})

Deno.bench('Router: deep param route lookup (/users/42/posts/99)', { group: 'router' }, () => {
  router.find('GET', '/users/42/posts/99')
})

Deno.bench('Router: wildcard route lookup (/files/a/b/c)', { group: 'router' }, () => {
  router.find('GET', '/files/a/b/c')
})

Deno.bench('Router: 404 lookup (/unknown/path)', { group: 'router' }, () => {
  router.find('GET', '/unknown/path')
})

// --- Compiled handler benchmarks (in-memory, no network) ---

const app = new Goddo()
  .get('/', () => 'Hello Goddo')
  .get('/json', () => ({ ok: true }))
  .get('/user/:id', ({ params }) => params.id)
  .post('/mirror', ({ body }) => body, {
    body: t.Object({ name: t.String(), age: t.Number() }),
  })
  .get('/double/:id', ({ params }) => params.id, {
    params: t.Object({ id: t.Numeric() }),
  })

app.compile()

Deno.bench(
  'Compiled: GET / (static, sync handler)',
  { group: 'compiled-handler' },
  async () => {
    const req = new Request('http://localhost/')
    await app.handle(req)
  },
)

Deno.bench(
  'Compiled: GET /json (static, sync handler, JSON response)',
  { group: 'compiled-handler' },
  async () => {
    const req = new Request('http://localhost/json')
    await app.handle(req)
  },
)

Deno.bench(
  'Compiled: GET /user/42 (param route)',
  { group: 'compiled-handler' },
  async () => {
    const req = new Request('http://localhost/user/42')
    await app.handle(req)
  },
)

Deno.bench(
  'Compiled: GET /double/21 (param route + validation)',
  { group: 'compiled-handler' },
  async () => {
    const req = new Request('http://localhost/double/21')
    await app.handle(req)
  },
)

Deno.bench(
  'Compiled: POST /mirror (body parse + validation)',
  { group: 'compiled-handler' },
  async () => {
    const req = new Request('http://localhost/mirror', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Carlos', age: 25 }),
    })
    await app.handle(req)
  },
)

Deno.bench(
  'Compiled: 404 unknown route',
  { group: 'compiled-handler' },
  async () => {
    const req = new Request('http://localhost/nope')
    await app.handle(req)
  },
)

// --- Compilation overhead benchmark ---

Deno.bench(
  'Compilation: compile 15 routes',
  { group: 'compilation' },
  () => {
    const benchApp = new Goddo()
    for (const [method, path] of paths) {
      benchApp.route(method, path, handler, {})
    }
    benchApp.compile()
  },
)

// --- Uncompiled vs compiled comparison ---

const uncompiledApp = new Goddo()
  .get('/', () => 'Hello Goddo')
  .get('/json', () => ({ ok: true }))
  .get('/user/:id', ({ params }) => params.id)

const compiledApp = new Goddo()
  .get('/', () => 'Hello Goddo')
  .get('/json', () => ({ ok: true }))
  .get('/user/:id', ({ params }) => params.id)
compiledApp.compile()

Deno.bench(
  'Uncompiled: GET / (interpreter mode)',
  { group: 'comparison' },
  async () => {
    const req = new Request('http://localhost/')
    await uncompiledApp.handle(req)
  },
)

Deno.bench(
  'Compiled: GET / (AOT mode)',
  { group: 'comparison' },
  async () => {
    const req = new Request('http://localhost/')
    await compiledApp.handle(req)
  },
)

Deno.bench(
  'Uncompiled: GET /user/42 (interpreter mode)',
  { group: 'comparison' },
  async () => {
    const req = new Request('http://localhost/user/42')
    await uncompiledApp.handle(req)
  },
)

Deno.bench(
  'Compiled: GET /user/42 (AOT mode)',
  { group: 'comparison' },
  async () => {
    const req = new Request('http://localhost/user/42')
    await compiledApp.handle(req)
  },
)
