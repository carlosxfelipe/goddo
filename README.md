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

Benchmarks cover router lookup (static, parametric, wildcard, 404), compiled handler throughput
(GET, POST with validation), compilation overhead, and a compiled-vs-uncompiled comparison.

See [BENCHMARK.md](./BENCHMARK.md) for detailed performance results and comparisons.

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
