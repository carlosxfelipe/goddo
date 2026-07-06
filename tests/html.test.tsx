import { Goddo } from '@goddo/core'
import { html } from '@goddo/html'

Deno.test('HTML Plugin - Renders static JSX', async () => {
  const app = new Goddo()
    .use(html())
    .get('/static', () => (
      <div id='test' class='primary'>
        Hello World
      </div>
    ))

  const res = await app.handle(new Request('http://localhost/static'))
  if (res.status !== 200) throw new Error('status not 200')
  if (res.headers.get('content-type') !== 'text/html;charset=utf-8') {
    throw new Error('wrong content-type')
  }

  const text = await res.text()
  if (!text.includes('<div id="test" class="primary">')) throw new Error('missing div')
  if (!text.includes('Hello World')) throw new Error('missing text')
})

Deno.test('HTML Plugin - Auto escapes string values to prevent XSS', async () => {
  const dangerousInput = '<script>alert(1)</script>'

  const app = new Goddo()
    .use(html())
    .get('/xss', () => (
      <div>
        <p>{dangerousInput}</p>
      </div>
    ))

  const res = await app.handle(new Request('http://localhost/xss'))
  const text = await res.text()

  if (!text.includes('&lt;script&gt;alert(1)&lt;/script&gt;')) throw new Error('XSS not escaped')
})

Deno.test('HTML Plugin - Supports Async Components effortlessly', async () => {
  const AsyncComp = async ({ name }: { name: string }) => {
    // Simulate database call or fetch
    await new Promise((resolve) => setTimeout(resolve, 5))
    return <h1>{name}</h1>
  }

  const app = new Goddo()
    .use(html())
    .get('/async', () => (
      <html>
        <body>
          <AsyncComp name='Carlos' />
        </body>
      </html>
    ))

  const res = await app.handle(new Request('http://localhost/async'))
  if (res.status !== 200) throw new Error('status not 200')

  const text = await res.text()
  if (!text.includes('<html>')) throw new Error('missing html')
  if (!text.includes('<h1>Carlos</h1>')) throw new Error('missing h1')
  if (!text.includes('</html>')) throw new Error('missing end html')
})
