# @goddo/openapi

OpenAPI documentation plugin for the [Goddo](https://jsr.io/@goddo/core) framework, with built-in
[Scalar](https://scalar.com) and Swagger UI support (equivalent to `@elysiajs/swagger`).

Automatically generates an OpenAPI 3.0.3 spec from your registered routes and serves an interactive
documentation UI.

## Installation

```sh
deno add jsr:@goddo/openapi
```

## Usage

```ts
import { Goddo } from '@goddo/core'
import { openapi } from '@goddo/openapi'

new Goddo()
  .use(openapi())
  .get('/', () => 'Hello Goddo')
  .listen(3000)

// UI:   GET /docs
// Spec: GET /docs/json
```

## Options

| Option          | Type                       | Default    | Description                                                 |
| --------------- | -------------------------- | ---------- | ----------------------------------------------------------- |
| `path`          | `string`                   | `'/docs'`  | Path where the documentation UI is served.                  |
| `version`       | `string`                   | `'latest'` | CDN version of `@scalar/api-reference`.                     |
| `provider`      | `'scalar' \| 'swagger-ui'` | `'scalar'` | UI provider to render the documentation.                    |
| `documentation` | `{ info?, ... }`           | `{}`       | Base OpenAPI document (info, tags, servers, components, …). |
| `exclude`       | `(string \| RegExp)[]`     | `[]`       | Paths excluded from the generated spec.                     |
| `bearerAuth`    | `boolean`                  | `false`    | Automatically inject a JWT Bearer `securityScheme`.         |
| `scalarConfig`  | `Record<string, unknown>`  | `{}`       | Extra configuration forwarded to the Scalar widget.         |

## Advanced Example

```ts
import { Goddo, t } from '@goddo/core'
import { openapi } from '@goddo/openapi'

new Goddo()
  .use(openapi({
    path: '/api-docs',
    provider: 'scalar',
    bearerAuth: true,
    documentation: {
      info: { title: 'My API', version: '1.0.0' },
    },
    exclude: ['/health'],
  }))
  .get('/health', () => 'ok', { detail: { hide: true } })
  .get('/users', () => [], {
    detail: { summary: 'List users', tags: ['Users'] },
  })
  .listen(3000)
```
