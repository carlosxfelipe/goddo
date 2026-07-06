import { ValidationError } from './error.ts'

// ---------------------------------------------------------------------------
// Base types
// ---------------------------------------------------------------------------

export interface SchemaOptions {
  error?: string
  default?: unknown
  description?: string
}

export interface TSchema extends SchemaOptions {
  static: unknown
  type: string
  optional?: boolean
}

type Prettify<T> = { [K in keyof T]: T[K] } & unknown

export type Static<T extends TSchema> = T['static']

export interface StringOptions extends SchemaOptions {
  minLength?: number
  maxLength?: number
  pattern?: string
  format?: 'email' | 'uuid' | 'url' | 'date'
}

export interface NumberOptions extends SchemaOptions {
  minimum?: number
  maximum?: number
  multipleOf?: number
}

export interface ArrayOptions extends SchemaOptions {
  minItems?: number
  maxItems?: number
}

export interface ObjectOptions extends SchemaOptions {
  additionalProperties?: boolean
}

export interface TString extends TSchema, StringOptions {
  static: string
  type: 'string'
}

export interface TNumber extends TSchema, NumberOptions {
  static: number
  type: 'number'
}

export interface TInteger extends TSchema, NumberOptions {
  static: number
  type: 'integer'
}

/** Number that accepts a coercible string (useful for params/query and body) */
export interface TNumeric extends TSchema, NumberOptions {
  static: number
  type: 'numeric'
}

export interface TBoolean extends TSchema {
  static: boolean
  type: 'boolean'
}

export interface TNull extends TSchema {
  static: null
  type: 'null'
}

export interface TAny extends TSchema {
  static: unknown
  type: 'any'
}

export interface TUnknown extends TSchema {
  static: unknown
  type: 'unknown'
}

export interface TFile extends TSchema {
  static: File
  type: 'file'
}

export interface TDate extends TSchema {
  static: Date
  type: 'date'
}

export interface TLiteral<T extends string | number | boolean = string | number | boolean>
  extends TSchema {
  static: T
  type: 'literal'
  const: T
}

export interface TUnion<T extends TSchema[] = TSchema[]> extends TSchema {
  static: T[number]['static']
  type: 'union'
  anyOf: T
}

export interface TEnum<T extends Record<string, string | number> = Record<string, string | number>>
  extends TSchema {
  static: T[keyof T]
  type: 'union'
  anyOf: TSchema[]
}

export interface TArray<T extends TSchema = TSchema> extends TSchema, ArrayOptions {
  static: T['static'][]
  type: 'array'
  items: T
}

export type TProperties = Record<string, TSchema>

type OptionalKeys<P extends TProperties> = {
  [K in keyof P]: P[K] extends { optional: true } ? K : never
}[keyof P]

type RequiredKeys<P extends TProperties> = Exclude<keyof P, OptionalKeys<P>>

export type StaticProperties<P extends TProperties> = Prettify<
  & { [K in RequiredKeys<P>]: P[K]['static'] }
  & { [K in OptionalKeys<P>]?: P[K]['static'] }
>

export interface TObject<P extends TProperties = TProperties> extends TSchema, ObjectOptions {
  static: StaticProperties<P>
  type: 'object'
  properties: P
}

export type TOptional<T extends TSchema> = T & { optional: true }

// ---------------------------------------------------------------------------
// Builders (`t` module, TypeBox style)
// ---------------------------------------------------------------------------

const String = (options: StringOptions = {}): TString => ({ ...options, type: 'string' }) as TString

const Number = (options: NumberOptions = {}): TNumber => ({ ...options, type: 'number' }) as TNumber

const Integer = (options: NumberOptions = {}): TInteger =>
  ({ ...options, type: 'integer' }) as TInteger

const Numeric = (options: NumberOptions = {}): TNumeric =>
  ({ ...options, type: 'numeric' }) as TNumeric

const Boolean = (options: SchemaOptions = {}): TBoolean =>
  ({ ...options, type: 'boolean' }) as TBoolean

const Null = (options: SchemaOptions = {}): TNull => ({ ...options, type: 'null' }) as TNull

const Any = (options: SchemaOptions = {}): TAny => ({ ...options, type: 'any' }) as TAny

const Unknown = (options: SchemaOptions = {}): TUnknown =>
  ({ ...options, type: 'unknown' }) as TUnknown

const FileSchema = (options: SchemaOptions = {}): TFile => ({ ...options, type: 'file' }) as TFile

const DateSchema = (options: SchemaOptions = {}): TDate => ({ ...options, type: 'date' }) as TDate

const Literal = <const T extends string | number | boolean>(
  value: T,
  options: SchemaOptions = {},
): TLiteral<T> => ({ ...options, type: 'literal', const: value }) as TLiteral<T>

const Union = <const T extends TSchema[]>(anyOf: T, options: SchemaOptions = {}): TUnion<T> =>
  ({ ...options, type: 'union', anyOf }) as TUnion<T>

const Enum = <const T extends Record<string, string | number>>(
  values: T,
  options: SchemaOptions = {},
): TEnum<T> =>
  ({
    ...options,
    type: 'union',
    anyOf: Object.values(values).map((value) => Literal(value)),
  }) as unknown as TEnum<T>

const Nullable = <T extends TSchema>(schema: T): TUnion<[T, TNull]> => Union([schema, Null()])

const ArraySchema = <T extends TSchema>(items: T, options: ArrayOptions = {}): TArray<T> =>
  ({ ...options, type: 'array', items }) as TArray<T>

const ObjectSchema = <P extends TProperties>(
  properties: P,
  options: ObjectOptions = {},
): TObject<P> => ({ ...options, type: 'object', properties }) as TObject<P>

const Optional = <T extends TSchema>(schema: T): TOptional<T> =>
  ({ ...schema, optional: true }) as TOptional<T>

export const t = {
  String,
  Number,
  Integer,
  Numeric,
  Boolean,
  Null,
  Any,
  Unknown,
  Literal,
  Union,
  Enum,
  Nullable,
  Array: ArraySchema,
  Object: ObjectSchema,
  Optional,
  File: FileSchema,
  Date: DateSchema,
}

// ---------------------------------------------------------------------------
// JSON Schema conversion (OpenAPI)
// ---------------------------------------------------------------------------

export const toJSONSchema = (schema: TSchema): Record<string, unknown> => {
  const base: Record<string, unknown> = {}
  if (schema.default !== undefined) base.default = schema.default

  switch (schema.type) {
    case 'string': {
      const s = schema as TString
      return {
        ...base,
        type: 'string',
        ...(s.minLength !== undefined && { minLength: s.minLength }),
        ...(s.maxLength !== undefined && { maxLength: s.maxLength }),
        ...(s.pattern !== undefined && { pattern: s.pattern }),
        ...(s.format !== undefined && { format: s.format }),
      }
    }

    case 'number':
    case 'integer':
    case 'numeric': {
      const s = schema as TNumber
      return {
        ...base,
        type: schema.type === 'integer' ? 'integer' : 'number',
        ...(s.minimum !== undefined && { minimum: s.minimum }),
        ...(s.maximum !== undefined && { maximum: s.maximum }),
        ...(s.multipleOf !== undefined && { multipleOf: s.multipleOf }),
      }
    }

    case 'boolean':
      return { ...base, type: 'boolean' }

    case 'null':
      return { ...base, type: 'null' }

    case 'literal':
      return { ...base, const: (schema as TLiteral).const }

    case 'file':
      return { ...base, type: 'string', format: 'binary' }

    case 'date':
      return { ...base, type: 'string', format: 'date-time' }

    case 'union':
      return { ...base, anyOf: (schema as TUnion).anyOf.map(toJSONSchema) }

    case 'array': {
      const s = schema as TArray
      return {
        ...base,
        type: 'array',
        items: toJSONSchema(s.items),
        ...(s.minItems !== undefined && { minItems: s.minItems }),
        ...(s.maxItems !== undefined && { maxItems: s.maxItems }),
      }
    }

    case 'object': {
      const s = schema as TObject
      const properties: Record<string, unknown> = {}
      const required: string[] = []

      for (const [key, property] of Object.entries(s.properties)) {
        properties[key] = toJSONSchema(property)
        if (!property.optional && property.default === undefined) required.push(key)
      }

      return {
        ...base,
        type: 'object',
        properties,
        ...(required.length > 0 && { required }),
        ...(s.additionalProperties !== undefined && {
          additionalProperties: s.additionalProperties,
        }),
      }
    }

    default:
      return base
  }
}

// ---------------------------------------------------------------------------
// Runtime validation
// ---------------------------------------------------------------------------

export interface ValidateOptions {
  /** Coerces strings to number/boolean (used for query/params/headers) */
  coerce?: boolean
  /** Path prefix used in error messages (e.g. 'body') */
  path?: string
}

export const validate = (
  schema: TSchema,
  value: unknown,
  options: ValidateOptions = {},
): unknown => check(schema, value, options.path ?? 'value', options.coerce ?? false)

const display = (value: unknown): string => {
  const json = JSON.stringify(value)
  return json === undefined ? globalThis.String(value) : json
}

const fail = (schema: TSchema, path: string, message: string): never => {
  throw new ValidationError(schema.error ?? `${path}: ${message}`)
}

const checkFormat = (format: string, value: string): boolean => {
  switch (format) {
    case 'email':
      return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)
    case 'uuid':
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
    case 'url':
      return URL.canParse(value)
    case 'date':
      return !globalThis.Number.isNaN(Date.parse(value))
    default:
      return true
  }
}

const check = (schema: TSchema, value: unknown, path: string, coerce: boolean): unknown => {
  if (value === undefined) {
    if (schema.default !== undefined) return schema.default
    if (schema.optional) return undefined
    return fail(schema, path, 'Required property')
  }

  switch (schema.type) {
    case 'any':
    case 'unknown':
      return value

    case 'null':
      if (value !== null) return fail(schema, path, `Expected null, got ${display(value)}`)
      return value

    case 'file':
      if (!(value instanceof File)) {
        return fail(schema, path, `Expected File, got ${display(value)}`)
      }
      return value

    case 'date': {
      let d = value
      if (coerce && typeof d === 'string') {
        const parsed = new Date(d)
        if (!globalThis.Number.isNaN(parsed.getTime())) d = parsed
      }
      if (!(d instanceof Date) || globalThis.Number.isNaN(d.getTime())) {
        return fail(schema, path, `Expected Date, got ${display(value)}`)
      }
      return d
    }

    case 'string': {
      if (typeof value !== 'string') {
        return fail(schema, path, `Expected string, got ${display(value)}`)
      }
      const s = schema as TString
      if (s.minLength !== undefined && value.length < s.minLength) {
        return fail(schema, path, `Expected string length >= ${s.minLength}`)
      }
      if (s.maxLength !== undefined && value.length > s.maxLength) {
        return fail(schema, path, `Expected string length <= ${s.maxLength}`)
      }
      if (s.pattern !== undefined && !new RegExp(s.pattern).test(value)) {
        return fail(schema, path, `Expected string to match pattern ${s.pattern}`)
      }
      if (s.format !== undefined && !checkFormat(s.format, value)) {
        return fail(schema, path, `Expected string with format '${s.format}'`)
      }
      return value
    }

    case 'number':
    case 'integer':
    case 'numeric': {
      let n = value
      if ((coerce || schema.type === 'numeric') && typeof n === 'string' && n.trim() !== '') {
        const parsed = globalThis.Number(n)
        if (!globalThis.Number.isNaN(parsed)) n = parsed
      }
      if (typeof n !== 'number' || globalThis.Number.isNaN(n)) {
        return fail(schema, path, `Expected number, got ${display(value)}`)
      }
      if (schema.type === 'integer' && !globalThis.Number.isInteger(n)) {
        return fail(schema, path, `Expected integer, got ${display(value)}`)
      }
      const s = schema as TNumber
      if (s.minimum !== undefined && n < s.minimum) {
        return fail(schema, path, `Expected number >= ${s.minimum}`)
      }
      if (s.maximum !== undefined && n > s.maximum) {
        return fail(schema, path, `Expected number <= ${s.maximum}`)
      }
      if (s.multipleOf !== undefined && n % s.multipleOf !== 0) {
        return fail(schema, path, `Expected multiple of ${s.multipleOf}`)
      }
      return n
    }

    case 'boolean': {
      let b = value
      if (coerce && typeof b === 'string') {
        if (b === 'true') b = true
        else if (b === 'false') b = false
      }
      if (typeof b !== 'boolean') {
        return fail(schema, path, `Expected boolean, got ${display(value)}`)
      }
      return b
    }

    case 'literal': {
      const expected = (schema as TLiteral).const
      let v = value
      if (coerce && typeof v === 'string' && typeof expected !== 'string') {
        if (typeof expected === 'number') {
          const parsed = globalThis.Number(v)
          if (!globalThis.Number.isNaN(parsed)) v = parsed
        } else if (typeof expected === 'boolean') {
          if (v === 'true') v = true
          else if (v === 'false') v = false
        }
      }
      if (v !== expected) {
        return fail(schema, path, `Expected ${display(expected)}, got ${display(value)}`)
      }
      return v
    }

    case 'union': {
      const { anyOf } = schema as TUnion
      for (const member of anyOf) {
        try {
          return check(member, value, path, coerce)
        } catch {
          // try the next member
        }
      }
      return fail(schema, path, `Expected union member, got ${display(value)}`)
    }

    case 'array': {
      if (!Array.isArray(value)) {
        return fail(schema, path, `Expected array, got ${display(value)}`)
      }
      const s = schema as TArray
      if (s.minItems !== undefined && value.length < s.minItems) {
        return fail(schema, path, `Expected array length >= ${s.minItems}`)
      }
      if (s.maxItems !== undefined && value.length > s.maxItems) {
        return fail(schema, path, `Expected array length <= ${s.maxItems}`)
      }
      return value.map((item, index) => check(s.items, item, `${path}[${index}]`, coerce))
    }

    case 'object': {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return fail(schema, path, `Expected object, got ${display(value)}`)
      }
      const s = schema as TObject
      const input = value as Record<string, unknown>
      const result: Record<string, unknown> = {}

      for (const [key, property] of Object.entries(s.properties)) {
        const checked = check(property, input[key], `${path}.${key}`, coerce)
        if (checked !== undefined) result[key] = checked
      }

      for (const key of Object.keys(input)) {
        if (key in s.properties) continue
        if (s.additionalProperties === false) {
          return fail(s, `${path}.${key}`, 'Unexpected property')
        }
        if (s.additionalProperties === true) {
          result[key] = input[key]
        }
      }

      return result
    }

    default:
      return value
  }
}
