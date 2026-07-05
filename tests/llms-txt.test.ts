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
