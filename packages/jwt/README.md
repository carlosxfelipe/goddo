# @goddo/jwt

JWT (JSON Web Token) sign and verify plugin for the [Goddo](https://jsr.io/@goddo/core) framework
(equivalent to `@elysiajs/jwt`).

Provides a fast, zero-dependency JWT implementation utilizing the native Web Crypto API
(`crypto.subtle`).

## Installation

```sh
deno add jsr:@goddo/jwt
```

## Usage

```ts
import { Goddo } from '@goddo/core'
import { jwt } from '@goddo/jwt'

new Goddo()
  .use(jwt({ secret: 'super-secret' })) // Make sure to use a strong secret
  .get('/sign', async ({ jwt }) => {
    // Generate a token
    return await jwt.sign({ sub: 'user_123' })
  })
  .get('/verify', async ({ jwt, query, error }) => {
    // Verify a token
    const payload = await jwt.verify(query.token)
    if (!payload) throw error(401, 'Unauthorized')
    return payload
  })
  .listen(3000)
```

## Options

| Option   | Type     | Default      | Description                                                                |
| -------- | -------- | ------------ | -------------------------------------------------------------------------- |
| `secret` | `string` | **Required** | The secret key used to sign and verify tokens.                             |
| `name`   | `string` | `'jwt'`      | The property name injected into the route context.                         |
| `alg`    | `string` | `'HS256'`    | HMAC algorithm to use (`HS256`, `HS384`, `HS512`).                         |
| `exp`    | `number` | `undefined`  | Default token expiration time in seconds (adds `exp` claim automatically). |
