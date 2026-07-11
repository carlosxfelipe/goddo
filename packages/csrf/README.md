# @goddo/csrf

CSRF (Cross-Site Request Forgery) protection plugin for the [Goddo](https://jsr.io/@goddo/core)
framework.

Automatically generates CSRF tokens, sets them in an HTTP-only cookie, and validates incoming
state-changing requests (e.g., POST, PUT, DELETE) to ensure the token in the request header matches
the cookie.

## Installation

```sh
deno add jsr:@goddo/csrf
```

## Usage

```ts
import { Goddo } from '@goddo/core'
import { csrf } from '@goddo/csrf'

new Goddo()
  .use(csrf())
  .get('/', ({ csrfToken }) => {
    // Generate/retrieve the token (automatically sets the cookie if missing)
    const token = csrfToken()
    return `Your CSRF token is: ${token}`
  })
  .post('/submit', () => {
    // This route is automatically protected.
    // If the 'x-csrf-token' header doesn't match the 'csrf' cookie,
    // the request is rejected with a 403 Forbidden.
    return 'Success!'
  })
  .listen(3000)
```

## Options

| Option          | Type                      | Default                              | Description                                                                 |
| --------------- | ------------------------- | ------------------------------------ | --------------------------------------------------------------------------- |
| `cookieName`    | `string`                  | `'csrf'`                             | Name of the cookie that stores the token.                                   |
| `headerName`    | `string`                  | `'x-csrf-token'`                     | Name of the HTTP header expected to contain the token in incoming requests. |
| `methods`       | `string[]`                | `['POST', 'PUT', 'DELETE', 'PATCH']` | HTTP methods that require CSRF validation.                                  |
| `cookieOptions` | `{ path?, secure?, ... }` | `{ path: '/', sameSite: 'strict' }`  | Additional options applied when setting the CSRF cookie.                    |
