import { error, NotFoundError, ParseError, ValidationError } from '../lib/error.ts'
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'

Deno.test('GoddoError base class', () => {
  const err = error(418, 'I am a teapot')
  assertEquals(err.status, 418)
  assertEquals(err.message, 'I am a teapot')
  assertEquals(err.name, 'GoddoError')
})

Deno.test('ValidationError', () => {
  const err = new ValidationError('name must be string')
  assertEquals(err.status, 422)
  assertEquals(err.code, 'VALIDATION')
  assertEquals(err.message, 'name must be string')
  assertEquals(err.name, 'ValidationError')
})

Deno.test('ParseError', () => {
  const err = new ParseError()
  assertEquals(err.status, 400)
  assertEquals(err.code, 'PARSE')
  assertEquals(err.message, 'PARSE')
  assertEquals(err.name, 'ParseError')
})

Deno.test('NotFoundError', () => {
  const err = new NotFoundError()
  assertEquals(err.status, 404)
  assertEquals(err.code, 'NOT_FOUND')
  assertEquals(err.message, 'NOT_FOUND')
  assertEquals(err.name, 'NotFoundError')
})
