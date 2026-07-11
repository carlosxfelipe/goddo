import { Layout } from '../components/layout.tsx'
import { Code } from '../components/code.tsx'

type Plugin = {
  id: string
  name: string
  pkg: string
  icon: string
  summary: string
  setup?: string
  example: string
  notes?: string
}

const PLUGINS: Plugin[] = [
  {
    id: 'html',
    name: 'HTML SSR',
    pkg: '@goddo/html',
    icon: 'ph-code',
    summary:
      'Zero-build Server-Side Rendering by compiling TSX natively. Acts as a custom JSX runtime (equivalent to @elysiajs/html), converting JSX elements and Async Components directly to HTML strings, with built-in XSS protection.',
    setup: `{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@goddo/html"
  }
}`,
    example: `import { Goddo } from '@goddo/core'
import { html } from '@goddo/html'

const UserProfile = async ({ id }: { id: string }) => {
  const data = await db.getUser(id)
  return <div>{data.name}</div>
}

new Goddo()
  .use(html())
  .get('/page', () => (
    <html lang='en'>
      <body>
        <h1>Hello Goddo TSX! 🦕</h1>
        <p>Safe: {'<script>alert(1)</script>'}</p>
        <UserProfile id='42' />
      </body>
    </html>
  ))
  .listen(3000)`,
  },
  {
    id: 'openapi',
    name: 'OpenAPI',
    pkg: '@goddo/openapi',
    icon: 'ph-file-text',
    summary:
      'Equivalent to @elysiajs/swagger: generates OpenAPI 3.0.3 from routes and t schemas, serving the modern Scalar UI (default) or the classic Swagger UI.',
    example: `import { Goddo, t } from '@goddo/core'
import { openapi } from '@goddo/openapi'

new Goddo()
  .use(openapi({
    provider: 'swagger-ui', // optional, default is 'scalar'
    documentation: { info: { title: 'My API', version: '1.0.0' } },
  }))
  .get('/user/:id', ({ params: { id } }) => id, {
    params: t.Object({ id: t.Numeric() }),
    detail: { summary: 'Fetch user', tags: ['user'] },
  })
  .listen(3000)
// UI:   GET /docs
// Spec: GET /docs/json`,
    notes:
      "Options: path (default '/docs'), provider ('scalar' | 'swagger-ui'), documentation (base OpenAPI document), detail per route (summary, description, tags, hide, ...), exclude (paths excluded from spec), bearerAuth (JWT config shortcut), scalarConfig and version (CDN version).",
  },
  {
    id: 'static',
    name: 'Static Files',
    pkg: '@goddo/static',
    icon: 'ph-folder-simple',
    summary:
      'Serves static files from a local directory, with automatic MIME type detection, range request support, cache headers, and path-traversal protection.',
    example: `import { Goddo } from '@goddo/core'
import { staticPlugin } from '@goddo/static'

new Goddo()
  .use(staticPlugin({
    assets: './public', // directory to serve (default: 'public')
    prefix: '/static', // URL prefix (default: '/public')
    maxAge: 86400, // Cache-Control max-age in seconds
    // noCache: true, // send Cache-Control: no-store instead
    // indexHTML: 'index.html', // served at directory roots
    // headers: { 'X-Powered-By': 'Goddo' }, // extra response headers
  }))
  .listen(3000)
// GET /static/logo.png → ./public/logo.png`,
  },
  {
    id: 'jwt',
    name: 'JWT',
    pkg: '@goddo/jwt',
    icon: 'ph-key',
    summary:
      'Zero-dependency JWT plugin built on the Web Crypto API (HS256/HS384/HS512). Injects a jwt object into the context with sign and verify.',
    example: `import { Goddo } from '@goddo/core'
import { jwt } from '@goddo/jwt'

new Goddo()
  .use(jwt({
    secret: Deno.env.get('JWT_SECRET')!,
    alg: 'HS256', // default
    exp: 604800, // optional default expiration: 7 days (seconds)
    // name: 'jwt', // key injected into context (default: 'jwt')
  }))
  .post('/login', async ({ jwt, body }) => ({
    token: await jwt.sign({ sub: body.userId, role: 'user' }),
  }))
  .get('/me', async ({ jwt, headers, error }) => {
    const token = headers.authorization?.replace('Bearer ', '')
    const payload = await jwt.verify(token ?? '')
    if (!payload) throw error(401, 'Unauthorized')
    return payload
  })
  .listen(3000)`,
    notes:
      'jwt.sign(payload) returns a JWT string. jwt.verify(token) returns the payload object or false when the token is invalid or expired.',
  },
  {
    id: 'bearer',
    name: 'Bearer',
    pkg: '@goddo/bearer',
    icon: 'ph-identification-badge',
    summary:
      'Extracts the token following RFC 6750: first from the Authorization: Bearer <token> header, with fallback to the access_token query param. Injected into the context as bearer.',
    example: `import { Goddo } from '@goddo/core'
import { bearer } from '@goddo/bearer'

new Goddo()
  .use(bearer())
  .get('/protected', ({ bearer }) => bearer, {
    beforeHandle({ bearer, set }) {
      if (!bearer) {
        set.status = 401
        set.headers['www-authenticate'] = 'Bearer realm="sign"'
        return 'Unauthorized'
      }
    },
  })
  .listen(3000)`,
  },
  {
    id: 'cors',
    name: 'CORS',
    pkg: '@goddo/cors',
    icon: 'ph-globe',
    summary:
      'Configurable Cross-Origin Resource Sharing: origin, methods, headers, credentials, and preflight cache.',
    example: `import { Goddo } from '@goddo/core'
import { cors } from '@goddo/cors'

new Goddo()
  .use(cors({ origin: true, credentials: true }))
  .listen(3000)`,
  },
  {
    id: 'rate-limit',
    name: 'Rate Limit',
    pkg: '@goddo/rate-limit',
    icon: 'ph-timer',
    summary:
      'Protects endpoints from abuse by limiting requests per IP address. Goddo automatically captures the client IP via Deno.ServeHandlerInfo.',
    example: `import { rateLimit } from '@goddo/rate-limit'

app.use(rateLimit({ max: 100, windowMs: 60000 })) // 100 req/min`,
  },
  {
    id: 'shield',
    name: 'Shield',
    pkg: '@goddo/shield',
    icon: 'ph-shield-check',
    summary:
      'Automatically injects standard HTTP security headers, such as X-Frame-Options, X-Content-Type-Options, and Strict-Transport-Security.',
    example: `import { shield } from '@goddo/shield'

app.use(shield())`,
  },
  {
    id: 'csrf',
    name: 'CSRF',
    pkg: '@goddo/csrf',
    icon: 'ph-lock-key',
    summary:
      'Implements the Double Submit Cookie pattern to protect state-mutating endpoints from CSRF.',
    example: `import { csrf } from '@goddo/csrf'

app.use(csrf())`,
  },
  {
    id: 'cron',
    name: 'Cron',
    pkg: '@goddo/cron',
    icon: 'ph-clock',
    summary:
      'Zero-dependency background task scheduling, with its own cron pattern parser (5 or 6 fields, lists, ranges, and steps).',
    example: `import { Goddo } from '@goddo/core'
import { cron } from '@goddo/cron'

new Goddo()
  .use(
    cron({
      name: 'heartbeat',
      pattern: '0-59/10 * * * * *', // every 10 seconds
      run() {
        console.log('Heartbeat')
      },
    }),
  )
  .get('/stop', ({ store }) => {
    store.cron.heartbeat.stop()
    return 'Stopped'
  })
  .listen(3000)`,
  },
  {
    id: 'server-timing',
    name: 'Server Timing',
    pkg: '@goddo/server-timing',
    icon: 'ph-chart-line',
    summary:
      'Measures the duration of each request lifecycle phase and reports it in the Server-Timing header, visible in the browser DevTools.',
    example: `import { Goddo } from '@goddo/core'
import { serverTiming } from '@goddo/server-timing'

new Goddo()
  .use(serverTiming())
  .get('/', () => 'Hello')
  .listen(3000)`,
  },
  {
    id: 'llms-txt',
    name: 'AI Docs (llms.txt)',
    pkg: '@goddo/llms-txt',
    icon: 'ph-robot',
    summary:
      'Generates an /llms.txt endpoint reusing the route tree and TypeBox schemas to produce LLM-friendly Markdown documentation for AI agents and LLMs.',
    example: `import { Goddo, t } from '@goddo/core'
import { llmstxt } from '@goddo/llms-txt'

new Goddo()
  .use(llmstxt({
    title: 'My Custom API',
    description: 'Documentation optimized for LLMs',
    exclude: ['/docs', '/docs/json'],
  }))
  .get('/user/:id', ({ params: { id } }) => id, {
    params: t.Object({ id: t.Numeric({ description: 'User ID' }) }),
    detail: { summary: 'Fetch user' },
  })
  .listen(3000)
// AI Docs: GET /llms.txt`,
    notes:
      "Options: path (default '/llms.txt'), title, description, and exclude (paths excluded from spec).",
  },
  {
    id: 'treaty',
    name: 'Treaty (client)',
    pkg: '@goddo/treaty',
    icon: 'ph-arrows-left-right',
    summary:
      "End-to-end type-safe HTTP client generated at compile time from the app's route types — equivalent to Elysia Eden. No code generation: everything is inferred via TypeScript generics and a runtime Proxy.",
    example: `import { treaty } from '@goddo/treaty'
import type { App } from './server.ts'

const client = treaty<App>('http://localhost:3000')

// GET /user/1
const { data, error } = await client.user({ id: '1' }).get()

// POST /user (body type enforced by the route schema)
const { data: created } = await client.user.post({
  body: { name: 'Carlos', age: 25 },
})`,
  },
]

export function renderPlugins() {
  return Layout({
    title: 'Plugins',
    description: 'All official Goddo plugins, with usage examples.',
    active: '/plugins',
    children: (
      <>
        <h1 style='display: flex; align-items: center; gap: 0.5rem;'>
          <i class='ph ph-puzzle-piece' style='color: var(--pico-primary);'></i> Plugins
        </h1>
        <p style='color: var(--pico-muted-color);'>
          Install only the plugins you need to keep your server lightweight. All are published on
          {' '}
          <a
            href='https://jsr.io/@goddo'
            target='_blank'
            rel='noopener'
            style='text-decoration: none;'
          >
            JSR
          </a>{' '}
          under the <code>@goddo</code> scope.
        </p>
        <Code lang='sh'>{`deno add jsr:@goddo/core jsr:@goddo/html jsr:@goddo/cors`}</Code>

        {PLUGINS.map((p) => (
          <article id={p.id} style='margin-top: 1.5rem;'>
            <header style='display: flex; align-items: center; justify-content: space-between; gap: 1rem;'>
              <h2 style='display: flex; align-items: center; gap: 0.5rem; margin: 0;'>
                <i class={`ph ${p.icon}`} style='color: var(--pico-primary);'></i> {p.name}
              </h2>
              <span class='badge'>{p.pkg}</span>
            </header>
            <p style='color: var(--pico-muted-color);'>{p.summary}</p>
            <Code lang='sh'>{`deno add jsr:${p.pkg}`}</Code>
            {p.setup && (
              <>
                <p>
                  Ensure Deno uses the custom JSX compiler (<code>deno.json</code>):
                </p>
                <Code lang='json'>{p.setup}</Code>
              </>
            )}
            <Code lang='ts'>{p.example}</Code>
            {p.notes && <p style='color: var(--pico-muted-color);'>{p.notes}</p>}

            {p.id === 'treaty' && (
              <>
                <h3>Path Mapping</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Route</th>
                      <th>Treaty call</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <code>GET /</code>
                      </td>
                      <td>
                        <code>client.get()</code>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <code>GET /user</code>
                      </td>
                      <td>
                        <code>client.user.get()</code>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <code>POST /user</code>
                      </td>
                      <td>
                        <code>client.user.post({'{'} body: ... {'}'})</code>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <code>GET /user/:id</code>
                      </td>
                      <td>
                        <code>client.user({'{'} id: '1' {'}'}).get()</code>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <code>GET /user/:id/posts</code>
                      </td>
                      <td>
                        <code>client.user({'{'} id: '1' {'}'}).posts.get()</code>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <code>GET /api/v1/status</code>
                      </td>
                      <td>
                        <code>client.api.v1.status.get()</code>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div class='callout callout-note'>
                  <div class='callout-title'>
                    <i class='ph ph-info'></i> Coming from Elysia Eden?
                  </div>
                  <p>
                    Note two small syntax differences for better TypeScript predictability:
                  </p>
                  <ol>
                    <li>
                      The root path (<code>/</code>) is called directly on the client (
                      <code>client.get()</code>), not via <code>client.index.get()</code>.
                    </li>
                    <li>
                      Request payloads must be explicitly wrapped in a <code>body</code> key (e.g.,
                      {' '}
                      <code>.post({'{'} body: {'{'} ... {'}'} {'}'})</code>), keeping them neatly
                      separated from <code>query</code> and <code>headers</code>.
                    </li>
                  </ol>
                </div>

                <div class='callout callout-warning'>
                  <div class='callout-title'>
                    <i class='ph ph-warning'></i> Reserved Path Segments
                  </div>
                  <p>
                    Because Goddo Treaty exposes HTTP methods directly at each level (e.g.{' '}
                    <code>client.get()</code>), path segments matching HTTP methods ({' '}
                    <code>get</code>, <code>post</code>, <code>put</code>, <code>delete</code>,{' '}
                    <code>patch</code>, <code>head</code>, <code>options</code>,{' '}
                    <code>subscribe</code>) are reserved. Creating a route like{' '}
                    <code>.get('/api/get/users', ...)</code> would silently collide with the{' '}
                    <code>.get()</code> proxy method. To prevent this,{' '}
                    <strong>Goddo enforces a compile-time type error</strong>{' '}
                    if you attempt to register a route containing a reserved segment.
                  </p>
                </div>

                <h3>Response Shape</h3>
                <p>
                  Every call returns{' '}
                  <code>Promise&lt;{'{'} data, error, status, headers, response {'}'}&gt;</code>:
                </p>
                <Code lang='ts'>
                  {`const { data, error, status } = await client.user.get()

if (error) {
  console.error(error.message, status) // error is an Error instance
} else {
  console.log(data) // typed as the route's return type
}`}
                </Code>

                <h3>Global Options</h3>
                <Code lang='ts'>
                  {`const client = treaty<App>('http://localhost:3000', {
  headers: { Authorization: 'Bearer token' }, // merged into every request
})`}
                </Code>

                <h3>WebSocket</h3>
                <Code lang='ts'>
                  {`const ws = client.chat.subscribe()
ws.onmessage = (e) => console.log(e.data)`}
                </Code>
              </>
            )}
          </article>
        ))}
      </>
    ),
  })
}
