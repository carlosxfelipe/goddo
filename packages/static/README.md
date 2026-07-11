# @goddo/static

Static file serving plugin for the [Goddo](https://jsr.io/@goddo/core) framework (equivalent to
`@elysiajs/static`).

Serves files from a local directory under a configurable URL prefix, with support for:

- Automatic MIME type detection (30+ extensions)
- Range requests for media streaming
- `Cache-Control` headers (configurable max-age or `no-store`)
- `index.html` fallback for directory paths
- Path traversal protection

## Installation

```sh
deno add jsr:@goddo/static
```

## Usage

```ts
import { Goddo } from '@goddo/core'
import { staticPlugin } from '@goddo/static'

new Goddo()
  .use(staticPlugin())
  .listen(3000)
// Serves files from ./public under /public/*
```

## Options

| Option      | Type                     | Default        | Description                                                  |
| ----------- | ------------------------ | -------------- | ------------------------------------------------------------ |
| `assets`    | `string`                 | `'public'`     | Local directory to serve files from.                         |
| `prefix`    | `string`                 | `'/public'`    | URL prefix for static assets.                                |
| `indexHTML` | `string`                 | `'index.html'` | Index file served at directory roots.                        |
| `headers`   | `Record<string, string>` | `{}`           | Extra response headers applied to every static response.     |
| `noCache`   | `boolean`                | `false`        | Send `Cache-Control: no-store` to disable browser caching.   |
| `maxAge`    | `number`                 | `86400`        | Max-Age in seconds for `Cache-Control: public, max-age=<n>`. |

## Advanced Example

```ts
import { Goddo } from '@goddo/core'
import { staticPlugin } from '@goddo/static'

new Goddo()
  .use(staticPlugin({
    assets: 'dist', // serve from ./dist
    prefix: '/assets', // under /assets/*
    maxAge: 604800, // cache for 7 days
    headers: {
      'x-powered-by': 'Goddo',
    },
  }))
  .listen(3000)
```
