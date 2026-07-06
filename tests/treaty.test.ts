/**
 * Treaty client tests.
 *
 * Each test starts a Goddo server on a random OS-assigned port (port: 0),
 * creates a treaty client against it, exercises the client, then shuts
 * the server down.
 */

import { Goddo, t } from '@goddo/core'
import { treaty } from '@goddo/treaty'

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/**
 * Start `app` on a random port via Deno.serve (port: 0).
 * `onListen` fires synchronously before `app.listen()` returns, so
 * `assignedPort` is always set by the time the helper returns.
 */
function startServer(app: Goddo): { baseUrl: string; stop: () => Promise<void> } {
  let assignedPort = 0
  app.listen({
    port: 0,
    onListen: ({ port }) => {
      assignedPort = port
    },
  })
  return {
    baseUrl: `http://localhost:${assignedPort}`,
    stop: () => app.stop(),
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

Deno.test('treaty: GET root path', async () => {
  const app = new Goddo().get('/', () => 'root')
  const { baseUrl, stop } = startServer(app)

  try {
    const client = treaty<typeof app>(baseUrl)
    const { data, error } = await client.get()

    if (error) throw error
    if (data !== 'root') throw new Error(`Expected 'root', got ${JSON.stringify(data)}`)
  } finally {
    await stop()
  }
})

Deno.test('treaty: GET returns plain text', async () => {
  const app = new Goddo().get('/hello', () => 'world')
  const { baseUrl, stop } = startServer(app)

  try {
    const client = treaty<typeof app>(baseUrl)
    const { data, error } = await client.hello.get()

    if (error) throw error
    if (data !== 'world') throw new Error(`Expected 'world', got ${JSON.stringify(data)}`)
  } finally {
    await stop()
  }
})

Deno.test('treaty: GET returns JSON object', async () => {
  const app = new Goddo().get('/user', () => ({ id: 1, name: 'Carlos' }))
  const { baseUrl, stop } = startServer(app)

  try {
    const client = treaty<typeof app>(baseUrl)
    const { data, error } = await client.user.get()

    if (error) throw error
    const d = data as { id: number; name: string }
    if (d.id !== 1 || d.name !== 'Carlos') throw new Error(`Unexpected data: ${JSON.stringify(d)}`)
  } finally {
    await stop()
  }
})

Deno.test('treaty: POST with JSON body', async () => {
  const app = new Goddo().post('/echo', ({ body }) => body, {
    body: t.Object({ name: t.String() }),
  })
  const { baseUrl, stop } = startServer(app)

  try {
    const client = treaty<typeof app>(baseUrl)
    const { data, error } = await client.echo.post({ body: { name: 'Goddo' } })

    if (error) throw error
    if ((data as { name: string }).name !== 'Goddo') {
      throw new Error(`Unexpected body: ${JSON.stringify(data)}`)
    }
  } finally {
    await stop()
  }
})

Deno.test('treaty: GET with path param', async () => {
  const app = new Goddo().get('/user/:id', ({ params }) => params.id)
  const { baseUrl, stop } = startServer(app)

  try {
    const client = treaty<typeof app>(baseUrl)
    const { data, error } = await client.user({ id: '42' }).get()

    if (error) throw error
    if (data !== '42') throw new Error(`Expected '42', got ${JSON.stringify(data)}`)
  } finally {
    await stop()
  }
})

Deno.test('treaty: GET with numeric path param (coerced)', async () => {
  const app = new Goddo().get('/item/:id', ({ params }) => params.id * 2, {
    params: t.Object({ id: t.Numeric() }),
  })
  const { baseUrl, stop } = startServer(app)

  try {
    const client = treaty<typeof app>(baseUrl)
    const { data, error } = await client.item({ id: '5' }).get()

    if (error) throw error
    // The server returns a number; Goddo serializes it as text/plain ("10")
    if (Number(data) !== 10) throw new Error(`Expected 10, got ${data}`)
  } finally {
    await stop()
  }
})

Deno.test('treaty: GET with query string', async () => {
  const app = new Goddo().get('/search', ({ query }) => query)
  const { baseUrl, stop } = startServer(app)

  try {
    const client = treaty<typeof app>(baseUrl)
    const { data, error } = await client.search.get({ query: { q: 'goddo', page: '1' } })

    if (error) throw error
    const d = data as Record<string, string>
    if (d['q'] !== 'goddo') throw new Error(`wrong q: ${d['q']}`)
    if (d['page'] !== '1') throw new Error(`wrong page: ${d['page']}`)
  } finally {
    await stop()
  }
})

Deno.test('treaty: nested static path', async () => {
  const app = new Goddo().get('/api/v1/status', () => ({ ok: true }))
  const { baseUrl, stop } = startServer(app)

  try {
    const client = treaty<typeof app>(baseUrl)
    const { data, error } = await client.api.v1.status.get()

    if (error) throw error
    if (!(data as { ok: boolean }).ok) throw new Error('Expected ok: true')
  } finally {
    await stop()
  }
})

Deno.test('treaty: PUT updates resource', async () => {
  const app = new Goddo().put('/user/:id', ({ params }) => ({ updated: params.id }))
  const { baseUrl, stop } = startServer(app)

  try {
    const client = treaty<typeof app>(baseUrl)
    const { data, error } = await client.user({ id: '7' }).put()

    if (error) throw error
    if ((data as { updated: string }).updated !== '7') {
      throw new Error(`Unexpected: ${JSON.stringify(data)}`)
    }
  } finally {
    await stop()
  }
})

Deno.test('treaty: DELETE returns 200', async () => {
  const app = new Goddo().delete('/user/:id', ({ params }) => ({ deleted: params.id }))
  const { baseUrl, stop } = startServer(app)

  try {
    const client = treaty<typeof app>(baseUrl)
    const { data, error, status } = await client.user({ id: '3' }).delete()

    if (error) throw error
    if (status !== 200) throw new Error(`Expected 200, got ${status}`)
    if ((data as { deleted: string }).deleted !== '3') {
      throw new Error(`Unexpected: ${JSON.stringify(data)}`)
    }
  } finally {
    await stop()
  }
})

Deno.test('treaty: 4xx error returns structured error', async () => {
  const app = new Goddo().get('/secret', ({ error }) => {
    throw error(401, 'Unauthorized')
  })
  const { baseUrl, stop } = startServer(app)

  try {
    const client = treaty<typeof app>(baseUrl)
    const { data, error: err, status } = await client.secret.get()

    if (data !== null) throw new Error('Expected data=null on error')
    if (!err) throw new Error('Expected error to be set')
    if (status !== 401) throw new Error(`Expected status 401, got ${status}`)
  } finally {
    await stop()
  }
})

Deno.test('treaty: global default headers', async () => {
  const app = new Goddo().get('/check', ({ headers }) => ({
    key: headers['x-api-key'],
  }))
  const { baseUrl, stop } = startServer(app)

  try {
    const client = treaty<typeof app>(baseUrl, {
      headers: { 'x-api-key': 'global-secret' },
    })
    const { data, error } = await client.check.get()

    if (error) throw error
    if ((data as { key: string }).key !== 'global-secret') {
      throw new Error(`Unexpected header value: ${JSON.stringify(data)}`)
    }
  } finally {
    await stop()
  }
})

Deno.test('treaty: per-request headers override global', async () => {
  const app = new Goddo().get('/check', ({ headers }) => ({
    key: headers['x-api-key'],
  }))
  const { baseUrl, stop } = startServer(app)

  try {
    const client = treaty<typeof app>(baseUrl, {
      headers: { 'x-api-key': 'global' },
    })
    const { data, error } = await client.check.get({
      headers: { 'x-api-key': 'per-request' },
    })

    if (error) throw error
    if ((data as { key: string }).key !== 'per-request') {
      throw new Error(`Expected 'per-request', got: ${JSON.stringify(data)}`)
    }
  } finally {
    await stop()
  }
})

Deno.test('treaty: typed plugin routes are accessible', async () => {
  // Simulate a typed plugin
  const userPlugin = new Goddo()
    .get('/users', () => [{ id: 1 }])
    .post('/users', ({ body }) => body, {
      body: t.Object({ name: t.String() }),
    })

  const app = new Goddo().use(userPlugin).get('/health', () => 'ok')
  const { baseUrl, stop } = startServer(app)

  try {
    const client = treaty<typeof app>(baseUrl)
    const { data: list, error: e1 } = await client.users.get()
    if (e1) throw e1

    const { data: created, error: e2 } = await client.users.post({
      body: { name: 'Test' },
    })
    if (e2) throw e2
    if ((created as { name: string }).name !== 'Test') {
      throw new Error(`Unexpected: ${JSON.stringify(created)}`)
    }

    const { data: health } = await client.health.get()
    if (health !== 'ok') throw new Error('health check failed')

    // suppress unused warning
    void list
  } finally {
    await stop()
  }
})
