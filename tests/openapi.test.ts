import { Goddo, t } from '@goddo/core'
import { openapi } from '@goddo/openapi'

const req = (app: Goddo, path: string, init?: RequestInit) =>
  app.handle(new Request(`http://localhost${path}`, init))

Deno.test('serves Scalar UI at /docs', async () => {
  const app = new Goddo().use(openapi()).get('/', () => 'hi')
  const res = await req(app, '/docs')

  if (res.status !== 200) throw new Error(`status ${res.status}`)
  if (!res.headers.get('content-type')?.includes('text/html')) {
    throw new Error('wrong content-type')
  }

  const html = await res.text()
  if (!html.includes('@scalar/api-reference')) throw new Error('Scalar not referenced')
  if (!html.includes('data-url="/docs/json"')) throw new Error('wrong spec url')
})

Deno.test('serves OpenAPI spec at /docs/json', async () => {
  const app = new Goddo()
    .use(openapi({ documentation: { info: { title: 'My API', version: '1.0.0' } } }))
    .get('/user/:id', ({ params: { id } }) => id, {
      params: t.Object({ id: t.Numeric() }),
      detail: { summary: 'Get user', tags: ['user'] },
    })
    .post('/user', ({ body }) => body, {
      body: t.Object({ name: t.String() }),
      response: t.Object({ name: t.String() }),
    })

  const res = await req(app, '/docs/json')
  const spec = await res.json()

  if (spec.openapi !== '3.0.3') throw new Error('wrong openapi version')
  if (spec.info.title !== 'My API') throw new Error('info not applied')

  const getOp = spec.paths['/user/{id}']?.get
  if (!getOp) throw new Error('GET /user/{id} route missing')
  if (getOp.summary !== 'Get user') throw new Error('detail not applied')
  if (getOp.parameters?.[0]?.name !== 'id') throw new Error('param missing')
  if (getOp.parameters?.[0]?.in !== 'path') throw new Error('wrong param in')
  if (getOp.parameters?.[0]?.schema?.type !== 'number') throw new Error('wrong param schema')

  const postOp = spec.paths['/user']?.post
  if (!postOp) throw new Error('POST /user route missing')
  const bodySchema = postOp.requestBody?.content?.['application/json']?.schema
  if (bodySchema?.properties?.name?.type !== 'string') throw new Error('wrong body schema')
  if (!bodySchema?.required?.includes('name')) throw new Error('required missing')
  const responseSchema = postOp.responses?.['200']?.content?.['application/json']?.schema
  if (responseSchema?.properties?.name?.type !== 'string') {
    throw new Error('response schema missing')
  }
})

Deno.test('scalar routes do not appear in the spec', async () => {
  const app = new Goddo().use(openapi()).get('/', () => 'hi')
  const res = await req(app, '/docs/json')
  const spec = await res.json()

  if (spec.paths['/docs'] || spec.paths['/docs/json']) {
    throw new Error('scalar routes leaked into the spec')
  }
  if (!spec.paths['/']) throw new Error('/ route missing')
})

Deno.test('includes routes registered after use', async () => {
  const app = new Goddo().use(openapi()).get('/after', () => 'ok')
  const res = await req(app, '/docs/json')
  const spec = await res.json()

  if (!spec.paths['/after']) throw new Error('route registered after use is missing')
})

Deno.test('custom path and exclude', async () => {
  const app = new Goddo()
    .use(openapi({ path: '/reference', exclude: ['/internal'] }))
    .get('/internal', () => 'private')
    .get('/public', () => 'ok')

  const ui = await req(app, '/reference')
  if (ui.status !== 200) throw new Error('UI not served at /reference')
  await ui.body?.cancel()

  const res = await req(app, '/reference/json')
  const spec = await res.json()
  if (spec.paths['/internal']) throw new Error('exclude not applied')
  if (!spec.paths['/public']) throw new Error('public route missing')
})

Deno.test('query becomes parameter in the spec', async () => {
  const app = new Goddo().use(openapi()).get('/list', ({ query }) => query, {
    query: t.Object({ page: t.Numeric({ default: 1 }), q: t.Optional(t.String()) }),
  })

  const res = await req(app, '/docs/json')
  const spec = await res.json()

  const parameters = spec.paths['/list']?.get?.parameters as {
    name: string
    in: string
    required: boolean
  }[]
  const page = parameters.find((p) => p.name === 'page')
  const q = parameters.find((p) => p.name === 'q')

  if (page?.in !== 'query') throw new Error('query param missing')
  if (page.required !== false) throw new Error('default should make it optional')
  if (q?.required !== false) throw new Error('optional should be required: false')
})

Deno.test('serves Swagger UI when provider is swagger-ui', async () => {
  const app = new Goddo().use(openapi({ provider: 'swagger-ui' })).get('/', () => 'hi')
  const res = await req(app, '/docs')
  const html = await res.text()

  if (html.includes('@scalar/api-reference')) {
    throw new Error('Scalar referenced instead of Swagger')
  }
  if (!html.includes('swagger-ui-bundle.js')) throw new Error('Swagger bundle missing')
})

Deno.test('bearerAuth option injects security schemes', async () => {
  const app = new Goddo().use(openapi({ bearerAuth: true })).get('/', () => 'hi')
  const res = await req(app, '/docs/json')
  const spec = await res.json()

  if (spec.components?.securitySchemes?.bearerAuth?.type !== 'http') {
    throw new Error('bearerAuth security scheme not injected')
  }
})

Deno.test('hide detail removes route from spec', async () => {
  const app = new Goddo()
    .use(openapi())
    .get('/visible', () => 'ok')
    .get('/hidden', () => 'secret', { detail: { hide: true } })

  const res = await req(app, '/docs/json')
  const spec = await res.json()

  if (!spec.paths['/visible']) throw new Error('visible route missing')
  if (spec.paths['/hidden']) throw new Error('hidden route leaked into spec')
})

Deno.test('auto-tags routes based on path prefix', async () => {
  const app = new Goddo()
    .use(openapi())
    .get('/users/:id', () => 'ok')
    .get('/auth/login', () => 'ok')

  const res = await req(app, '/docs/json')
  const spec = await res.json()

  if (spec.paths['/users/{id}']?.get?.tags?.[0] !== 'Users') {
    throw new Error('auto-tag failed for /users')
  }
  if (spec.paths['/auth/login']?.get?.tags?.[0] !== 'Auth') {
    throw new Error('auto-tag failed for /auth')
  }
})
