# Goddo 🛡️

> _Goddo Kurosu – God Cloths_

An ergonomic web framework for **Deno**, recreating the [ElysiaJS](https://elysiajs.com) syntax 1:1
— **zero npm dependencies**, built exclusively with native Deno and Web Platform APIs.

## Requirements

- [Deno](https://deno.land/) installed on your system.
- [Deno extension](https://marketplace.visualstudio.com/items?itemName=denoland.vscode-deno) for VS
  Code (recommended).

## Quick Start

```ts
import { Goddo } from 'goddo'

new Goddo()
  .get('/', () => 'Hello Goddo')
  .get('/user/:id', ({ params: { id } }) => id)
  .post('/mirror', ({ body }) => body)
  .listen(3000)
```

```sh
deno task dev
```

## Tasks

### Application Tasks

These tasks remain available for your application after initialization:

| Task                 | Description                    |
| -------------------- | ------------------------------ |
| `deno task dev`      | Demo app (`src/`) with watch   |
| `deno task start`    | Demo app (`src/`)              |
| `deno task test`     | Runs the test suite            |
| `deno task coverage` | Generates code coverage report |
| `deno task check`    | Type-check                     |
| `deno task fmt`      | Formats the code               |
| `deno task lint`     | Linting                        |

### Framework Tasks

These tasks are for Goddo's internal development and are removed by `deno task init`:

| Task              | Description                             |
| ----------------- | --------------------------------------- |
| `deno task bench` | Runs performance benchmarks             |
| `deno task init`  | Resets the repository for a new project |

## Starting a New Project

If you cloned this repository and want to start your own application using Goddo, you can run the
initialization script to clean up the framework's internal development files:

```sh
deno task init
```

> [!WARNING]
> This is a destructive action designed to clean up the repository. It will prompt for confirmation
> before it:
>
> - Deletes the `tests/`, `bruno/`, and `benchmarks/` directories.
> - Removes the `init` task itself from `deno.json`.
> - Resets `src/app.tsx` to a basic code snippet with OpenAPI.
> - Deletes `LICENSE`.
> - Deletes `README.md`.
> - Deletes the `scripts/` directory (self-destructs the script).

## Syntax (matches Elysia)

```ts
new Goddo()
  .state('version', '1.0') // shared state
  .decorate('logger', console.log) // decorates the context
  .onRequest(({ path }) => console.log(path)) // lifecycle hook
  .get('/', () => 'texto') // text/plain
  .get('/json', () => ({ ok: true })) // application/json (auto)
  .get('/user/:id', ({ params: { id } }) => id) // path params
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
  .listen(3000)
```

## Validation (`t` module)

TypeBox-style schemas for `body`, `query`, `params`, `headers` and `response`, featuring end-to-end
type inference in the handler and automatic coercion in `query`/`params`/`headers`. Invalid inputs
return `422` (error code `VALIDATION` in `onError`).

```ts
import { Goddo, t } from 'goddo'

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
  .listen(3000)
```

Available builders: `t.String` (`minLength`, `maxLength`, `pattern`, `format`),
`t.Number`/`t.Integer` (`minimum`, `maximum`, `multipleOf`), `t.Numeric` (number with string
coercion), `t.Boolean`, `t.Null`, `t.Any`, `t.Unknown`, `t.Literal`, `t.Union`, `t.Enum`,
`t.Nullable`, `t.Array` (`minItems`, `maxItems`), `t.Object` (`additionalProperties`), `t.Optional`.
All of them accept custom `error` messages and a `default` value.

## Cookies

Reactive proxy-based cookies — read, set, and remove cookies directly on the `cookie` context
object, matching Elysia's API:

```ts
new Goddo()
  .get('/visit', ({ cookie }) => {
    const count = Number(cookie.visits.value ?? 0)
    cookie.visits.value = String(count + 1)
    cookie.visits.set({ httpOnly: true, path: '/', maxAge: 86400 })
    return `Visits: ${count + 1}`
  })
  .get('/logout', ({ cookie }) => {
    cookie.session.remove()
    return 'Logged out'
  })
  .listen(3000)
```

Each `cookie.<name>` returns a `Cookie` object with:

- `.value` — get/set the cookie value
- `.set(attrs)` — bulk-set attributes (`httpOnly`, `path`, `sameSite`, `secure`, `maxAge`, etc.)
- `.remove()` — mark cookie for deletion (sets `Max-Age=0`)
- Individual attribute setters: `.httpOnly`, `.path`, `.sameSite`, `.secure`, `.maxAge`, `.domain`,
  `.expires`, `.priority`

Cookie schemas can be validated using `t`:

```ts
.get('/profile', ({ cookie }) => cookie.session.value, {
  cookie: t.Object({ session: t.String({ minLength: 1 }) }),
})
```

## Guard

Apply shared hooks and schemas to a group of routes:

```ts
new Goddo()
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
  .listen(3000)
```

## Derive & Resolve

**`derive`** extends the context **before** validation (runs in the transform queue):

```ts
new Goddo()
  .derive(({ headers }) => ({
    bearer: headers.authorization?.replace('Bearer ', ''),
  }))
  .get('/token', ({ bearer }) => bearer)
```

**`resolve`** extends the context **after** validation (runs in the beforeHandle queue):

```ts
new Goddo()
  .resolve(async ({ headers }) => ({
    user: await getUser(headers.authorization),
  }))
  .get('/me', ({ user }) => user.name)
```

## Macro

Create reusable route-level options that expand into lifecycle hooks:

```ts
new Goddo()
  .macro({
    auth: (enabled: boolean) => ({
      beforeHandle({ headers, error }) {
        if (enabled && !headers.authorization) throw error(401)
      },
    }),
  })
  .get('/', () => 'public')
  .get('/admin', () => 'secret', { auth: true }) // macro applied
  .listen(3000)
```

## Static Files (`@goddo/static`)

Serves static files from a local directory, with automatic MIME type detection, range request
support, cache headers, and path-traversal protection:

```ts
import { Goddo } from 'goddo'
import { staticPlugin } from '@goddo/static'

new Goddo()
  .use(staticPlugin({
    assets: './public', // directory to serve (default: 'public')
    prefix: '/static', // URL prefix         (default: '/public')
    maxAge: 86400, // Cache-Control max-age in seconds
    // noCache: true,    // send Cache-Control: no-store instead
    // indexHTML: 'index.html', // served at directory roots
    // headers: { 'X-Powered-By': 'Goddo' }, // extra response headers
  }))
  .listen(3000)
// GET /static/logo.png → ./public/logo.png
```

## JWT (`@goddo/jwt`)

Zero-dependency JWT plugin built on the Web Crypto API (HS256 / HS384 / HS512). Injects a `jwt`
object into the context with `sign` and `verify`:

```ts
import { Goddo } from 'goddo'
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
  .listen(3000)
```

`jwt.sign(payload)` returns a JWT string. `jwt.verify(token)` returns the payload object or `false`
when the token is invalid or expired.

## Docs with OpenAPI (`@goddo/openapi`)

A plugin equivalent to `@elysiajs/swagger`: generates OpenAPI 3.0.3 based on routes and `t` schemas,
and serves either the modern [Scalar](https://scalar.com) UI (default) or the classic Swagger UI —
using the exact same syntax as Elysia's plugin.

```ts
import { Goddo, t } from 'goddo'
import { openapi } from '@goddo/openapi'

new Goddo()
  .use(openapi({
    provider: 'swagger-ui', // optional: switch to classic Swagger UI (default is 'scalar')
    documentation: { info: { title: 'My API', version: '1.0.0' } },
  }))
  .get('/user/:id', ({ params: { id } }) => id, {
    params: t.Object({ id: t.Numeric() }),
    detail: { summary: 'Fetch user', tags: ['user'] },
  })
  .listen(3000)
// UI:   GET /docs
// Spec: GET /docs/json
```

Options: `path` (default `/docs`), `provider` (`'scalar' | 'swagger-ui'`), `documentation` (base
OpenAPI document), `detail` per route (`summary`, `description`, `tags`, `hide`, ...), `exclude`
(paths excluded from spec), `bearerAuth` (JWT config shortcut), `scalarConfig` and `version` (CDN
version).

## AI Documentation (`@goddo/llms-txt`)

A native, zero-dependency plugin that generates an `/llms.txt` endpoint. It leverages Goddo's route
tree and TypeBox schemas to output an LLM-friendly Markdown documentation of your API. This makes
your application instantly compatible with AI agents and LLMs.

```ts
import { Goddo, t } from 'goddo'
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
// AI Docs: GET /llms.txt
```

Options: `path` (default `/llms.txt`), `title`, `description`, and `exclude` (paths excluded from
spec).

## HTML SSR (`@goddo/html`)

A highly optimized plugin that enables zero-build Server-Side Rendering by compiling TSX natively.
It acts as a custom JSX runtime (equivalent to `@elysiajs/html`), converting JSX elements and Async
Components directly to HTML strings without Virtual DOM overhead.

**1. Setup (`deno.json`)** Ensure Deno uses the custom JSX compiler:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@goddo/html"
  }
}
```

**2. Usage**

```tsx
import { Goddo } from 'goddo'
import { html } from '@goddo/html'

// Full support for seamless Async Components!
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
        {/* Built-in XSS protection for variables */}
        <p>Safe: {'<script>alert(1)</script>'}</p>
        <UserProfile id='42' />
      </body>
    </html>
  ))
  .listen(3000)
```

## WebSockets (`.ws`)

Goddo supports Elysia-compatible WebSockets with built-in schema validation and pub/sub rooms,
powered natively by `Deno.upgradeWebSocket`:

```ts
import { Goddo, t } from 'goddo'

new Goddo()
  .ws('/chat', {
    // Automatically parse JSON and validate incoming messages
    body: t.Object({ text: t.String() }),

    // Lifecycle callbacks
    open(ws) {
      ws.subscribe('general')
      ws.publish('general', { text: 'A user joined' }) // broadcast to others
    },
    message(ws, msg) {
      ws.publish('general', msg)
    },
    close(ws) {
      ws.unsubscribe('general')
    },
  })
  .listen(3000)
```

## Treaty (`@goddo/treaty`)

A type-safe HTTP client generated at compile time from your app's route types — the Goddo equivalent
of [Elysia Eden](https://elysiajs.com/eden/treaty/overview.html). No code generation: everything is
inferred via TypeScript generics and a runtime `Proxy`.

### Setup

```ts
import { Goddo, t } from 'goddo'
import { treaty } from '@goddo/treaty'

const app = new Goddo()
  .get('/user/:id', ({ params }) => params)
  .post('/user', ({ body }) => body, {
    body: t.Object({ name: t.String(), age: t.Number() }),
  })
  .listen(3000)

export type App = typeof app
```

On the client:

```ts
import { treaty } from '@goddo/treaty'
import type { App } from './server.ts'

const client = treaty<App>('http://localhost:3000')

// GET /user/1
const { data, error } = await client.user({ id: '1' }).get()

// POST /user (body type enforced by the route schema)
const { data } = await client.user.post({ body: { name: 'Carlos', age: 25 } })

// GET /user?page=2
const { data } = await client.user.get({ query: { page: '2' } })
```

### Path Mapping

| Route                 | Treaty call                            |
| --------------------- | -------------------------------------- |
| `GET /`               | `client.get()`                         |
| `GET /user`           | `client.user.get()`                    |
| `POST /user`          | `client.user.post({ body: ... })`      |
| `GET /user/:id`       | `client.user({ id: '1' }).get()`       |
| `GET /user/:id/posts` | `client.user({ id: '1' }).posts.get()` |
| `GET /api/v1/status`  | `client.api.v1.status.get()`           |

> [!NOTE]
> **Coming from Elysia Eden?** Note two small syntax differences for better TypeScript
> predictability:
>
> 1. The root path (`/`) is called directly on the client (`client.get()`), not via
>    `client.index.get()`.
> 2. Request payloads must be explicitly wrapped in a `body` key (e.g., `.post({ body: { ... } })`),
>    keeping them neatly separated from `query` and `headers`.

> [!WARNING]
> **Reserved Path Segments:** Because Goddo Treaty exposes HTTP methods directly at each level (e.g.
> `client.get()`), path segments matching HTTP methods (`get`, `post`, `put`, `delete`, `patch`,
> `head`, `options`, `subscribe`) are reserved. Creating a route like `.get('/api/get/users', ...)`
> would silently collide with the `.get()` proxy method. To prevent this, **Goddo enforces a
> compile-time type error** if you attempt to register a route containing a reserved segment.

### Response Shape

Every call returns `Promise<{ data, error, status, headers, response }>`:

```ts
const { data, error, status } = await client.user.get()

if (error) {
  console.error(error.message, status) // error is an Error instance
} else {
  console.log(data) // typed as the route's return type
}
```

### Global Options

```ts
const client = treaty<App>('http://localhost:3000', {
  headers: { Authorization: 'Bearer token' }, // merged into every request
})
```

### WebSocket

```ts
const ws = client.chat.subscribe()
ws.onmessage = (e) => console.log(e.data)
```

## Lifecycle

`onRequest → onParse → onTransform → derive → validation → resolve → onBeforeHandle → handler →
onAfterHandle → response validation → mapResponse → onAfterResponse`
(and `onError` for exceptions), mirroring Elysia's lifecycle.

## Performance (AOT Compilation)

Goddo compiles all routes into a single optimized handler at `listen()` time (or when `compile()` is
called manually). This Ahead-Of-Time compilation provides:

- **Pre-merged hooks**: global and route-level lifecycle hooks are merged once, not per-request
- **Pre-computed flags**: validation checks use boolean flags instead of truthiness checks on every
  request
- **Static route map**: routes without dynamic segments (`:param` / `*`) are stored in a `Map` for
  O(1) lookup, bypassing the radix tree
- **Sucrose detection**: sync handlers skip the `await` overhead by detecting async functions via
  source inspection
- **V8-Optimized Context**: utilizes a specialized `GoddoContext` class to leverage hidden classes,
  lazily evaluating `query`, `headers`, and `cookie` only when accessed
- **Fast URL Parsing**: manual extraction of paths using string indices instead of the heavy
  `new URL()`
- **Method-Aware Execution**: automatically skips body parsing ticks for `GET` and `HEAD` requests

```ts
const app = new Goddo()
  .get('/', () => 'Hello')
  .get('/user/:id', ({ params }) => params.id)

app.compile() // optional — listen() calls this automatically
app.listen(3000)
```

### Benchmarks

```sh
deno task bench
```

Benchmarks cover router lookup (static, parametric, wildcard, 404), compiled handler throughput
(GET, POST with validation), compilation overhead, and a compiled-vs-uncompiled comparison.

## Future Enhancements (Backlog)

- **Advanced Type Chaining**: Implement deep TypeScript inference via generic classes
  (`class Goddo<Context>`) for `.derive`, `.resolve`, and `.state` to automatically propagate
  context types through the middleware chain.
- **Signed Cookies**: Built-in support for cookie signature and verification (HMAC-SHA256).

## API Collections

This project includes API collections for [Bruno](https://www.usebruno.com/), an open-source IDE for
exploring and testing APIs.

To use them:

1. Open Bruno.
2. Click **Open Collection**.
3. Select the `bruno/` directory.

## Code Formatting

This project uses Deno's built-in formatter. To ensure consistent code style across the project,
run:

```sh
deno fmt
```

Formatting rules and file exclusions are managed in [`deno.json`](./deno.json).

### VS Code Setup

If you use VS Code and have the **Prettier** extension installed, it may conflict with Deno's
formatter. To use Deno's formatter automatically on save, add the following to your
`.vscode/settings.json`:

```json
"[typescript]": {
  "editor.defaultFormatter": "denoland.vscode-deno"
},
"[typescriptreact]": {
  "editor.defaultFormatter": "denoland.vscode-deno"
}
```

## Structure

```
src/                 # Demo application
  index.ts           # Entry point — starts the server
  app.tsx            # Goddo instance, routes and plugins
bruno/               # Bruno API collections for testing the demo app (src/)
lib/                 # Framework core
  index.ts           # Goddo Class + public exports
  router.ts          # Radix tree router
  context.ts         # Context + body parsing
  cookie.ts          # Reactive CookieJar (proxy-based)
  handler.ts         # Response mapping
  types.ts           # Shared types + inference (InferContext)
  error.ts           # Errors (GoddoError, NotFoundError, ...)
  schema.ts          # t module (TypeBox-style schemas) + validate + toJSONSchema
  compile.ts         # AOT route compilation (sucrose, pre-merged hooks, static map)
  ws.ts              # WebSocket support (Deno.upgradeWebSocket)
  plugins/
    html/            # Native JSX-to-HTML Server-Side Rendering
    openapi.ts       # OpenAPI Docs + Scalar UI / Swagger UI
    llms-txt.ts      # AI Documentation endpoint (/llms.txt)
    cors.ts          # CORS middleware
    static.ts        # Static file server
    jwt.ts           # JWT sign/verify (Web Crypto API)
    bearer.ts        # Bearer token extraction (RFC 6750)
    cron.ts          # Task scheduling (zero-dependency cron parser)
    server-timing.ts # Server-Timing header (per-phase durations)
    treaty.ts        # Goddo Treaty — type-safe HTTP client
scripts/             # Setup and utility scripts
  init.ts            # Bootstraps a new Goddo app (deno task init)
tests/
  _reserved_segment_check.ts
  bearer.test.ts
  compile.test.ts
  cookie.test.ts
  cors.test.ts
  cron.test.ts
  error.test.ts
  fixtures/          # Test fixtures and mock files
  goddo.test.ts
  handler.test.ts
  html.test.tsx
  jwt.test.ts
  llms-txt.test.ts
  openapi.test.ts
  schema.test.ts
  server-timing.test.ts
  static.test.ts
  treaty.test.ts
  ws.test.ts
benchmarks/
  goddo.bench.ts     # Router lookup, handler throughput, compilation overhead
```

## Testing & Coverage

Goddo is thoroughly tested to ensure high reliability and stability in production. The framework is
backed by a robust suite of **over 160 unit tests**, maintaining exceptionally high code coverage
across all core routing, parsing, validation, and plugin features.

## License

[MIT](./LICENSE)
