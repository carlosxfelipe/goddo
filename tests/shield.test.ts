import { Goddo } from '../lib/index.ts'
import { shield } from '../lib/plugins/shield.ts'

const req = (app: Goddo, path: string) => app.handle(new Request(`http://localhost${path}`))

Deno.test('shield: injects default security headers', async () => {
  const app = new Goddo()
    .use(shield())
    .get('/', () => 'ok')

  const res = await req(app, '/')
  const h = res.headers

  if (h.get('x-xss-protection') !== '1; mode=block') throw new Error('missing x-xss-protection')
})

Deno.test('shield: overrides default headers with options', async () => {
  const app = new Goddo()
    .use(shield({
      xFrameOptions: 'DENY',
      xContentTypeOptions: false,
    }))
    .get('/', () => 'ok')

  const res = await req(app, '/')
  const h = res.headers

  if (h.get('x-frame-options') !== 'DENY') throw new Error('override failed')
  if (h.get('x-content-type-options') !== null) throw new Error('should be removed')
})
