# @goddo/server-timing

Server-Timing header plugin for the [Goddo](https://jsr.io/@goddo/core) framework (equivalent to
`@elysiajs/server-timing`).

Measures the duration of request lifecycle phases and reports it in the `Server-Timing` response
header, visible in the browser DevTools Network tab.

## Installation

```sh
deno add jsr:@goddo/server-timing
```

## Usage

```ts
import { Goddo } from '@goddo/core'
import { serverTiming } from '@goddo/server-timing'

new Goddo()
  .use(serverTiming())
  .get('/', () => 'Hello Goddo')
  .listen(3000)
```

Open the Network tab in DevTools — you will see a `Server-Timing` header with phase durations like
`request;dur=0.10, parse;dur=0.05, handle;dur=1.23, total;dur=1.40`.

## Options

| Option    | Type                                                        | Default                     | Description                                                    |
| --------- | ----------------------------------------------------------- | --------------------------- | -------------------------------------------------------------- |
| `enabled` | `boolean`                                                   | `NODE_ENV !== 'production'` | Enable or disable the plugin entirely.                         |
| `allow`   | `boolean \| ((ctx) => boolean) \| Promise<boolean>`         | `undefined` (always emit)   | Gate function — emit the header only when this returns `true`. |
| `trace`   | `{ request?, parse?, transform?, handle?, error?, total? }` | all `true`                  | Control which lifecycle phases are reported.                   |

## Advanced Example

```ts
import { Goddo } from '@goddo/core'
import { serverTiming } from '@goddo/server-timing'

new Goddo()
  .use(serverTiming({
    enabled: true,
    allow: ({ headers }) => headers['x-internal'] === 'true', // only for internal requests
    trace: { total: true, handle: true, request: false },
  }))
  .get('/', () => 'ok')
  .listen(3000)
```
