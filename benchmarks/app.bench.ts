import { app, resetStore } from '../src/app.tsx'

// Compile the app for maximum performance
app.compile()

Deno.bench('GET / (Redirect)', async () => {
  const req = new Request('http://localhost/')
  await app.handle(req)
})

Deno.bench('GET /page (HTML rendering)', async () => {
  const req = new Request('http://localhost/page')
  await app.handle(req)
})

Deno.bench('GET /todos/ (List todos)', async () => {
  const req = new Request('http://localhost/todos/')
  await app.handle(req)
})

Deno.bench('GET /todos/1 (Get a specific todo)', async () => {
  const req = new Request('http://localhost/todos/1')
  await app.handle(req)
})

Deno.bench('POST /todos/ (Create todo)', async () => {
  const req = new Request('http://localhost/todos/', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title: 'New task' }),
  })
  await app.handle(req)
})

Deno.bench('PATCH /todos/1 (Update todo)', async () => {
  const req = new Request('http://localhost/todos/1', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ completed: true }),
  })
  await app.handle(req)
})

Deno.bench('DELETE /todos/2 (Delete todo)', async () => {
  // Ensure the item always exists regardless of prior POST benchmark pollution.
  // resetStore() is O(1) (Map.clear + 2 sets) and does not skew the measurement.
  resetStore()
  const req = new Request('http://localhost/todos/2', {
    method: 'DELETE',
  })
  await app.handle(req)
})
