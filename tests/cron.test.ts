import { Goddo } from 'goddo'
import { cron, matches, parsePattern } from '@goddo/cron'
import type { CronJob } from '@goddo/cron'

// ─── Pattern parser ────────────────────────────────────────────────────────────

Deno.test('cron: parses 5-field pattern (runs at second 0)', () => {
  const parsed = parsePattern('* * * * *')
  if (!parsed.second.has(0)) throw new Error('5-field pattern must match second 0')
  if (parsed.second.size !== 1) throw new Error('5-field pattern must match only second 0')
  if (parsed.minute.size !== 60) throw new Error('Expected all 60 minutes')
})

Deno.test('cron: parses 6-field pattern with seconds', () => {
  const parsed = parsePattern('0-59/10 * * * * *')
  const expected = [0, 10, 20, 30, 40, 50]
  for (const s of expected) {
    if (!parsed.second.has(s)) throw new Error(`Expected second ${s} to match`)
  }
  if (parsed.second.size !== expected.length) {
    throw new Error(`Expected ${expected.length} seconds, got ${parsed.second.size}`)
  }
})

Deno.test('cron: parses lists and ranges', () => {
  const parsed = parsePattern('0 1,15,30 9-17 * * *')
  if (!parsed.minute.has(1) || !parsed.minute.has(15) || !parsed.minute.has(30)) {
    throw new Error('List values not parsed')
  }
  if (parsed.minute.size !== 3) throw new Error('Expected exactly 3 minutes')
  for (let h = 9; h <= 17; h++) {
    if (!parsed.hour.has(h)) throw new Error(`Expected hour ${h} to match`)
  }
  if (parsed.hour.size !== 9) throw new Error('Expected exactly 9 hours')
})

Deno.test('cron: parses step on wildcard', () => {
  const parsed = parsePattern('*/15 * * * *')
  const expected = [0, 15, 30, 45]
  for (const m of expected) {
    if (!parsed.minute.has(m)) throw new Error(`Expected minute ${m} to match`)
  }
  if (parsed.minute.size !== expected.length) throw new Error('Wrong step expansion')
})

Deno.test('cron: rejects invalid patterns', () => {
  const invalid = ['', '* * *', '60 * * * *', '* * 24 * * *', 'a * * * *', '*/0 * * * *']
  for (const pattern of invalid) {
    let threw = false
    try {
      parsePattern(pattern)
    } catch {
      threw = true
    }
    if (!threw) throw new Error(`Pattern "${pattern}" should have been rejected`)
  }
})

Deno.test('cron: matches evaluates dates correctly', () => {
  const parsed = parsePattern('30 12 * * *') // 12:30:00 every day
  const hit = new Date(2026, 0, 15, 12, 30, 0)
  const miss = new Date(2026, 0, 15, 12, 31, 0)
  if (!matches(parsed, hit)) throw new Error('Expected 12:30:00 to match')
  if (matches(parsed, miss)) throw new Error('Expected 12:31:00 not to match')
})

Deno.test('cron: matches day of week', () => {
  const parsed = parsePattern('0 9 * * 1') // Mondays 09:00
  const monday = new Date(2026, 0, 5, 9, 0, 0) // Jan 5, 2026 is a Monday
  const tuesday = new Date(2026, 0, 6, 9, 0, 0)
  if (!matches(parsed, monday)) throw new Error('Expected Monday to match')
  if (matches(parsed, tuesday)) throw new Error('Expected Tuesday not to match')
})

// ─── Plugin / scheduler ────────────────────────────────────────────────────────

const getJob = (app: Goddo, name: string): CronJob => {
  const registry = app.store.cron as Record<string, CronJob>
  return registry[name]!
}

Deno.test('cron: registers job in store.cron', () => {
  const app = new Goddo().use(
    cron({ name: 'test-job', pattern: '* * * * *', run() {} }),
  )
  const job = getJob(app, 'test-job')
  if (!job) throw new Error('Job not registered in store.cron')
  if (job.name !== 'test-job') throw new Error('Wrong job name')
  if (job.pattern !== '* * * * *') throw new Error('Wrong pattern')
  if (!job.isRunning()) throw new Error('Job should start automatically')
  job.stop()
})

Deno.test('cron: paused job does not start automatically', () => {
  const app = new Goddo().use(
    cron({ name: 'paused-job', pattern: '* * * * *', run() {}, paused: true }),
  )
  const job = getJob(app, 'paused-job')
  if (job.isRunning()) throw new Error('Paused job should not be running')
  job.start()
  if (!job.isRunning()) throw new Error('start() should schedule the job')
  job.stop()
  if (job.isRunning()) throw new Error('stop() should unschedule the job')
})

Deno.test('cron: trigger() runs the job immediately', async () => {
  let ran = false
  const app = new Goddo().use(
    cron({
      name: 'trigger-job',
      pattern: '0 0 1 1 *', // Jan 1st midnight — will not fire during the test
      run() {
        ran = true
      },
      paused: true,
    }),
  )
  const job = getJob(app, 'trigger-job')
  await job.trigger()
  if (!ran) throw new Error('trigger() should run the job function')
})

Deno.test('cron: scheduled job fires on matching second', async () => {
  let count = 0
  const app = new Goddo().use(
    cron({
      name: 'every-second',
      pattern: '* * * * * *', // every second
      run() {
        count++
      },
    }),
  )
  const job = getJob(app, 'every-second')

  // Wait ~2.2s: should fire at least twice
  await new Promise((r) => setTimeout(r, 2200))
  job.stop()

  if (count < 2) throw new Error(`Expected at least 2 executions, got ${count}`)
})

Deno.test('cron: multiple jobs coexist in the registry', () => {
  const app = new Goddo()
    .use(cron({ name: 'job-a', pattern: '* * * * *', run() {}, paused: true }))
    .use(cron({ name: 'job-b', pattern: '*/5 * * * *', run() {}, paused: true }))

  const a = getJob(app, 'job-a')
  const b = getJob(app, 'job-b')
  if (!a || !b) throw new Error('Both jobs should be registered')
  if (a.pattern === b.pattern) throw new Error('Jobs should keep their own pattern')
})

Deno.test('cron: job errors do not kill the scheduler', async () => {
  let count = 0
  const app = new Goddo().use(
    cron({
      name: 'faulty',
      pattern: '* * * * * *',
      run() {
        count++
        throw new Error('boom')
      },
    }),
  )
  const job = getJob(app, 'faulty')

  await new Promise((r) => setTimeout(r, 2200))
  job.stop()

  if (count < 2) {
    throw new Error(`Scheduler died after error: only ${count} executions`)
  }
})

Deno.test('cron: jobs stop when the server stops', async () => {
  const app = new Goddo().use(
    cron({ name: 'server-bound', pattern: '* * * * *', run() {} }),
  )
  app.listen(4321)
  const job = getJob(app, 'server-bound')
  if (!job.isRunning()) throw new Error('Job should be running')

  await app.stop()
  if (job.isRunning()) throw new Error('Job should stop with the server')
})
