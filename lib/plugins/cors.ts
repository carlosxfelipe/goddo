import type { Goddo } from 'goddo'

export interface CorsOptions {
  /**
   * Configures the `Access-Control-Allow-Origin` CORS header.
   * - `string`: specific origin or `*`
   * - `boolean`: if `true`, reflects the request origin. If `false`, disables CORS.
   * - `string[]`: allowed origins array
   * - `RegExp`: regular expression to test against request origin
   * - `function`: dynamic origin resolver
   */
  origin?: string | boolean | string[] | RegExp | ((request: Request) => string | boolean)
  methods?: string | string[]
  allowedHeaders?: string | string[]
  exposedHeaders?: string | string[]
  credentials?: boolean
  maxAge?: number
}

const processOrigin = (
  origin: CorsOptions['origin'],
  request: Request,
): string | undefined => {
  if (origin === true) return request.headers.get('origin') ?? '*'
  if (origin === false) return undefined
  if (typeof origin === 'function') {
    const result = origin(request)
    if (result === true) return request.headers.get('origin') ?? '*'
    if (result === false) return undefined
    return result
  }
  if (origin instanceof RegExp) {
    const reqOrigin = request.headers.get('origin') ?? ''
    return origin.test(reqOrigin) ? reqOrigin : undefined
  }
  if (Array.isArray(origin)) {
    const reqOrigin = request.headers.get('origin') ?? ''
    return origin.includes(reqOrigin) ? reqOrigin : undefined
  }
  return origin ?? '*'
}

export const cors = (options: CorsOptions = {}) => (app: Goddo) => {
  const methods = Array.isArray(options.methods)
    ? options.methods.join(', ')
    : options.methods ?? '*'

  const allowedHeaders = Array.isArray(options.allowedHeaders)
    ? options.allowedHeaders.join(', ')
    : options.allowedHeaders ?? '*'

  const exposedHeaders = Array.isArray(options.exposedHeaders)
    ? options.exposedHeaders.join(', ')
    : options.exposedHeaders

  const credentials = options.credentials
  const maxAge = options.maxAge

  return app.onRequest(({ request, set }) => {
    const origin = processOrigin(options.origin, request)

    if (origin) {
      set.headers['Access-Control-Allow-Origin'] = origin
      // Vary: Origin is important when Access-Control-Allow-Origin is dynamic
      if (origin !== '*') {
        const vary = set.headers['Vary']
        set.headers['Vary'] = vary ? `${vary}, Origin` : 'Origin'
      }
    }

    if (methods) set.headers['Access-Control-Allow-Methods'] = methods
    if (allowedHeaders) set.headers['Access-Control-Allow-Headers'] = allowedHeaders
    if (exposedHeaders) set.headers['Access-Control-Expose-Headers'] = exposedHeaders
    if (credentials) set.headers['Access-Control-Allow-Credentials'] = 'true'
    if (maxAge !== undefined) set.headers['Access-Control-Max-Age'] = String(maxAge)

    // Preflight check
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204 })
    }
  })
}
