/**
 * Compile-time smoke test for the Treaty reserved segment guard.
 *
 * Run: deno check tests/_reserved_segment_check.ts
 *
 * All lines marked @ts-expect-error MUST produce a type error.
 * If any of them stops producing an error, the guard has regressed.
 */

import { Goddo } from '@goddo/core'

// ── ✅ Valid paths — should type-check without errors ─────────────────────────

new Goddo()
  .get('/', () => 'root')
  .get('/user', () => 'user')
  .get('/user/:id', ({ params }) => params)
  .get('/user/:id/profile', ({ params }) => params)
  .get('/api/v1/status', () => 'ok')
  .post('/login', () => 'ok')
  .put('/user/:id', () => 'ok')
  .delete('/user/:id', () => 'ok')
  .patch('/user/:id', () => 'ok')

// ── ❌ Reserved segments — MUST produce a compile-time error ──────────────────

// @ts-expect-error: "get" is a reserved Treaty segment
new Goddo().get('/get', () => 'conflict')

// @ts-expect-error: "post" is a reserved Treaty segment
new Goddo().post('/post', () => 'conflict')

// @ts-expect-error: "put" is a reserved Treaty segment
new Goddo().put('/put', () => 'conflict')

// @ts-expect-error: "delete" is a reserved Treaty segment
new Goddo().delete('/delete', () => 'conflict')

// @ts-expect-error: "patch" is a reserved Treaty segment
new Goddo().patch('/patch', () => 'conflict')

// @ts-expect-error: "head" is a reserved Treaty segment
new Goddo().head('/head', () => 'conflict')

// @ts-expect-error: "options" is a reserved Treaty segment
new Goddo().options('/options', () => 'conflict')

// @ts-expect-error: reserved segment buried mid-path
new Goddo().get('/user/get/info', () => 'conflict')

// @ts-expect-error: "subscribe" is reserved for Treaty WebSocket
new Goddo().get('/chat/subscribe', () => 'conflict')
