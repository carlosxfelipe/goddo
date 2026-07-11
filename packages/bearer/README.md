# @goddo/bearer

Bearer token extraction plugin for the Goddo framework.

Extracts the token following RFC 6750: from the `Authorization: Bearer <token>` header first, then
from the `access_token` query parameter as a fallback. The token is injected into the context as
`bearer` (or a custom name).

## Usage

```ts
import { Goddo } from '@goddo/core'
import { bearer } from '@goddo/bearer'

new Goddo()
  .use(bearer())
  .get('/protected', ({ bearer }) => bearer, {
    beforeHandle({ bearer, set }) {
      if (!bearer) {
        set.status = 401
        set.headers['www-authenticate'] = `Bearer realm="sign", error="invalid_request"`
        return 'Unauthorized'
      }
    },
  })
  .listen(3000)
```
