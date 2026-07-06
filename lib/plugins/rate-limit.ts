import type { Context } from '../context.ts'

export interface RateLimitOptions {
  max?: number
  windowMs?: number
  message?: string
}

export function rateLimit(options: RateLimitOptions = {}) {
  const max = options.max ?? 100
  const windowMs = options.windowMs ?? 60000
  const message = options.message ?? 'Too Many Requests'

  const hits = new Map<string, { count: number; expires: number }>()

  // Cleanup expired entries periodically
  setInterval(() => {
    const now = Date.now()
    for (const [ip, data] of hits.entries()) {
      if (now > data.expires) hits.delete(ip)
    }
  }, windowMs).unref?.() // Use unref if available so it doesn't block exit

  return <App extends import('@goddo/types').AnyGoddo>(app: App) =>
    app.onRequest((context: Context) => {
      // Deno.ServeHandlerInfo provides remoteAddr.hostname
      // If it's not available, fallback to a global counter or a dummy IP
      const ip = (context.server?.remoteAddr as Deno.NetAddr)?.hostname ?? 'unknown'
      const now = Date.now()

      let record = hits.get(ip)
      if (!record || now > record.expires) {
        record = { count: 0, expires: now + windowMs }
        hits.set(ip, record)
      }

      record.count++

      context.set.headers['X-RateLimit-Limit'] = max.toString()
      context.set.headers['X-RateLimit-Remaining'] = Math.max(0, max - record.count).toString()
      context.set.headers['X-RateLimit-Reset'] = record.expires.toString()

      if (record.count > max) {
        context.set.status = 429
        return message // Return plain text, not object
      }
    })
}
