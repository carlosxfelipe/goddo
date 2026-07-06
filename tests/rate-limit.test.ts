import { Goddo } from '../lib/index.ts'
import { rateLimit } from '../lib/plugins/rate-limit.ts'

const req = (app: Goddo, path: string, init?: RequestInit) =>
  app.handle(new Request(`http://localhost${path}`, init), {
    remoteAddr: { transport: 'tcp', hostname: '127.0.0.1', port: 1234 },
  } as Deno.ServeHandlerInfo)

Deno.test('rateLimit: allows requests within limit', async () => {
  const app = new Goddo()
    .use(rateLimit({ max: 3, windowMs: 1000 }))
    .get('/', () => 'ok')

  let res = await req(app, '/')
  if (res.status !== 200) throw new Error('expected 200')
  if (res.headers.get('x-ratelimit-remaining') !== '2') {
    throw new Error(`wrong remaining, got: ${res.headers.get('x-ratelimit-remaining')}`)
  }

  res = await req(app, '/')
  if (res.status !== 200) throw new Error('expected 200')
  if (res.headers.get('x-ratelimit-remaining') !== '1') {
    throw new Error(`wrong remaining, got: ${res.headers.get('x-ratelimit-remaining')}`)
  }
})

Deno.test('rateLimit: blocks requests exceeding limit', async () => {
  const app = new Goddo()
    .use(rateLimit({ max: 2, windowMs: 1000 }))
    .get('/', () => 'ok')

  await req(app, '/') // remaining: 1
  await req(app, '/') // remaining: 0

  const res = await req(app, '/') // should block
  if (res.status !== 429) throw new Error('expected 429')
  const body = await res.text()
  if (body !== 'Too Many Requests') throw new Error(`wrong body, got: ${body}`)
  if (res.headers.get('x-ratelimit-remaining') !== '0') throw new Error('wrong remaining header')
})
