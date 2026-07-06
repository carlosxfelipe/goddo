import type { Context } from '../context.ts'

export interface ShieldOptions {
  /** @default '1; mode=block' */
  xXSSProtection?: string | false
  /** @default 'nosniff' */
  xContentTypeOptions?: string | false
  /** @default 'SAMEORIGIN' */
  xFrameOptions?: string | false
  /** @default 'max-age=15552000; includeSubDomains' */
  strictTransportSecurity?: string | false
  contentSecurityPolicy?: string | false
}

export function shield(options: ShieldOptions = {}) {
  const headers: Record<string, string> = {}

  if (options.xXSSProtection !== false) {
    headers['X-XSS-Protection'] = options.xXSSProtection ?? '1; mode=block'
  }
  if (options.xContentTypeOptions !== false) {
    headers['X-Content-Type-Options'] = options.xContentTypeOptions ?? 'nosniff'
  }
  if (options.xFrameOptions !== false) {
    headers['X-Frame-Options'] = options.xFrameOptions ?? 'SAMEORIGIN'
  }
  if (options.strictTransportSecurity !== false) {
    headers['Strict-Transport-Security'] = options.strictTransportSecurity ??
      'max-age=15552000; includeSubDomains'
  }
  if (options.contentSecurityPolicy) {
    headers['Content-Security-Policy'] = options.contentSecurityPolicy
  }

  return <App extends import('@goddo/types').AnyGoddo>(app: App) =>
    app.onRequest((context: Context) => {
      for (const [key, value] of Object.entries(headers)) {
        if (!context.set.headers[key]) {
          context.set.headers[key] = value
        }
      }
    })
}
