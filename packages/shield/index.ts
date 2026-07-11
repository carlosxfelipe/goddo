/**
 * @module
 * Security headers plugin for Goddo.
 *
 * Automatically injects standard security headers to protect your application
 * from common web vulnerabilities.
 */
import type { Context } from '@goddo/core'

/** Options for the Shield plugin. */
export interface ShieldOptions {
  /** X-XSS-Protection header. @default '1; mode=block' */
  xXSSProtection?: string | false
  /** X-Content-Type-Options header. @default 'nosniff' */
  xContentTypeOptions?: string | false
  /** X-Frame-Options header. @default 'SAMEORIGIN' */
  xFrameOptions?: string | false
  /** Strict-Transport-Security header. @default 'max-age=15552000; includeSubDomains' */
  strictTransportSecurity?: string | false
  /** Content-Security-Policy header. */
  contentSecurityPolicy?: string | false
}

/**
 * Add security headers to the application.
 */
export const shield = (
  options: ShieldOptions = {},
): <App extends import('@goddo/core/types').AnyGoddo>(app: App) => App => {
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

  return <App extends import('@goddo/core/types').AnyGoddo>(app: App): App =>
    app.onRequest((context: Context) => {
      for (const [key, value] of Object.entries(headers)) {
        if (!context.set.headers[key]) {
          context.set.headers[key] = value
        }
      }
    })
}
