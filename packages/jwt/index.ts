/**
 * @module
 * @goddo/jwt — JWT sign/verify plugin (equivalent to @elysiajs/jwt).
 *
 * Uses the Web Crypto API (SubtleCrypto) — zero external dependencies.
 * Supports HS256, HS384, HS512 algorithms.
 */
// No imports here

/** Supported HMAC algorithms. */
export type JWTAlgorithm = 'HS256' | 'HS384' | 'HS512'

/** Options for the JWT plugin. */
export interface JWTOptions<Name extends string = 'jwt'> {
  /**
   * Secret string used to sign/verify tokens.
   * Minimum 32 characters is recommended for HS256.
   */
  secret: string
  /**
   * Name of the key added to the context object.
   * @default 'jwt'
   */
  name?: Name
  /**
   * HMAC algorithm to use.
   * @default 'HS256'
   */
  alg?: JWTAlgorithm
  /**
   * Default token expiration in seconds.
   * When set, the `exp` claim is automatically added unless already present.
   */
  exp?: number
}

/** Payload of a JWT token. */
export interface JWTPayload {
  /** Issued At (Unix timestamp) */
  iat?: number
  /** Expiration (Unix timestamp) */
  exp?: number
  /** Any additional claims. */
  [key: string]: unknown
}

/** The object injected into context under the configured `name` key. */
export interface JWTInterface {
  /**
   * Sign a payload and return the JWT string.
   *
   * ```ts
   * const token = await jwt.sign({ sub: '42', role: 'admin' })
   * ```
   */
  sign(payload: JWTPayload): Promise<string>
  /**
   * Verify a JWT string and return its payload.
   * Returns `false` if the token is invalid or expired.
   *
   * ```ts
   * const payload = await jwt.verify(token)
   * if (!payload) throw error(401)
   * ```
   */
  verify(token: string): Promise<JWTPayload | false>
}

// ─── Internal helpers ──────────────────────────────────────────────────────────

const ALG_MAP: Record<JWTAlgorithm, HmacImportParams['hash']> = {
  HS256: 'SHA-256',
  HS384: 'SHA-384',
  HS512: 'SHA-512',
}

const b64url = (buf: ArrayBuffer | Uint8Array): string =>
  btoa(String.fromCharCode(...new Uint8Array(buf instanceof Uint8Array ? buf.buffer : buf)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

const b64urlDecode = (str: string): Uint8Array => {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/').padEnd(
    str.length + (4 - (str.length % 4)) % 4,
    '=',
  )
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
}

const enc = new TextEncoder()

function importKey(secret: string, alg: JWTAlgorithm): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: ALG_MAP[alg] },
    false,
    ['sign', 'verify'],
  )
}

async function buildJWT(
  payload: JWTPayload,
  key: CryptoKey,
  alg: JWTAlgorithm,
  defaultExp?: number,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const finalPayload: JWTPayload = {
    iat: now,
    ...(defaultExp !== undefined && payload.exp === undefined ? { exp: now + defaultExp } : {}),
    ...payload,
  }

  const header = b64url(enc.encode(JSON.stringify({ alg, typ: 'JWT' })))
  const body = b64url(enc.encode(JSON.stringify(finalPayload)))
  const data = `${header}.${body}`
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data))
  return `${data}.${b64url(sig)}`
}

async function parseJWT(
  token: string,
  key: CryptoKey,
): Promise<JWTPayload | false> {
  const parts = token.split('.')
  if (parts.length !== 3) return false

  const [headerB64, payloadB64, sigB64] = parts as [string, string, string]
  const data = `${headerB64}.${payloadB64}`

  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    b64urlDecode(sigB64).buffer as ArrayBuffer,
    enc.encode(data),
  )
  if (!valid) return false

  let payload: JWTPayload
  try {
    payload = JSON.parse(new TextDecoder().decode(b64urlDecode(payloadB64))) as JWTPayload
  } catch {
    return false
  }

  // Check expiration
  if (payload.exp !== undefined && payload.exp < Math.floor(Date.now() / 1000)) {
    return false
  }

  return payload
}

// ─── Plugin ────────────────────────────────────────────────────────────────────

/**
 * JWT plugin (equivalent to @elysiajs/jwt).
 *
 * Injects a `jwt` (or custom `name`) object into context with `sign` and `verify` methods.
 *
 * ```ts
 * new Goddo()
 *   .use(jwt({ secret: Deno.env.get('JWT_SECRET')! }))
 *   .post('/login', async ({ jwt, body }) => ({
 *     token: await jwt.sign({ sub: body.userId }),
 *   }))
 *   .get('/me', async ({ jwt, headers, error }) => {
 *     const token = headers.authorization?.replace('Bearer ', '')
 *     const payload = await jwt.verify(token ?? '')
 *     if (!payload) throw error(401)
 *     return payload
 *   })
 *   .listen(3000)
 * ```
 */
export const jwt = <Name extends string = 'jwt'>(
  options: JWTOptions<Name> = {} as JWTOptions<Name>,
): <App extends import('@goddo/core/types').AnyGoddo>(
  app: App,
) => import('@goddo/core').Goddo<App['_context'] & Record<Name, JWTInterface>, App['_routes']> =>
<
  App extends import('@goddo/core/types').AnyGoddo,
>(
  app: App,
): import('@goddo/core').Goddo<App['_context'] & Record<Name, JWTInterface>, App['_routes']> => {
  const alg = options.alg ?? 'HS256'
  const name = (options.name ?? 'jwt') as Name

  // Build the key once and cache it via a promise so it is shared across requests
  const keyPromise: Promise<CryptoKey> = importKey(options.secret, alg)

  const makeInterface = async (): Promise<JWTInterface> => {
    const key = await keyPromise
    return {
      sign: (payload: JWTPayload) => buildJWT(payload, key, alg, options.exp),
      verify: (token: string) => parseJWT(token, key),
    }
  }

  return app.derive(async (_ctx) => {
    const jwtInterface = await makeInterface()
    return { [name]: jwtInterface } as Record<Name, JWTInterface>
  })
}

export default jwt
