/**
 * @goddo/cron — Task scheduling plugin (equivalent to @elysiajs/cron).
 *
 * Zero dependencies: includes a small cron pattern parser and scheduler.
 * Supports standard 5-field patterns (minute hour day-of-month month day-of-week)
 * and optional 6-field patterns with leading seconds.
 *
 * Field syntax: `*`, numbers (`5`), lists (`1,15,30`), ranges (`1-5`) and
 * steps (every N: `0-59/10`).
 *
 * ```ts
 * import { Goddo } from 'goddo'
 * import { cron } from '@goddo/cron'
 *
 * new Goddo()
 *   .use(
 *     cron({
 *       name: 'heartbeat',
 *       pattern: '0-59/10 * * * * *', // every 10 seconds
 *       run() {
 *         console.log('Heartbeat')
 *       },
 *     }),
 *   )
 *   .get('/stop', ({ store }) => {
 *     store.cron.heartbeat.stop()
 *     return 'Stopped'
 *   })
 *   .listen(3000)
 * ```
 */
import type { Goddo } from 'goddo'

export interface CronOptions {
  /** Unique job name, used as the key in `store.cron`. */
  name: string
  /**
   * Cron pattern. 5 fields (minute hour dom month dow) or
   * 6 fields with leading seconds (second minute hour dom month dow).
   */
  pattern: string
  /** Function executed on every pattern match. */
  run: () => void | Promise<void>
  /**
   * Start the job immediately when the plugin is registered.
   * @default true
   */
  paused?: boolean
}

/** Controller injected into `store.cron[name]`. */
export interface CronJob {
  name: string
  pattern: string
  /** Whether the job is currently scheduled. */
  isRunning(): boolean
  /** Stops the job. Idempotent. */
  stop(): void
  /** (Re)starts a stopped job. Idempotent. */
  start(): void
  /** Runs the job function immediately, regardless of schedule. */
  trigger(): void | Promise<void>
}

// ─── Pattern parser ────────────────────────────────────────────────────────────

interface FieldRange {
  min: number
  max: number
}

const FIELD_RANGES: FieldRange[] = [
  { min: 0, max: 59 }, // second
  { min: 0, max: 59 }, // minute
  { min: 0, max: 23 }, // hour
  { min: 1, max: 31 }, // day of month
  { min: 1, max: 12 }, // month
  { min: 0, max: 6 }, // day of week (0 = Sunday)
]

/** Parses a single cron field (e.g. steps, `1-5`, `1,15,30`) into a Set of matching values. */
const parseField = (field: string, range: FieldRange, pattern: string): Set<number> => {
  const values = new Set<number>()

  for (const part of field.split(',')) {
    const [rangePart, stepPart] = part.split('/') as [string, string?]
    const step = stepPart !== undefined ? Number(stepPart) : 1

    if (stepPart !== undefined && (!Number.isInteger(step) || step < 1)) {
      throw new Error(`Invalid cron pattern "${pattern}": bad step "${part}"`)
    }

    let start: number
    let end: number

    if (rangePart === '*' || rangePart === '') {
      start = range.min
      end = range.max
    } else if (rangePart.includes('-')) {
      const [a, b] = rangePart.split('-').map(Number) as [number, number]
      if (!Number.isInteger(a) || !Number.isInteger(b)) {
        throw new Error(`Invalid cron pattern "${pattern}": bad range "${part}"`)
      }
      start = a
      end = b
    } else {
      const n = Number(rangePart)
      if (!Number.isInteger(n)) {
        throw new Error(`Invalid cron pattern "${pattern}": bad value "${part}"`)
      }
      start = n
      end = n
    }

    if (start < range.min || end > range.max || start > end) {
      throw new Error(
        `Invalid cron pattern "${pattern}": "${part}" out of range ${range.min}-${range.max}`,
      )
    }

    for (let v = start; v <= end; v += step) values.add(v)
  }

  return values
}

interface ParsedPattern {
  second: Set<number>
  minute: Set<number>
  hour: Set<number>
  dayOfMonth: Set<number>
  month: Set<number>
  dayOfWeek: Set<number>
}

/** Parses a 5 or 6-field cron pattern. 5-field patterns match at second 0. */
export const parsePattern = (pattern: string): ParsedPattern => {
  const fields = pattern.trim().split(/\s+/)

  if (fields.length !== 5 && fields.length !== 6) {
    throw new Error(`Invalid cron pattern "${pattern}": expected 5 or 6 fields`)
  }

  // Normalize to 6 fields: 5-field patterns run at second 0
  const normalized = fields.length === 5 ? ['0', ...fields] : fields

  return {
    second: parseField(normalized[0]!, FIELD_RANGES[0]!, pattern),
    minute: parseField(normalized[1]!, FIELD_RANGES[1]!, pattern),
    hour: parseField(normalized[2]!, FIELD_RANGES[2]!, pattern),
    dayOfMonth: parseField(normalized[3]!, FIELD_RANGES[3]!, pattern),
    month: parseField(normalized[4]!, FIELD_RANGES[4]!, pattern),
    dayOfWeek: parseField(normalized[5]!, FIELD_RANGES[5]!, pattern),
  }
}

/** Checks whether a Date matches a parsed pattern. */
export const matches = (parsed: ParsedPattern, date: Date): boolean =>
  parsed.second.has(date.getSeconds()) &&
  parsed.minute.has(date.getMinutes()) &&
  parsed.hour.has(date.getHours()) &&
  parsed.dayOfMonth.has(date.getDate()) &&
  parsed.month.has(date.getMonth() + 1) &&
  parsed.dayOfWeek.has(date.getDay())

// ─── Scheduler ─────────────────────────────────────────────────────────────────

const createJob = (options: CronOptions): CronJob => {
  const parsed = parsePattern(options.pattern)
  let timer: ReturnType<typeof setInterval> | undefined
  let lastTick = -1

  const tick = () => {
    const now = new Date()
    // Second-level de-duplication so a job never fires twice in the same second
    const currentTick = Math.floor(now.getTime() / 1000)
    if (currentTick === lastTick) return
    lastTick = currentTick

    if (matches(parsed, now)) {
      // Errors must never kill the scheduler
      try {
        const result = options.run()
        if (result instanceof Promise) result.catch(() => {})
      } catch {
        // swallow sync errors
      }
    }
  }

  const job: CronJob = {
    name: options.name,
    pattern: options.pattern,
    isRunning: () => timer !== undefined,
    stop() {
      if (timer !== undefined) {
        clearInterval(timer)
        timer = undefined
      }
    },
    start() {
      if (timer === undefined) {
        timer = setInterval(tick, 250)
        // Deno should not keep the process alive just because of a cron job
        Deno.unrefTimer(timer)
      }
    },
    trigger: () => options.run(),
  }

  if (!options.paused) job.start()

  return job
}

// ─── Plugin ────────────────────────────────────────────────────────────────────

/**
 * Cron plugin (equivalent to @elysiajs/cron).
 *
 * Registers a scheduled job and exposes its controller in `store.cron[name]`
 * with `stop()`, `start()`, `trigger()` and `isRunning()`.
 */
export const cron = (options: CronOptions) => (app: Goddo): Goddo => {
  const job = createJob(options)

  const registry = (app.store.cron ?? {}) as Record<string, CronJob>
  registry[options.name] = job
  app.store.cron = registry

  // Ensure jobs stop when the server stops
  app.onStop(() => {
    job.stop()
  })

  return app
}

export default cron
