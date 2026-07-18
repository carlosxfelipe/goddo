# Goddo 🛡️

[![JSR](https://jsr.io/badges/@goddo/core)](https://jsr.io/@goddo)
[![JSR Score](https://jsr.io/badges/@goddo/core/score)](https://jsr.io/@goddo/core)

> _Goddo Kurosu – God Cloths_

<p align="center">
  <img src="./assets/logo.svg" width="200" alt="Goddo Logo" />
</p>

An ergonomic web framework for **Deno**, engineered to recreate the [ElysiaJS](https://elysiajs.com)
syntax with a **1:1 Developer Experience (DX)**. Enjoy End-to-End Type Safety, seamless
autocompletion, and an incredibly intuitive API — **zero npm dependencies**, built exclusively with
native Deno and Web Platform APIs.

## Requirements

- [Deno](https://deno.land/) installed on your system.
- [Deno extension](https://marketplace.visualstudio.com/items?itemName=denoland.vscode-deno) for VS
  Code (recommended).

## Starting a New Project

Goddo and its plugins are published on the [JSR registry](https://jsr.io/@goddo) under the `@goddo`
scope.

Install the core framework:

```sh
deno add jsr:@goddo/core
```

### Official Plugins

You can install only the plugins you need to keep your server lightweight:

- [`@goddo/core`](https://jsr.io/@goddo/core) — The framework core (Router, Context, Validation).
- [`@goddo/html`](https://jsr.io/@goddo/html) — Zero-build JSX/HTML Server-Side Rendering.
- [`@goddo/treaty`](https://jsr.io/@goddo/treaty) — End-to-end type-safe HTTP client.
- [`@goddo/jwt`](https://jsr.io/@goddo/jwt) — JWT sign/verify plugin.
- [`@goddo/cors`](https://jsr.io/@goddo/cors) — Cross-Origin Resource Sharing.
- [`@goddo/openapi`](https://jsr.io/@goddo/openapi) — Swagger/Scalar OpenAPI 3.0 generation.
- [`@goddo/static`](https://jsr.io/@goddo/static) — Serve static files and assets.
- [`@goddo/rate-limit`](https://jsr.io/@goddo/rate-limit) — Request rate limiting.
- [`@goddo/shield`](https://jsr.io/@goddo/shield) — Security headers injection.
- [`@goddo/csrf`](https://jsr.io/@goddo/csrf) — Cross-Site Request Forgery protection.
- [`@goddo/cron`](https://jsr.io/@goddo/cron) — Background cron jobs schedule.
- [`@goddo/bearer`](https://jsr.io/@goddo/bearer) — Bearer token extractor.
- [`@goddo/server-timing`](https://jsr.io/@goddo/server-timing) — Server-Timing API metrics.
- [`@goddo/llms-txt`](https://jsr.io/@goddo/llms-txt) — AI-friendly `/llms.txt` generator.

To install multiple packages at once:

```sh
deno add jsr:@goddo/core jsr:@goddo/html jsr:@goddo/cors
```

## Quick Start

```ts
import { Goddo } from '@goddo/core'

new Goddo()
  .get('/', () => 'Hello Goddo')
  .get('/user/:id', ({ params: { id } }) => id)
  .post('/mirror', ({ body }) => body)
  .listen(3000)
```

## Examples

You can find a complete standalone demo using the published JSR packages at:
[carlosxfelipe/goddo-example](https://github.com/carlosxfelipe/goddo-example)

There is also a local demo within this repository (`src/`), which you can run using:

```sh
deno task dev
```

## ElysiaJS Compatibility

Goddo's core API is designed to mirror [ElysiaJS](https://elysiajs.com) as closely as possible,
making migration straightforward for Deno projects. The table below shows the current parity:

| Feature                              | ElysiaJS                            | Goddo                        | Notes                                   |
| ------------------------------------ | ----------------------------------- | ---------------------------- | --------------------------------------- |
| Route handlers (`get`, `post`, etc.) | `app.get('/', () => ...)`           | ✅ `app.get('/', () => ...)` | Identical                               |
| Path params                          | `({ params }) => params.id`         | ✅ Same                      | Identical                               |
| Schema validation (`t`)              | `t.Object`, `t.String`              | ✅ Same builders             | Identical                               |
| `t.Numeric`                          | ✅                                  | ✅                           | Coerces string to number                |
| `t.Files`, `t.Record`, `t.Tuple`     | ✅                                  | ✅                           | Files support `maxSize` / `type`        |
| `t.Intersect`, `t.ObjectString`      | ✅                                  | ✅                           | ObjectString parses JSON strings        |
| Lifecycle hooks                      | `onRequest`, `onBeforeHandle`, etc. | ✅ Same hooks                | Including `onMapResponse`               |
| `onMapResponse`                      | ✅                                  | ✅                           | Runs after handler / before response    |
| Plugin encapsulation                 | `.as('scoped'                       | 'global')`                   | ✅ Same                                 |
| `.state()` / `.decorate()`           | ✅                                  | ✅                           | Injected into context                   |
| `.mount()`                           | ✅                                  | ✅                           | Mount fetch-compatible apps             |
| `.model()`                           | ✅                                  | ✅                           | Named reusable schemas + OpenAPI `$ref` |
| `.trace()`                           | ✅                                  | ✅                           | Per-stage timing hooks                  |
| Generator/SSE handlers               | `function* () { yield sse(...) }`   | ✅ Same                      | Auto `text/event-stream`                |
| AOT compilation                      | `aot: false`                        | ✅ Same                      | Enabled by default                      |
| WebSocket                            | `app.ws()`                          | ✅ Same                      | With pub/sub                            |
| Treaty / Eden                        | `@elysiajs/eden`                    | ✅ `@goddo/treaty`           | End-to-end type-safe client             |
| GraphQL plugin                       | `@elysiajs/graphql`                 | ❌ Not yet                   | Out of current scope                    |
| OpenTelemetry                        | `@elysiajs/opentelemetry`           | ❌ Not yet                   | Out of current scope                    |
| tRPC plugin                          | `@elysiajs/trpc`                    | ❌ Not yet                   | Out of current scope                    |

For a practical migration example:

```ts
// ElysiaJS
const app = new Elysia()
  .state('version', '1.0')
  .model('user', t.Object({ id: t.Number(), name: t.String() }))
  .get('/', ({ version }) => version)
  .post('/user', ({ body }) => body, { body: 'user' })
  .listen(3000)

// Goddo (Deno)
const app = new Goddo()
  .state('version', '1.0')
  .model('user', t.Object({ id: t.Number(), name: t.String() }))
  .get('/', ({ version }) => version)
  .post('/user', ({ body }) => body, { body: 'user' })
  .listen(3000)
```

## Tasks

| Task                 | Description                    |
| -------------------- | ------------------------------ |
| `deno task dev`      | Demo app (`src/`) with watch   |
| `deno task start`    | Demo app (`src/`)              |
| `deno task test`     | Runs the test suite            |
| `deno task coverage` | Generates code coverage report |
| `deno task check`    | Type-check                     |
| `deno task fmt`      | Formats the code               |
| `deno task lint`     | Linting                        |
| `deno task bench`    | Runs performance benchmarks    |

## Documentation

The full API reference, routing syntax, validation schemas, and plugins are available on our
official website.

[Read the Full Documentation here](https://goddojs.netlify.app/)

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

Goddo was heavily optimized to offer world-class performance, standing toe-to-toe with the fastest
runtimes available. Thanks to the integrated Ahead-Of-Time (AOT) compiler and Just-In-Time (JIT)
schema validation, Goddo excels particularly in heavy I/O operations (like POST/PATCH requests with
JSON payloads).

Below is a direct comparison between **Goddo** and the original **ElysiaJS** using the same API
structure (measured in requests per second on an Apple M1):

| Route / Benchmark              | ElysiaJS (Bun v1.1.43) | Goddo (Deno v2.9.2) | Comparison                  |
| ------------------------------ | ---------------------- | ------------------- | --------------------------- |
| `PATCH /todos/1` (Update JSON) | ~246,300 req/s         | **271,300 req/s**   | **Goddo is ~10% faster** 🚀 |
| `POST /todos/` (Create JSON)   | ~279,300 req/s         | **277,300 req/s**   | **Tie** ⚡                  |
| `DELETE /todos/2` (Delete)     | ~458,700 req/s         | **361,000 req/s**   | Elysia is ~27% faster       |
| `GET /todos/1` (Get specific)  | ~537,600 req/s         | **461,400 req/s**   | Elysia is ~16% faster       |
| `GET /todos/` (List all)       | ~546,400 req/s         | **517,900 req/s**   | Elysia is ~5% faster        |
| `GET /page` (HTML Render)      | ~96,300 req/s          | **57,400 req/s**    | Elysia is ~68% faster       |
| `GET /` (Redirect)             | ~970,800 req/s         | **578,700 req/s**   | Elysia is ~67% faster       |

While Elysia leverages Bun's heavily optimized internal router for static and lightweight `GET`
endpoints, **Goddo matches or beats Elysia** where it matters most: complex validation and JSON
parsing operations (`POST`/`PATCH`), making it exceptionally suited for heavy database-driven
applications.

> **Note on HTML Rendering (`/page`):** While Bun features highly specialized C++ string optimizations in its engine for JSX concatenation, Goddo still delivers one of the fastest JSX pipelines in Deno by completely eliminating redundant parser allocations.

> **Note on Redirect (`/`):** For extremely lightweight routes like redirects, benchmark performance is dominated by the native-to-JS bridge overhead (FFI). Bun's deep C++ uSockets integration natively outpaces Deno's Rust-to-V8 bridge for empty requests, though this advantage disappears once real JavaScript logic and JSON parsing are introduced.

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

- **`assets/`** — Static assets for the repository (e.g. logos, images).
- **`src/`** — Demo application serving as an example of how to use Goddo.
- **`site/`** — Documentation & examples website (dogfoods Goddo itself), CDN-only, no build step.
  See [`site/README.md`](./site/README.md).
- **`packages/`** — Monorepo containing the framework and all plugins.
  - **`packages/core/`** — Framework core containing routing, context, validation, and all built-in
    features.
  - **`packages/<plugin>/`** — Official built-in plugins (like HTML, OpenAPI, CORS, Rate Limit,
    etc.) as independent packages.
- **`bruno/`** — Bruno API collections for testing the demo application endpoints.
- **`tests/`** — Comprehensive test suite for the Goddo core and all its plugins.
- **`benchmarks/`** — Performance benchmarks for router lookup, handler throughput, and compilation
  overhead.

## Testing & Coverage

Goddo is built with reliability in mind, backed by a robust suite of **over 200 unit tests**
covering core routing, parsing, validation, and plugin features. While it is highly capable,
extremely fast, and deeply typed, it is a new framework; we encourage you to test it thoroughly for
your specific use cases before large-scale production deployments.

## License

[MIT](./LICENSE)
