import { Goddo } from 'goddo'
import { serverTiming } from '@goddo/server-timing'

Deno.test('server-timing: adds Server-Timing header with all metrics', async () => {
  const app = new Goddo()
    .use(serverTiming())
    .get('/', () => 'ok')

  const res = await app.handle(new Request('http://localhost/'))
  await res.text()

  const header = res.headers.get('server-timing')
  if (!header) throw new Error('Missing Server-Timing header')
  for (const metric of ['parse;dur=', 'handle;dur=', 'total;dur=']) {
    if (!header.includes(metric)) {
      throw new Error(`Expected metric "${metric}" in header: ${header}`)
    }
  }
})

Deno.test('server-timing: total duration reflects handler latency', async () => {
  const app = new Goddo()
    .use(serverTiming())
    .get('/slow', async () => {
      await new Promise((r) => setTimeout(r, 50))
      return 'slow'
    })

  const res = await app.handle(new Request('http://localhost/slow'))
  await res.text()

  const header = res.headers.get('server-timing')!
  const total = Number(header.match(/total;dur=([\d.]+)/)?.[1])
  if (!(total >= 45)) {
    throw new Error(`Expected total >= 45ms, got ${total}ms (header: ${header})`)
  }
})

Deno.test('server-timing: enabled: false disables the plugin', async () => {
  const app = new Goddo()
    .use(serverTiming({ enabled: false }))
    .get('/', () => 'ok')

  const res = await app.handle(new Request('http://localhost/'))
  await res.text()

  if (res.headers.get('server-timing')) {
    throw new Error('Server-Timing header should not be present')
  }
})

Deno.test('server-timing: allow gate controls emission per request', async () => {
  const app = new Goddo()
    .use(serverTiming({ allow: ({ headers }) => headers['x-debug'] === '1' }))
    .get('/', () => 'ok')

  const denied = await app.handle(new Request('http://localhost/'))
  await denied.text()
  if (denied.headers.get('server-timing')) {
    throw new Error('Header should be absent without x-debug')
  }

  const allowed = await app.handle(
    new Request('http://localhost/', { headers: { 'x-debug': '1' } }),
  )
  await allowed.text()
  if (!allowed.headers.get('server-timing')) {
    throw new Error('Header should be present with x-debug: 1')
  }
})

Deno.test('server-timing: works with POST body parsing', async () => {
  const app = new Goddo()
    .use(serverTiming())
    .post('/mirror', ({ body }) => body)

  const res = await app.handle(
    new Request('http://localhost/mirror', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ a: 1 }),
    }),
  )
  await res.text()

  const header = res.headers.get('server-timing')
  if (!header?.includes('total;dur=')) {
    throw new Error(`Missing timing on POST: ${header}`)
  }
})

Deno.test('server-timing: preserves existing server-timing values', async () => {
  const app = new Goddo()
    .use(serverTiming())
    .get('/', ({ set }) => {
      set.headers['server-timing'] = 'db;dur=12.00'
      return 'ok'
    })

  const res = await app.handle(new Request('http://localhost/'))
  await res.text()

  const header = res.headers.get('server-timing')!
  if (!header.startsWith('db;dur=12.00')) {
    throw new Error(`Existing metric lost: ${header}`)
  }
  if (!header.includes('total;dur=')) {
    throw new Error(`Plugin metrics missing: ${header}`)
  }
})

Deno.test('server-timing: works in compiled (listen) mode', async () => {
  const app = new Goddo()
    .use(serverTiming())
    .get('/', () => 'compiled')
  app.listen(4322)

  try {
    const res = await fetch('http://localhost:4322/')
    await res.text()
    const header = res.headers.get('server-timing')
    if (!header?.includes('total;dur=')) {
      throw new Error(`Missing header in compiled mode: ${header}`)
    }
  } finally {
    await app.stop()
  }
})
