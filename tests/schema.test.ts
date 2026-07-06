import { Goddo, t, validate, ValidationError } from '@goddo/core'

const req = (app: Goddo, path: string, init?: RequestInit) =>
  app.handle(new Request(`http://localhost${path}`, init))

const post = (app: Goddo, path: string, body: unknown) =>
  req(app, path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

Deno.test('validates body successfully', async () => {
  const app = new Goddo().post('/user', ({ body }) => body.name, {
    body: t.Object({ name: t.String(), age: t.Number() }),
  })

  const res = await post(app, '/user', { name: 'saori', age: 16 })
  if ((await res.text()) !== 'saori') throw new Error('wrong validated body')
})

Deno.test('rejects invalid body with 422', async () => {
  const app = new Goddo().post('/user', ({ body }) => body, {
    body: t.Object({ name: t.String() }),
  })

  const res = await post(app, '/user', { name: 42 })
  if (res.status !== 422) throw new Error(`status ${res.status}`)
  await res.body?.cancel()
})

Deno.test('rejects missing required property', async () => {
  const app = new Goddo().post('/user', ({ body }) => body, {
    body: t.Object({ name: t.String() }),
  })

  const res = await post(app, '/user', {})
  if (res.status !== 422) throw new Error(`status ${res.status}`)
  await res.body?.cancel()
})

Deno.test('t.Optional allows absence', async () => {
  const app = new Goddo().post('/user', ({ body }) => body.nick ?? 'no nick', {
    body: t.Object({ name: t.String(), nick: t.Optional(t.String()) }),
  })

  const res = await post(app, '/user', { name: 'seiya' })
  if ((await res.text()) !== 'no nick') throw new Error('optional failed')
})

Deno.test('params with t.Numeric coerces to number', async () => {
  const app = new Goddo().get('/user/:id', ({ params: { id } }) => typeof id, {
    params: t.Object({ id: t.Numeric() }),
  })

  const res = await req(app, '/user/123')
  if ((await res.text()) !== 'number') throw new Error('params coercion failed')
})

Deno.test('invalid params returns 422', async () => {
  const app = new Goddo().get('/user/:id', ({ params: { id } }) => id, {
    params: t.Object({ id: t.Numeric() }),
  })

  const res = await req(app, '/user/abc')
  if (res.status !== 422) throw new Error(`status ${res.status}`)
  await res.body?.cancel()
})

Deno.test('query with coercion and default', async () => {
  const app = new Goddo().get('/list', ({ query }) => query, {
    query: t.Object({
      page: t.Numeric({ default: 1 }),
      active: t.Optional(t.Boolean()),
    }),
  })

  const res = await req(app, '/list?active=true')
  const body = await res.json()
  if (body.page !== 1) throw new Error('default failed')
  if (body.active !== true) throw new Error('boolean coercion failed')
})

Deno.test('required headers', async () => {
  const app = new Goddo().get('/secure', () => 'ok', {
    headers: t.Object({ authorization: t.String() }),
  })

  const denied = await req(app, '/secure')
  if (denied.status !== 422) throw new Error('should deny')
  await denied.body?.cancel()

  const allowed = await req(app, '/secure', { headers: { authorization: 'Bearer x' } })
  if ((await allowed.text()) !== 'ok') throw new Error('should allow')
})

Deno.test('validates response', async () => {
  const app = new Goddo().get('/bad', () => ({ ok: 'not a boolean' }), {
    response: t.Object({ ok: t.Boolean() }),
  })

  const res = await req(app, '/bad')
  if (res.status !== 422) throw new Error(`status ${res.status}`)
  await res.body?.cancel()
})

Deno.test('onError catches VALIDATION code', async () => {
  const app = new Goddo()
    .post('/user', ({ body }) => body, { body: t.Object({ name: t.String() }) })
    .onError(({ code }) => (code === 'VALIDATION' ? 'invalid' : 'other'))

  const res = await post(app, '/user', { name: 1 })
  if ((await res.text()) !== 'invalid') throw new Error('VALIDATION code not propagated')
})

Deno.test('custom error message', () => {
  const schema = t.Object({ name: t.String({ error: 'name must be a string' }) })

  try {
    validate(schema, { name: 1 })
    throw new Error('should throw')
  } catch (err) {
    if (!(err instanceof ValidationError)) throw err
    if (err.message !== 'name must be a string') throw new Error('wrong message')
  }
})

Deno.test('t.String with constraints', () => {
  validate(t.String({ minLength: 2, maxLength: 5 }), 'abc')

  for (const value of ['a', 'abcdef']) {
    try {
      validate(t.String({ minLength: 2, maxLength: 5 }), value)
      throw new Error('should throw')
    } catch (err) {
      if (!(err instanceof ValidationError)) throw err
    }
  }
})

Deno.test('t.String with email format', () => {
  validate(t.String({ format: 'email' }), 'a@b.com')

  try {
    validate(t.String({ format: 'email' }), 'not-an-email')
    throw new Error('should throw')
  } catch (err) {
    if (!(err instanceof ValidationError)) throw err
  }
})

Deno.test('t.Number with minimum/maximum', () => {
  validate(t.Number({ minimum: 0, maximum: 10 }), 5)

  try {
    validate(t.Number({ minimum: 0 }), -1)
    throw new Error('should throw')
  } catch (err) {
    if (!(err instanceof ValidationError)) throw err
  }
})

Deno.test('t.Integer rejects float', () => {
  validate(t.Integer(), 3)

  try {
    validate(t.Integer(), 3.5)
    throw new Error('should throw')
  } catch (err) {
    if (!(err instanceof ValidationError)) throw err
  }
})

Deno.test('t.Array validates items and length', () => {
  validate(t.Array(t.Number(), { minItems: 1 }), [1, 2])

  for (const value of [[], [1, 'x'], 'not-an-array']) {
    try {
      validate(t.Array(t.Number(), { minItems: 1 }), value)
      throw new Error('should throw')
    } catch (err) {
      if (!(err instanceof ValidationError)) throw err
    }
  }
})

Deno.test('t.Literal and t.Union', () => {
  const schema = t.Union([t.Literal('a'), t.Literal('b')])
  validate(schema, 'a')
  validate(schema, 'b')

  try {
    validate(schema, 'c')
    throw new Error('should throw')
  } catch (err) {
    if (!(err instanceof ValidationError)) throw err
  }
})

Deno.test('t.Enum', () => {
  const schema = t.Enum({ Bronze: 'bronze', Gold: 'gold' })
  validate(schema, 'bronze')

  try {
    validate(schema, 'silver')
    throw new Error('should throw')
  } catch (err) {
    if (!(err instanceof ValidationError)) throw err
  }
})

Deno.test('t.Nullable accepts null', () => {
  const schema = t.Nullable(t.String())
  validate(schema, null)
  validate(schema, 'ok')
})

Deno.test('nested object', () => {
  const schema = t.Object({
    user: t.Object({ name: t.String(), tags: t.Array(t.String()) }),
  })

  validate(schema, { user: { name: 'shun', tags: ['andromeda'] } })

  try {
    validate(schema, { user: { name: 'shun', tags: [1] } })
    throw new Error('should throw')
  } catch (err) {
    if (!(err instanceof ValidationError)) throw err
  }
})

Deno.test('additionalProperties: false rejects extras', () => {
  const schema = t.Object({ name: t.String() }, { additionalProperties: false })
  validate(schema, { name: 'ikki' })

  try {
    validate(schema, { name: 'ikki', extra: 1 })
    throw new Error('should throw')
  } catch (err) {
    if (!(err instanceof ValidationError)) throw err
  }
})

Deno.test('t.Any and t.Unknown accept anything', () => {
  validate(t.Any(), 1)
  validate(t.Any(), 'str')
  validate(t.Any(), null)
  validate(t.Unknown(), {})
  validate(t.Unknown(), [])
})

Deno.test('t.File and t.Date validations', () => {
  validate(t.Date(), new Date())
  try {
    validate(t.Date(), 'not-a-date')
    throw new Error('should throw')
  } catch (err) {
    if (!(err instanceof ValidationError)) throw err
  }

  // Assuming t.File expects a File object
  const file = new File([''], 'test.txt')
  validate(t.File(), file)
  try {
    validate(t.File(), {})
    throw new Error('should throw')
  } catch (err) {
    if (!(err instanceof ValidationError)) throw err
  }
})
