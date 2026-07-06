import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { Goddo, t } from 'goddo'
import { llmstxt } from '@goddo/llms-txt'

Deno.test('llmstxt - generates valid markdown documentation', async () => {
  const app = new Goddo()
    .use(llmstxt({
      title: 'Test API',
      description: 'A test API for LLMs',
    }))
    .get('/users', () => 'list users', {
      detail: { summary: 'List all users' },
    })
    .get('/users/:id', () => 'get user', {
      params: t.Object({ id: t.Numeric({ description: 'User ID' }) }),
      detail: { summary: 'Get a user' },
    })
    .post('/users', () => 'create user', {
      body: t.Object({
        name: t.String(),
        age: t.Optional(t.Numeric()),
      }),
      detail: { summary: 'Create a user' },
    })

  const res = await app.handle(new Request('http://localhost/llms.txt'))
  assertEquals(res.status, 200)

  const text = await res.text()

  // Basic structure checks
  assertEquals(text.includes('# Test API'), true)
  assertEquals(text.includes('> A test API for LLMs'), true)

  // Route checks
  assertEquals(text.includes('## `GET` /users'), true)
  assertEquals(text.includes('**Summary:** List all users'), true)

  assertEquals(text.includes('## `GET` /users/{id}'), true)
  assertEquals(text.includes('- `id` (path): numeric *(required)* - User ID'), true)

  assertEquals(text.includes('## `POST` /users'), true)
  assertEquals(text.includes('### Request Body'), true)
  assertEquals(text.includes('- `name` (string) *(required)*'), true)
  assertEquals(text.includes('- `age` (numeric)'), true)
})

Deno.test('llmstxt - generates valid markdown for nested schemas, arrays, and query/headers', async () => {
  const app = new Goddo()
    .use(llmstxt({ exclude: [/^\/ignored/], title: 'Advanced API', description: 'Advanced' }))
    .post('/nested', () => 'nested', {
      query: t.Object({ page: t.Numeric() }),
      headers: t.Object({ 'x-token': t.String({ description: 'Auth token' }) }),
      body: t.Object({
        tags: t.Array(t.String()),
        nestedArray: t.Array(t.Object({ id: t.Numeric() })),
        emptyObj: t.Object({}),
        primitive: t.String(),
      }),
      detail: { description: 'A nested endpoint' },
    })
    .get('/ignored/route', () => 'ignored')

  const res = await app.handle(new Request('http://localhost/llms.txt'))
  const text = await res.text()

  // Structure
  assertEquals(text.includes('# Advanced API'), true)
  assertEquals(text.includes('> Advanced'), true)

  // Ignored route
  assertEquals(text.includes('/ignored/route'), false)

  // Parameters
  assertEquals(text.includes('- `page` (query): numeric *(required)*'), true)
  assertEquals(text.includes('- `x-token` (header): string *(required)* - Auth token'), true)

  // Body formatting
  assertEquals(text.includes('- `tags` (array) *(required)*'), true)
  assertEquals(text.includes('Array<string>'), true)
  assertEquals(text.includes('- `emptyObj` (object) *(required)*'), true)
  assertEquals(text.includes('- `nestedArray` (array) *(required)*'), true)
  assertEquals(text.includes('- Array of:\n    - `id` (numeric) *(required)*'), true)
})

Deno.test('llmstxt - handles top-level array and primitive body', async () => {
  const app = new Goddo()
    .use(llmstxt())
    .post('/arr', () => 'arr', {
      body: t.Array(t.String()),
    })
    .post('/prim', () => 'prim', {
      body: t.String(),
    })

  const res = await app.handle(new Request('http://localhost/llms.txt'))
  const text = await res.text()

  assertEquals(text.includes('- array'), true)
  assertEquals(text.includes('- string'), true)
})
