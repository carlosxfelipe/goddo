import { Goddo } from 'goddo'
import { cors } from '../lib/plugins/cors.ts'

const req = (app: Goddo, path: string, init?: RequestInit) =>
  app.handle(new Request(`http://localhost${path}`, init))

Deno.test('CORS plugin sets default headers', async () => {
  const app = new Goddo().use(cors()).get('/', () => 'ok')
  const res = await req(app, '/')

  if (res.headers.get('Access-Control-Allow-Origin') !== '*') throw new Error('missing origin')
  if (res.headers.get('Access-Control-Allow-Methods') !== '*') throw new Error('missing methods')
  if (res.headers.get('Access-Control-Allow-Headers') !== '*') {
    throw new Error('missing allow headers')
  }
  await res.body?.cancel()
})

Deno.test('CORS plugin intercepts OPTIONS with 204', async () => {
  const app = new Goddo().use(cors()).get('/', () => 'ok')
  const res = await req(app, '/', { method: 'OPTIONS' })

  if (res.status !== 204) throw new Error(`status ${res.status}`)
  if (res.headers.get('Access-Control-Allow-Origin') !== '*') throw new Error('missing origin')
  await res.body?.cancel()
})

Deno.test('CORS handles array origin', async () => {
  const app = new Goddo()
    .use(cors({ origin: ['https://a.com', 'https://b.com'] }))
    .get('/', () => 'ok')

  const res1 = await req(app, '/', { headers: { origin: 'https://a.com' } })
  if (res1.headers.get('Access-Control-Allow-Origin') !== 'https://a.com') {
    throw new Error('failed a')
  }
  await res1.body?.cancel()

  const res2 = await req(app, '/', { headers: { origin: 'https://c.com' } })
  if (res2.headers.get('Access-Control-Allow-Origin') !== null) throw new Error('should deny c')
  await res2.body?.cancel()
})

Deno.test('CORS handles boolean origin (reflect)', async () => {
  const app = new Goddo().use(cors({ origin: true })).get('/', () => 'ok')
  const res = await req(app, '/', { headers: { origin: 'https://x.com' } })

  if (res.headers.get('Access-Control-Allow-Origin') !== 'https://x.com') {
    throw new Error('failed true')
  }
  await res.body?.cancel()
})

Deno.test('CORS adds Vary: Origin when dynamic', async () => {
  const app = new Goddo().use(cors({ origin: true })).get('/', () => 'ok')
  const res = await req(app, '/', { headers: { origin: 'https://y.com' } })

  if (res.headers.get('Vary') !== 'Origin') throw new Error('missing Vary')
  await res.body?.cancel()
})

Deno.test('CORS custom headers', async () => {
  const app = new Goddo()
    .use(
      cors({
        methods: 'GET, POST',
        credentials: true,
        exposedHeaders: 'X-Custom',
        maxAge: 3600,
      }),
    )
    .get('/', () => 'ok')

  const res = await req(app, '/')
  if (res.headers.get('Access-Control-Allow-Methods') !== 'GET, POST') throw new Error('methods')
  if (res.headers.get('Access-Control-Allow-Credentials') !== 'true') throw new Error('credentials')
  if (res.headers.get('Access-Control-Expose-Headers') !== 'X-Custom') {
    throw new Error('expose')
  }
  if (res.headers.get('Access-Control-Max-Age') !== '3600') throw new Error('maxAge')
  await res.body?.cancel()
})
