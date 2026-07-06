import { Goddo } from 'goddo'
import { staticPlugin } from '../lib/plugins/static.ts'
import { fromFileUrl } from 'jsr:@std/path@1.1.6'

// Fixture directory committed to the repo — no write permission needed.
const FIXTURES = fromFileUrl(new URL('./fixtures/static', import.meta.url))

const req = (app: Goddo, path: string, init?: RequestInit) =>
  app.handle(new Request(`http://localhost${path}`, init))

// ─── Tests ───────────────────────────────────────────────────────────────────

Deno.test('Static plugin serves a file', async () => {
  const app = new Goddo().use(staticPlugin({ assets: FIXTURES, prefix: '/static' }))

  const res = await req(app, '/static/style.css')
  if (res.status !== 200) throw new Error(`status ${res.status}`)
  if (!res.headers.get('content-type')?.includes('text/css')) {
    throw new Error(`wrong content-type: ${res.headers.get('content-type')}`)
  }
  const body = await res.text()
  if (!body.includes('color: red')) throw new Error('wrong body')
})

Deno.test('Static plugin serves JSON with correct MIME type', async () => {
  const app = new Goddo().use(staticPlugin({ assets: FIXTURES, prefix: '/static' }))

  const res = await req(app, '/static/data.json')
  if (res.status !== 200) throw new Error(`status ${res.status}`)
  if (!res.headers.get('content-type')?.includes('application/json')) {
    throw new Error('wrong content-type for json')
  }
  await res.body?.cancel()
})

Deno.test('Static plugin returns 404 for missing file', async () => {
  const app = new Goddo().use(staticPlugin({ assets: FIXTURES, prefix: '/static' }))

  const res = await req(app, '/static/missing.txt')
  if (res.status !== 404) throw new Error(`expected 404, got ${res.status}`)
  await res.body?.cancel()
})

Deno.test('Static plugin serves file in sub-directory', async () => {
  const app = new Goddo().use(staticPlugin({ assets: FIXTURES, prefix: '/static' }))

  const res = await req(app, '/static/sub/page.html')
  if (res.status !== 200) throw new Error(`status ${res.status}`)
  const body = await res.text()
  if (!body.includes('<p>sub</p>')) throw new Error('wrong body')
})

Deno.test('Static plugin adds Cache-Control header', async () => {
  const app = new Goddo().use(staticPlugin({ assets: FIXTURES, prefix: '/static', maxAge: 3600 }))

  const res = await req(app, '/static/style.css')
  const cc = res.headers.get('cache-control')
  if (!cc?.includes('max-age=3600')) throw new Error(`bad cache-control: ${cc}`)
  await res.body?.cancel()
})

Deno.test('Static plugin noCache sends no-store', async () => {
  const app = new Goddo().use(staticPlugin({ assets: FIXTURES, prefix: '/static', noCache: true }))

  const res = await req(app, '/static/style.css')
  const cc = res.headers.get('cache-control')
  if (cc !== 'no-store') throw new Error(`bad cache-control: ${cc}`)
  await res.body?.cancel()
})

Deno.test('Static plugin adds extra custom headers', async () => {
  const app = new Goddo().use(
    staticPlugin({ assets: FIXTURES, prefix: '/static', headers: { 'x-custom': 'goddo' } }),
  )

  const res = await req(app, '/static/style.css')
  if (res.headers.get('x-custom') !== 'goddo') throw new Error('missing custom header')
  await res.body?.cancel()
})

Deno.test('Static plugin path traversal is blocked', async () => {
  const app = new Goddo().use(staticPlugin({ assets: FIXTURES, prefix: '/static' }))

  // Attempt to escape the assets directory
  const res = await req(app, '/static/../../etc/passwd')
  // Must never serve sensitive files — either 404 or safe content only
  if (res.status === 200) {
    const body = await res.text()
    if (body.includes('root:')) throw new Error('Path traversal succeeded!')
  }
  await res.body?.cancel()
})

Deno.test('Static plugin serves index.html for directory path', async () => {
  const app = new Goddo().use(staticPlugin({ assets: FIXTURES, prefix: '/static' }))

  const res = await req(app, '/static/')
  if (res.status !== 200) throw new Error(`status ${res.status}`)
  const body = await res.text()
  if (!body.includes('Hello')) throw new Error('wrong body for index.html')
})

Deno.test('Static plugin returns 404 for directory without index.html', async () => {
  const app = new Goddo().use(staticPlugin({ assets: FIXTURES, prefix: '/static' }))

  // /static/sub/ does not have index.html
  const res = await req(app, '/static/sub/')
  if (res.status !== 404) throw new Error(`expected 404, got ${res.status}`)
  await res.body?.cancel()
})

Deno.test('Static plugin supports Range requests', async () => {
  const app = new Goddo().use(staticPlugin({ assets: FIXTURES, prefix: '/static' }))

  // Request from byte 5 to the end
  const res = await req(app, '/static/data.json', {
    headers: { 'range': 'bytes=5-' },
  })

  if (res.status !== 206) throw new Error(`expected 206 Partial Content, got ${res.status}`)
  if (res.headers.get('content-length') !== '10') {
    throw new Error(`expected content-length 10, got ${res.headers.get('content-length')}`)
  }
  if (!res.headers.get('content-range')?.startsWith('bytes 5-14/15')) {
    throw new Error('wrong content-range header')
  }

  const body = await res.text()
  if (body.length !== 10) throw new Error(`expected 10 bytes, got ${body.length}`)
})

Deno.test('Static plugin falls back to application/octet-stream for unknown extension', async () => {
  const app = new Goddo().use(staticPlugin({ assets: FIXTURES, prefix: '/static' }))

  const res = await req(app, '/static/file.unknown')
  if (res.status !== 200) throw new Error(`status ${res.status}`)
  if (res.headers.get('content-type') !== 'application/octet-stream') {
    throw new Error(`wrong content-type: ${res.headers.get('content-type')}`)
  }
  const body = await res.text()
  if (body.trim() !== 'hello unknown') throw new Error('wrong body')
})
