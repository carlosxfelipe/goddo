// ---------------------------------------------------------------------------
// Cookie attributes shared by individual cookies
// ---------------------------------------------------------------------------

const encoder = new TextEncoder()

export async function signCookie(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value))
  const base64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
  return `${value}.${base64.replace(/=+$/, '')}`
}

export async function verifyCookie(signedValue: string, secret: string): Promise<string | null> {
  const lastDot = signedValue.lastIndexOf('.')
  if (lastDot === -1) return null
  const value = signedValue.substring(0, lastDot)
  const signatureBase64 = signedValue.substring(lastDot + 1)

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  )

  let b64 = signatureBase64
  while (b64.length % 4 !== 0) b64 += '='

  try {
    const signatureBytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
    const isValid = await crypto.subtle.verify('HMAC', key, signatureBytes, encoder.encode(value))
    return isValid ? value : null
  } catch {
    return null
  }
}

export interface CookieAttributes {
  domain?: string
  expires?: Date
  httpOnly?: boolean
  maxAge?: number
  path?: string
  sameSite?: 'strict' | 'lax' | 'none'
  secure?: boolean
  priority?: 'low' | 'medium' | 'high'
}

// ---------------------------------------------------------------------------
// Single reactive cookie
// ---------------------------------------------------------------------------

export class Cookie {
  #value: string | undefined
  #attrs: CookieAttributes
  #dirty = false
  #removed = false
  #secret?: string

  constructor(value: string | undefined, attrs: CookieAttributes = {}, secret?: string) {
    this.#value = value
    this.#attrs = { ...attrs }
    this.#secret = secret
  }

  get value(): string | undefined {
    return this.#value
  }

  set value(v: string | undefined) {
    this.#value = v
    this.#dirty = true
    this.#removed = false
  }

  get domain(): string | undefined {
    return this.#attrs.domain
  }
  set domain(v: string | undefined) {
    this.#attrs.domain = v
    this.#dirty = true
  }

  get expires(): Date | undefined {
    return this.#attrs.expires
  }
  set expires(v: Date | undefined) {
    this.#attrs.expires = v
    this.#dirty = true
  }

  get httpOnly(): boolean | undefined {
    return this.#attrs.httpOnly
  }
  set httpOnly(v: boolean | undefined) {
    this.#attrs.httpOnly = v
    this.#dirty = true
  }

  get maxAge(): number | undefined {
    return this.#attrs.maxAge
  }
  set maxAge(v: number | undefined) {
    this.#attrs.maxAge = v
    this.#dirty = true
  }

  get path(): string | undefined {
    return this.#attrs.path
  }
  set path(v: string | undefined) {
    this.#attrs.path = v
    this.#dirty = true
  }

  get sameSite(): CookieAttributes['sameSite'] {
    return this.#attrs.sameSite
  }
  set sameSite(v: CookieAttributes['sameSite']) {
    this.#attrs.sameSite = v
    this.#dirty = true
  }

  get secure(): boolean | undefined {
    return this.#attrs.secure
  }
  set secure(v: boolean | undefined) {
    this.#attrs.secure = v
    this.#dirty = true
  }

  get priority(): CookieAttributes['priority'] {
    return this.#attrs.priority
  }
  set priority(v: CookieAttributes['priority']) {
    this.#attrs.priority = v
    this.#dirty = true
  }

  /** Bulk-set multiple attributes at once. */
  set(attrs: CookieAttributes): this {
    Object.assign(this.#attrs, attrs)
    this.#dirty = true
    return this
  }

  /** Mark the cookie for removal (sets maxAge = 0 + expires in the past). */
  remove(): void {
    this.#value = undefined
    this.#attrs.maxAge = 0
    this.#attrs.expires = new Date(0)
    this.#dirty = true
    this.#removed = true
  }

  /** Asynchronously sign the cookie value with a secret using HMAC-SHA256. */
  async sign(secret?: string): Promise<void> {
    if (this.#value === undefined) return
    const key = secret ?? this.#secret
    if (!key) throw new Error('cookieSecret is not configured')
    this.#value = await signCookie(this.#value, key)
    this.#dirty = true
  }

  /**
   * Asynchronously verify the cookie signature. If valid, unwraps the signed value in-place
   * and returns true. If invalid, returns false (value remains unchanged).
   */
  async verify(secret?: string): Promise<boolean> {
    if (this.#value === undefined) return false
    const key = secret ?? this.#secret
    if (!key) throw new Error('cookieSecret is not configured')
    const verified = await verifyCookie(this.#value, key)
    if (verified !== null) {
      this.#value = verified
      // Not marking dirty because verifying doesn't change the client-side value,
      // it just reveals the plain value to the server code.
      return true
    }
    return false
  }

  /** Whether this cookie has been modified since creation. */
  get isDirty(): boolean {
    return this.#dirty
  }

  /** Whether `.remove()` was called. */
  get isRemoved(): boolean {
    return this.#removed
  }

  /** Serialize to a `Set-Cookie` header value. */
  serialize(name: string): string {
    const parts: string[] = [
      `${encodeURIComponent(name)}=${encodeURIComponent(this.#value ?? '')}`,
    ]

    if (this.#attrs.domain) parts.push(`Domain=${this.#attrs.domain}`)
    if (this.#attrs.expires) parts.push(`Expires=${this.#attrs.expires.toUTCString()}`)
    if (this.#attrs.httpOnly) parts.push('HttpOnly')
    if (this.#attrs.maxAge !== undefined) parts.push(`Max-Age=${this.#attrs.maxAge}`)
    if (this.#attrs.path) parts.push(`Path=${this.#attrs.path}`)
    if (this.#attrs.sameSite) {
      parts.push(
        `SameSite=${this.#attrs.sameSite.charAt(0).toUpperCase() + this.#attrs.sameSite.slice(1)}`,
      )
    }
    if (this.#attrs.secure) parts.push('Secure')
    if (this.#attrs.priority) {
      parts.push(
        `Priority=${this.#attrs.priority.charAt(0).toUpperCase() + this.#attrs.priority.slice(1)}`,
      )
    }

    return parts.join('; ')
  }
}

// ---------------------------------------------------------------------------
// CookieJar — parses request cookies and provides reactive proxied access
// ---------------------------------------------------------------------------

/**
 * A proxy-backed cookie store. Accessing any property by name always returns
 * a `Cookie` instance (auto-created when missing), mirroring Elysia's reactive
 * cookie API: `cookie.session.value`, `cookie.token.remove()`, etc.
 *
 * Use `.get(name)` for type-safe access, or destructure from the proxy for the
 * ergonomic dot-access syntax that Elysia users expect.
 */
export class CookieJar {
  #cookies: Map<string, Cookie> = new Map()
  #secret?: string

  constructor(cookieHeader: string | null, secret?: string) {
    this.#secret = secret
    if (cookieHeader) {
      for (const pair of cookieHeader.split(';')) {
        const eq = pair.indexOf('=')
        if (eq === -1) continue
        const key = decodeURIComponent(pair.slice(0, eq).trim())
        const val = decodeURIComponent(pair.slice(eq + 1).trim())
        this.#cookies.set(key, new Cookie(val, {}, this.#secret))
      }
    }

    // Return a Proxy so that `jar.anyName` returns a Cookie instance
    return new Proxy(this, {
      get(target, prop: string, _receiver): unknown {
        // Let class methods / known properties pass through normally
        if (prop in target || typeof prop === 'symbol') {
          const value = Reflect.get(target, prop, target)
          // Bind functions to the real target so private members work
          if (typeof value === 'function') return value.bind(target)
          return value
        }
        return target.get(prop)
      },

      set(target, prop: string, value: unknown): boolean {
        if (typeof prop === 'symbol') return Reflect.set(target, prop, value)

        if (value instanceof Cookie) {
          target.#cookies.set(prop, value)
        } else {
          const cookie = target.#cookies.get(prop) ?? new Cookie(undefined, {}, target.#secret)
          cookie.value = String(value)
          target.#cookies.set(prop, cookie)
        }
        return true
      },

      has(target, prop: string): boolean {
        if (prop in Object.getPrototypeOf(target) || typeof prop === 'symbol') {
          return Reflect.has(target, prop)
        }
        const cookie = target.#cookies.get(prop)
        return cookie !== undefined && cookie.value !== undefined
      },

      ownKeys(target): string[] {
        return [...target.#cookies.keys()]
      },

      getOwnPropertyDescriptor(target, prop: string) {
        if (target.#cookies.has(prop)) {
          return { configurable: true, enumerable: true, writable: true }
        }
        return undefined
      },
    }) as this
  }

  /** Type-safe access to a cookie by name. Always returns a Cookie (never undefined). */
  get(name: string): Cookie {
    let cookie = this.#cookies.get(name)
    if (!cookie) {
      cookie = new Cookie(undefined, {}, this.#secret)
      this.#cookies.set(name, cookie)
    }
    return cookie
  }

  /** Return all tracked cookie names. */
  keys(): string[] {
    return [...this.#cookies.keys()]
  }

  /** Serialize all dirty cookies into `Set-Cookie` header values. */
  serialize(): string[] {
    const headers: string[] = []

    for (const [name, cookie] of this.#cookies) {
      if (cookie.isDirty) {
        headers.push(cookie.serialize(name))
      }
    }

    return headers
  }
}

// Re-export a helper type so consumers can destructure cookies with dot-access
// while still getting Cookie types: `{ cookie: { session } }` → session: Cookie.
// deno-lint-ignore no-explicit-any
export type CookieProxy = CookieJar & { [name: string]: Cookie } & Record<string, any>
