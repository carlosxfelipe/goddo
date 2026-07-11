# @goddo/cors

CORS (Cross-Origin Resource Sharing) plugin for the [Goddo](https://jsr.io/@goddo/core) framework
(equivalent to `@elysiajs/cors`).

Automatically handles CORS headers and `OPTIONS` preflight requests for your API.

## Installation

```sh
deno add jsr:@goddo/cors
```

## Usage

```ts
import { Goddo } from '@goddo/core'
import { cors } from '@goddo/cors'

new Goddo()
  .use(cors()) // allows all origins by default
  .get('/', () => 'Hello Goddo')
  .listen(3000)
```

## Options

| Option           | Type                                                  | Default     | Description                                                                |
| ---------------- | ----------------------------------------------------- | ----------- | -------------------------------------------------------------------------- |
| `origin`         | `string \| boolean \| string[] \| RegExp \| Function` | `'*'`       | Allowed origin(s). Set to `true` to reflect request origin.                |
| `methods`        | `string \| string[]`                                  | `'*'`       | Allowed HTTP methods.                                                      |
| `allowedHeaders` | `string \| string[]`                                  | `'*'`       | Allowed headers in the request.                                            |
| `exposedHeaders` | `string \| string[]`                                  | `undefined` | Headers exposed to the browser.                                            |
| `credentials`    | `boolean`                                             | `false`     | Allow cookies/credentials (sets `Access-Control-Allow-Credentials: true`). |
| `maxAge`         | `number`                                              | `undefined` | Preflight cache duration in seconds.                                       |

## Advanced Example

```ts
import { Goddo } from '@goddo/core'
import { cors } from '@goddo/cors'

new Goddo()
  .use(cors({
    origin: ['https://example.com', 'https://goddo.dev'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    credentials: true,
    maxAge: 86400, // cache preflight for 1 day
  }))
  .get('/', () => 'ok')
  .listen(3000)
```
