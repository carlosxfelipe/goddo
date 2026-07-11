import { Layout } from '../components/layout.tsx'
import { Code } from '../components/code.tsx'

type Section = { id: string; title: string; icon: string }

const SECTIONS: Section[] = [
  { id: 'syntax', title: 'Syntax', icon: 'ph-code' },
  { id: 'validation', title: 'Validation (t)', icon: 'ph-check-circle' },
  { id: 'cookies', title: 'Cookies', icon: 'ph-cookie' },
  { id: 'guard', title: 'Guard', icon: 'ph-shield' },
  { id: 'derive-resolve', title: 'Derive & Resolve', icon: 'ph-arrows-split' },
  { id: 'macro', title: 'Macro', icon: 'ph-magic-wand' },
  { id: 'websockets', title: 'WebSockets', icon: 'ph-plugs-connected' },
  { id: 'lifecycle', title: 'Lifecycle', icon: 'ph-repeat' },
  { id: 'performance', title: 'Performance (AOT)', icon: 'ph-gauge' },
]

function Sidebar() {
  return (
    <aside class='docs-sidebar'>
      <strong>On this page</strong>
      <ul>
        {SECTIONS.map((s) => (
          <li>
            <a href={`#${s.id}`}>
              <i class={`ph ${s.icon}`}></i> {s.title}
            </a>
          </li>
        ))}
      </ul>
    </aside>
  )
}

export function renderDocs() {
  return Layout({
    title: 'Docs',
    description:
      'Full Goddo documentation: syntax, validation, cookies, guard, macros, WebSockets, and more.',
    active: '/docs',
    children: (
      <>
        <h1 style='display: flex; align-items: center; gap: 0.5rem;'>
          <i class='ph ph-book-open-text' style='color: var(--pico-primary);'></i> Documentation
        </h1>
        <p style='color: var(--pico-muted-color);'>
          Complete Goddo API reference, with practical examples for every feature of the core
          (<code>@goddo/core</code>).
        </p>

        <div class='docs-layout'>
          <Sidebar />

          <div>
            <section id='syntax'>
              <h2>Syntax (Elysia-compatible)</h2>
              <Code lang='ts'>
                {`new Goddo()
  .state('version', '1.0') // shared state
  .decorate('logger', console.log) // decorates the context
  .onRequest(({ path }) => console.log(path)) // lifecycle hook
  .get('/', () => 'text') // text/plain
  .get('/json', () => ({ ok: true })) // application/json (auto)
  .get('/user/:id', ({ params: { id } }) => id) // route params
  .get('/files/*', ({ params }) => params['*']) // wildcard
  .get('/q', ({ query }) => query) // query string
  .post('/body', ({ body }) => body) // automatic body parse
  .get('/error', ({ error }) => {
    throw error(418)
  })
  .get('/go', ({ redirect }) => redirect('/'))
  .group('/api', (app) => app.get('/health', () => 'ok'))
  .use(plugin) // plugin composition
  .onError(({ code }) => code === 'NOT_FOUND' ? 'Not found' : 'Error')
  .listen(3000)`}
              </Code>
            </section>

            <section id='validation'>
              <h2>
                Validation (<code>t</code> module)
              </h2>
              <p>
                TypeBox-style schemas for <code>body</code>, <code>query</code>,{' '}
                <code>params</code>, <code>headers</code>, and{' '}
                <code>response</code>, featuring end-to-end type inference in the handler and
                automatic coercion in{' '}
                <code>query</code>/<code>params</code>/<code>headers</code>. Invalid inputs return
                {' '}
                <code>422</code> (error code <code>VALIDATION</code> in <code>onError</code>).
              </p>
              <Code lang='ts'>
                {`import { Goddo, t } from '@goddo/core'

new Goddo()
  .post('/user', ({ body }) => body.name, { // body: { name: string; age: number }
    body: t.Object({ name: t.String(), age: t.Number() }),
  })
  .get('/user/:id', ({ params: { id } }) => id * 2, { // id: number (coerced from URL)
    params: t.Object({ id: t.Numeric() }),
  })
  .get('/list', ({ query }) => query, {
    query: t.Object({
      page: t.Numeric({ default: 1 }),
      active: t.Optional(t.Boolean()),
    }),
  })
  .listen(3000)`}
              </Code>
              <p>
                Available builders: <code>t.String</code> (<code>minLength</code>,{' '}
                <code>maxLength</code>, <code>pattern</code>, <code>format</code>),{' '}
                <code>t.Number</code>/<code>t.Integer</code> (<code>minimum</code>,{' '}
                <code>maximum</code>, <code>multipleOf</code>), <code>t.Numeric</code>{' '}
                (number with string coercion), <code>t.Boolean</code>, <code>t.Null</code>,{' '}
                <code>t.Any</code>
                , <code>t.Unknown</code>, <code>t.Literal</code>, <code>t.Union</code>,{' '}
                <code>t.Enum</code>, <code>t.Nullable</code>, <code>t.Array</code>{' '}
                (<code>minItems</code>, <code>maxItems</code>), <code>t.Object</code>{' '}
                (<code>additionalProperties</code>),
                <code>t.Optional</code>. All of them accept custom <code>error</code> messages and a
                {' '}
                <code>default</code> value.
              </p>
            </section>

            <section id='cookies'>
              <h2>Cookies</h2>
              <p>
                Reactive proxy-based cookies — read, set, and remove cookies directly on the{' '}
                <code>cookie</code> context object, matching Elysia's API:
              </p>
              <Code lang='ts'>
                {`new Goddo()
  .get('/visit', ({ cookie }) => {
    const count = Number(cookie.visits.value ?? 0)
    cookie.visits.value = String(count + 1)
    cookie.visits.set({ httpOnly: true, path: '/', maxAge: 86400 })
    return \`Visits: \${count + 1}\`
  })
  .get('/logout', ({ cookie }) => {
    cookie.session.remove()
    return 'Logged out'
  })
  .listen(3000)`}
              </Code>
              <p>
                Each <code>cookie.&lt;name&gt;</code> returns a <code>Cookie</code> object with{' '}
                <code>.value</code>, <code>.set(attrs)</code>, <code>.remove()</code>{' '}
                and individual attribute setters (<code>.httpOnly</code>, <code>.path</code>,{' '}
                <code>.sameSite</code>, <code>.secure</code>, <code>.maxAge</code>,{' '}
                <code>.domain</code>, <code>.expires</code>, <code>.priority</code>).
              </p>
              <p>
                Cookie schemas can be validated using <code>t</code>:
              </p>
              <Code lang='ts'>
                {`.get('/profile', ({ cookie }) => cookie.session.value, {
  cookie: t.Object({ session: t.String({ minLength: 1 }) }),
})`}
              </Code>

              <h3>Signed Cookies</h3>
              <p>
                Cookies can be automatically signed and verified using the native Web Crypto API
                (HMAC-SHA256) by setting a <code>cookieSecret</code> in the{' '}
                <code>GoddoConfig</code>:
              </p>
              <Code lang='ts'>
                {`const app = new Goddo({ cookieSecret: 'my-super-secret' })
  .get('/sign', async ({ cookie }) => {
    cookie.auth.value = 'user_id_123'
    await cookie.auth.sign()
    return 'Cookie signed!'
  })
  .get('/verify', async ({ cookie }) => {
    const isValid = await cookie.auth.verify()
    return isValid ? \`Hello \${cookie.auth.value}\` : 'Invalid signature'
  })`}
              </Code>
            </section>

            <section id='guard'>
              <h2>Guard</h2>
              <p>Apply shared hooks and schemas to a group of routes:</p>
              <Code lang='ts'>
                {`new Goddo()
  .guard(
    {
      headers: t.Object({ authorization: t.String() }),
      beforeHandle: ({ headers, error }) => {
        if (!headers.authorization.startsWith('Bearer ')) throw error(401)
      },
    },
    (app) =>
      app
        .get('/admin', () => 'admin')
        .get('/settings', () => 'settings'),
  )
  .get('/public', () => 'public') // not affected by guard
  .listen(3000)`}
              </Code>
            </section>

            <section id='derive-resolve'>
              <h2>Derive & Resolve</h2>
              <p>
                <strong>derive</strong> extends the context <strong>before</strong>{' '}
                validation (runs in the transform queue):
              </p>
              <Code lang='ts'>
                {`new Goddo()
  .derive(({ headers }) => ({
    bearer: headers.authorization?.replace('Bearer ', ''),
  }))
  .get('/token', ({ bearer }) => bearer)`}
              </Code>
              <p>
                <strong>resolve</strong> extends the context <strong>after</strong>{' '}
                validation (runs in the beforeHandle queue):
              </p>
              <Code lang='ts'>
                {`new Goddo()
  .resolve(async ({ headers }) => ({
    user: await getUser(headers.authorization),
  }))
  .get('/me', ({ user }) => user.name)`}
              </Code>

              <h3>Divergence from Elysia: onCleanup (Teardown)</h3>
              <p>
                <strong>onCleanup</strong>{' '}
                is a context method that registers a teardown function, run asynchronously in the
                {' '}
                <code>finally</code>{' '}
                block after the request finishes. Ideal for cleaning up request-scoped resources.
              </p>
              <Code lang='ts'>
                {`new Goddo()
  .derive(({ onCleanup }) => {
    const tx = db.transaction()
    onCleanup(() => tx.release())
    return { tx }
  })`}
              </Code>
            </section>

            <section id='macro'>
              <h2>Macro</h2>
              <p>Create reusable route-level options that expand into lifecycle hooks:</p>
              <Code lang='ts'>
                {`new Goddo()
  .macro({
    auth: (enabled: boolean) => ({
      beforeHandle({ headers, error }) {
        if (enabled && !headers.authorization) throw error(401)
      },
    }),
  })
  .get('/', () => 'public')
  .get('/admin', () => 'secret', { auth: true }) // macro applied
  .listen(3000)`}
              </Code>
            </section>

            <section id='websockets'>
              <h2>
                WebSockets (<code>.ws</code>)
              </h2>
              <p>
                Elysia-compatible WebSocket support, with built-in schema validation and pub/sub
                rooms, powered natively by <code>Deno.upgradeWebSocket</code>:
              </p>
              <Code lang='ts'>
                {`import { Goddo, t } from '@goddo/core'

new Goddo()
  .ws('/chat', {
    body: t.Object({ text: t.String() }),
    open(ws) {
      ws.subscribe('general')
      ws.publish('general', { text: 'A user joined' })
    },
    message(ws, msg) {
      ws.publish('general', msg)
    },
    close(ws) {
      ws.unsubscribe('general')
    },
  })
  .listen(3000)`}
              </Code>
            </section>

            <section id='lifecycle'>
              <h2>Lifecycle</h2>
              <p>
                <code>
                  onRequest → onParse → onTransform → derive → validation → resolve → onBeforeHandle
                  → handler → onAfterHandle → response validation → mapResponse → onAfterResponse
                </code>{' '}
                (and <code>onError</code> for exceptions), mirroring Elysia's lifecycle.
              </p>
            </section>

            <section id='performance'>
              <h2>Performance (AOT Compilation)</h2>
              <p>
                Goddo compiles all routes into a single optimized handler at <code>listen()</code>
                {' '}
                time (or when <code>compile()</code> is called manually):
              </p>
              <ul>
                <li>
                  Pre-merged hooks: global and route-level hooks merged once, not per-request
                </li>
                <li>Pre-computed flags: validation uses booleans instead of truthiness checks</li>
                <li>
                  Static route map: routes without dynamic segments use a <code>Map</code>{' '}
                  for O(1) lookup
                </li>
                <li>
                  Sucrose detection: sync handlers avoid <code>await</code> overhead
                </li>
                <li>
                  V8-optimized context: <code>GoddoContext</code>{' '}
                  with hidden classes and lazy evaluation
                </li>
                <li>Fast URL parsing: manual extraction using string indices</li>
                <li>
                  Method-aware execution: skips body parsing for <code>GET</code>/<code>HEAD</code>
                </li>
              </ul>
              <Code lang='ts'>
                {`const app = new Goddo()
  .get('/', () => 'Hello')
  .get('/user/:id', ({ params }) => params.id)

app.compile() // optional — listen() calls this automatically
app.listen(3000)`}
              </Code>
            </section>
          </div>
        </div>
      </>
    ),
  })
}
