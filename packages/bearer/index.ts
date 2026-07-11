/**
 * @module
 * @goddo/bearer — Bearer token extraction plugin (equivalent to @elysiajs/bearer).
 *
 * Extracts the token following RFC 6750: from the `Authorization: Bearer <token>`
 * header first, then from the `access_token` query parameter as a fallback.
 * The token is injected into the context as `bearer` (or a custom name).
 *
 * @example
 * ```ts
 * import { Goddo } from '@goddo/core'
 * import { bearer } from '@goddo/bearer'
 *
 * new Goddo()
 *   .use(bearer())
 *   .get('/protected', ({ bearer }) => bearer, {
 *     beforeHandle({ bearer, set }) {
 *       if (!bearer) {
 *         set.status = 401
 *         set.headers['www-authenticate'] = `Bearer realm="sign", error="invalid_request"`
 *         return 'Unauthorized'
 *       }
 *     },
 *   })
 *   .listen(3000)
 * ```
 */
import type { Goddo } from '@goddo/core'

/**
 * Options for the bearer plugin.
 */
export interface BearerOptions {
  /**
   * Name of the key added to the context object.
   * @default 'bearer'
   */
  name?: string
  /**
   * Extract the token from the `Authorization` header.
   * @default true
   */
  header?: boolean
  /**
   * Extract the token from the `access_token` query parameter (RFC 6750 §2.3).
   * @default true
   */
  query?: boolean
  /**
   * Name of the query parameter to read the token from.
   * @default 'access_token'
   */
  queryName?: string
}

/**
 * Bearer plugin (equivalent to @elysiajs/bearer).
 *
 * Injects `bearer` (or custom `name`) into the context containing the extracted
 * token, or `undefined` when no token is present.
 */
export const bearer =
  (options: BearerOptions = {}): (app: Goddo) => Goddo => (app: Goddo): Goddo => {
    const name = options.name ?? 'bearer'
    const fromHeader = options.header ?? true
    const fromQuery = options.query ?? true
    const queryName = options.queryName ?? 'access_token'

    return app.derive(({ headers, query }) => {
      let token: string | undefined

      if (fromHeader) {
        const authorization = headers.authorization
        if (authorization?.startsWith('Bearer ')) {
          token = authorization.slice(7).trim() || undefined
        }
      }

      if (token === undefined && fromQuery) {
        token = query[queryName] || undefined
      }

      return { [name]: token }
    })
  }

/**
 * Bearer plugin default export.
 */
export default bearer
