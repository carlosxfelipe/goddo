# @goddo/treaty

Type-safe HTTP client for the [Goddo](https://jsr.io/@goddo/core) framework (equivalent to Elysia
Eden Treaty).

Treaty provides a Proxy-based client that maps `client.path.segment.method(opts)` to typed `fetch`
calls, giving you full end-to-end TypeScript inference from your server's route definitions.

## Installation

```sh
deno add jsr:@goddo/treaty
```

## Usage

```ts
import { Goddo, t } from '@goddo/core'
import { treaty } from '@goddo/treaty'

// 1. Define your Goddo server
const app = new Goddo()
  .get('/user/:id', ({ params }) => params)
  .post('/user', ({ body }) => body, {
    body: t.Object({ name: t.String() }),
  })

// 2. Export the type of your Goddo instance
export type App = typeof app

// 3. Create a Treaty client
const client = treaty<App>('http://localhost:3000')

// 4. Use the client with full autocomplete and type safety!
const { data, error } = await client.user({ id: '1' }).get()
// data is typed as { id: string }

const res = await client.user.post({ body: { name: 'Carlos' } })
// res.data is typed as { name: string }
```

## Options

You can pass default headers and fetch options that will be applied to every request made by the
client.

```ts
const client = treaty<App>('http://localhost:3000', {
  headers: {
    Authorization: 'Bearer ...',
  },
  fetch: {
    cache: 'no-store',
  },
})
```

## WebSockets

Treaty also supports Goddo's WebSockets out of the box. Just call `.subscribe()` on the route, and
it will return a strongly-typed native WebSocket connection!

```ts
// If you have a .ws('/chat') route:
const ws = client.chat.subscribe()

ws.onmessage = (event) => {
  console.log(event.data)
}
```
