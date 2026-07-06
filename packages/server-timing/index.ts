/**
 * @goddo/server-timing — Server-Timing header plugin (equivalent to @elysiajs/server-timing).
 *
 * Measures the duration of request lifecycle phases and reports it in the
 * `Server-Timing` response header, visible in the browser DevTools.
 *
 * Note: Goddo approximates Elysia's `.trace()` hook using standard lifecycle
 * boundaries.
 */
import type { Context, Goddo } from '@goddo/core'

export interface ServerTimingOptions {
  /**
   * Determine whether or not Server Timing should be enabled
   *
   * @default Deno.env.get('NODE_ENV') !== 'production'
   */
  enabled?: boolean
  /**
   * Should report data back to client via 'Server-Sent-Event' (currently unused internally)
   */
  report?: boolean
  /**
   * Conditionally emit the header per request. Useful to restrict timing
   * information to admins or non-production environments.
   */
  allow?: boolean | Promise<boolean> | ((context: Context) => boolean | Promise<boolean>)
  /**
   * Allow Server Timing to log specified life-cycle events.
   */
  trace?: {
    request?: boolean
    parse?: boolean
    transform?: boolean
    beforeHandle?: boolean
    handle?: boolean
    afterHandle?: boolean
    error?: boolean
    mapResponse?: boolean
    total?: boolean
  }
}

const kStart = Symbol('serverTiming.start')
const kParse = Symbol('serverTiming.parse')
const kTransform = Symbol('serverTiming.transform')
const kBefore = Symbol('serverTiming.before')

interface TimedContext extends Context {
  [kStart]?: number
  [kParse]?: number
  [kTransform]?: number
  [kBefore]?: number
}

const fmt = (ms: number): string => ms.toFixed(2)

/**
 * Server Timing plugin (equivalent to @elysiajs/server-timing).
 */
export const serverTiming = ({
  enabled = Deno.env.get('NODE_ENV') !== 'production',
  allow,
  trace: {
    request: traceRequest = true,
    parse: traceParse = true,
    transform: traceTransform = true,
    beforeHandle: _traceBeforeHandle = true,
    handle: traceHandle = true,
    afterHandle: _traceAfterHandle = true,
    error: traceError = true,
    total: traceTotal = true,
  } = {},
}: ServerTimingOptions = {}) =>
(app: Goddo): Goddo => {
  if (enabled === false) return app

  const emit = async (ctx: TimedContext, isError: boolean) => {
    const start = ctx[kStart]
    if (start === undefined) return

    if (allow !== undefined) {
      const allowed = typeof allow === 'function' ? await allow(ctx) : await allow
      if (!allowed) return
    }

    const now = performance.now()
    const parseStart = ctx[kParse] ?? start
    const transformStart = ctx[kTransform] ?? parseStart
    const beforeStart = ctx[kBefore] ?? transformStart

    const metrics: string[] = []

    if (traceRequest) metrics.push(`request;dur=${fmt(parseStart - start)}`)
    if (traceParse) metrics.push(`parse;dur=${fmt(transformStart - parseStart)}`)
    if (traceTransform) metrics.push(`transform;dur=${fmt(beforeStart - transformStart)}`)

    // We approximate handle as the time from beforeHandle to now.
    if (traceHandle && !isError) metrics.push(`handle;dur=${fmt(now - beforeStart)}`)

    if (traceError && isError) metrics.push(`error;dur=${fmt(now - beforeStart)}`)

    if (traceTotal) metrics.push(`total;dur=${fmt(now - start)}`)

    if (metrics.length === 0) return

    const existing = ctx.set.headers['server-timing']
    ctx.set.headers['server-timing'] = existing
      ? `${existing}, ${metrics.join(', ')}`
      : metrics.join(', ')
  }

  return app
    .onRequest((ctx) => {
      ;(ctx as TimedContext)[kStart] = performance.now()
    })
    .onParse((ctx) => {
      ;(ctx as TimedContext)[kParse] = performance.now()
    })
    .onTransform((ctx) => {
      ;(ctx as TimedContext)[kTransform] = performance.now()
    })
    .onBeforeHandle((ctx) => {
      ;(ctx as TimedContext)[kBefore] = performance.now()
    })
    .onAfterHandle(async (ctx) => {
      await emit(ctx as TimedContext, false)
    })
    .onError(async (ctx) => {
      await emit(ctx as TimedContext, true)
    })
}

export default serverTiming
