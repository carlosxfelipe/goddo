import type { Context } from '@goddo/core'

/** Options for the CSRF plugin. */
export interface CsrfOptions {
  cookieName?: string
  headerName?: string
  methods?: string[]
  cookieOptions?: {
    domain?: string
    path?: string
    secure?: boolean
    sameSite?: 'strict' | 'lax' | 'none'
  }
}

/**
 * Enable CSRF (Cross-Site Request Forgery) protection for the application.
 */
export function csrf(
  options: CsrfOptions = {},
): <App extends import('@goddo/core/types').AnyGoddo>(
  app: App,
) => import('@goddo/core').Goddo<App['_context'] & { csrfToken: () => string }, App['_routes']> {
  const cookieName = options.cookieName ?? 'csrf'
  const headerName = options.headerName ?? 'x-csrf-token'
  const methods = options.methods ?? ['POST', 'PUT', 'DELETE', 'PATCH']

  const cookieOpts = {
    path: '/',
    sameSite: 'strict' as const,
    ...options.cookieOptions,
  }

  return <App extends import('@goddo/core/types').AnyGoddo>(
    app: App,
  ): import('@goddo/core').Goddo<App['_context'] & { csrfToken: () => string }, App['_routes']> => {
    // Inject generateToken into context via derive
    const goddo = app.derive<{ csrfToken: () => string }>((context: Context) => {
      return {
        csrfToken: () => {
          let token = context.cookie[cookieName]?.value
          if (!token) {
            token = crypto.randomUUID()
            const c = context.cookie[cookieName]!
            c.value = token
            c.set(cookieOpts)
          }
          return token
        },
      }
    })

    return goddo.onBeforeHandle((context) => {
      const { request, cookie, headers } = context
      const method = request.method.toUpperCase()

      // Set cookie automatically on safe methods if not present
      if (!methods.includes(method)) {
        // Just call the function to ensure the cookie is set if needed
        context.csrfToken()
        return
      }

      const cookieToken = cookie[cookieName]?.value
      // Header names are lowercased in context.headers
      const headerToken = headers[headerName] ?? headers[headerName.toLowerCase()]

      if (!cookieToken || !headerToken || cookieToken !== headerToken) {
        context.set.status = 403
        return { error: 'Invalid CSRF token' }
      }
    })
  }
}
