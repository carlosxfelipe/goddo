# @goddo/shield

Security headers plugin for the [Goddo](https://jsr.io/@goddo/core) framework (equivalent to
`@elysiajs/shield`).

Automatically injects standard security headers to protect your application from common web
vulnerabilities like XSS, clickjacking, and MIME-sniffing.

## Installation

```sh
deno add jsr:@goddo/shield
```

## Usage

```ts
import { Goddo } from '@goddo/core'
import { shield } from '@goddo/shield'

new Goddo()
  .use(shield())
  .get('/', () => 'Secured!')
  .listen(3000)
```

## Default Headers Injected

By default, the following headers are set on every response (unless disabled in options):

- `X-XSS-Protection: 1; mode=block`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `Strict-Transport-Security: max-age=15552000; includeSubDomains`

## Options

You can customize or disable any of the default headers by passing options. Set a value to `false`
to disable the header entirely.

| Option                    | Type              | Default                                 |
| ------------------------- | ----------------- | --------------------------------------- |
| `xXSSProtection`          | `string \| false` | `'1; mode=block'`                       |
| `xContentTypeOptions`     | `string \| false` | `'nosniff'`                             |
| `xFrameOptions`           | `string \| false` | `'SAMEORIGIN'`                          |
| `strictTransportSecurity` | `string \| false` | `'max-age=15552000; includeSubDomains'` |
| `contentSecurityPolicy`   | `string \| false` | `undefined`                             |
