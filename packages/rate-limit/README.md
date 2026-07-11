# @goddo/rate-limit

Rate limiting plugin for the [Goddo](https://jsr.io/@goddo/core) framework (equivalent to
`@elysiajs/rate-limit`).

Protects your API from brute-force attacks and abuse by limiting the number of requests a client
(identified by IP address) can make within a specified time window.

## Installation

```sh
deno add jsr:@goddo/rate-limit
```

## Usage

```ts
import { Goddo } from '@goddo/core'
import { rateLimit } from '@goddo/rate-limit'

new Goddo()
  .use(rateLimit({ max: 50, windowMs: 60000 })) // 50 requests per minute
  .get('/', () => 'Hello Goddo')
  .listen(3000)
```

Clients exceeding the limit will receive a `429 Too Many Requests` response.

## Headers

The plugin automatically injects standard rate limiting headers into the response:

- `X-RateLimit-Limit`: Maximum number of requests allowed in the window.
- `X-RateLimit-Remaining`: Remaining requests available in the current window.
- `X-RateLimit-Reset`: Unix timestamp when the current window expires and the limit resets.

## Options

| Option     | Type     | Default               | Description                                                     |
| ---------- | -------- | --------------------- | --------------------------------------------------------------- |
| `max`      | `number` | `100`                 | Maximum number of allowed requests per time window.             |
| `windowMs` | `number` | `60000` (1 minute)    | Duration of the rate limit window in milliseconds.              |
| `message`  | `string` | `'Too Many Requests'` | Text sent in the response body when the rate limit is exceeded. |
