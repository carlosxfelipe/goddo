# @goddo/cron

Task scheduling plugin for the [Goddo](https://jsr.io/@goddo/core) framework (equivalent to
`@elysiajs/cron`).

Includes a lightweight, zero-dependency cron pattern parser and scheduler. It supports standard
5-field patterns (minute hour day month day-of-week) as well as 6-field patterns (with leading
seconds).

## Installation

```sh
deno add jsr:@goddo/cron
```

## Usage

```ts
import { Goddo } from '@goddo/core'
import { cron } from '@goddo/cron'

new Goddo()
  .use(
    cron({
      name: 'heartbeat',
      pattern: '0-59/10 * * * * *', // every 10 seconds
      run() {
        console.log('Heartbeat')
      },
    }),
  )
  .listen(3000)
```

## Controlling Jobs

Jobs registered with the cron plugin are available in the application's `store` under
`store.cron[name]`. You can start, stop, or manually trigger them.

```ts
app.get('/stop', ({ store }) => {
  store.cron.heartbeat.stop()
  return 'Stopped'
})
```

## Options

| Option    | Type                          | Default        | Description                                                                          |
| --------- | ----------------------------- | -------------- | ------------------------------------------------------------------------------------ |
| `name`    | `string`                      | **(Required)** | Unique job name, used as the key in `store.cron`.                                    |
| `pattern` | `string`                      | **(Required)** | 5 or 6-field cron pattern. Supports `*`, lists (`,`), ranges (`-`), and steps (`/`). |
| `run`     | `() => void \| Promise<void>` | **(Required)** | Function to execute when the pattern matches.                                        |
| `paused`  | `boolean`                     | `false`        | If `true`, the job is registered but not started automatically.                      |
