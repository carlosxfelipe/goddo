import { ValidationError } from './error.ts'

// ---------------------------------------------------------------------------
// Base types
// ---------------------------------------------------------------------------

/** Base options for all schema types. */
export interface SchemaOptions {
  /** Custom error message. */
  error?: string
  /** Default value if not provided. */
  default?: unknown
  /** Description for documentation. */
  description?: string
}

/** Base interface for all TypeBox-like schemas. */
export interface TSchema extends SchemaOptions {
  /** The inferred TypeScript type. */
  static: unknown
  /** The string literal type identifier. */
  type: string
  /** Indicates if the property is optional. */
  optional?: boolean
}

/** Internal helper to prettify object types. */
export type Prettify<T> = { [K in keyof T]: T[K] } & unknown

/** Extracts the static TypeScript type from a TSchema. */
export type Static<T extends TSchema> = T['static']

/** Options specific to string validation. */
export interface StringOptions extends SchemaOptions {
  /** Minimum string length. */
  minLength?: number
  /** Maximum string length. */
  maxLength?: number
  /** Regex pattern to match. */
  pattern?: string
  /** Built-in string format validation. */
  format?: 'email' | 'uuid' | 'url' | 'date'
}

/** Options specific to number validation. */
export interface NumberOptions extends SchemaOptions {
  /** Minimum numeric value. */
  minimum?: number
  /** Maximum numeric value. */
  maximum?: number
  /** Value must be a multiple of this number. */
  multipleOf?: number
}

/** Options specific to array validation. */
export interface ArrayOptions extends SchemaOptions {
  /** Minimum number of items. */
  minItems?: number
  /** Maximum number of items. */
  maxItems?: number
}

/** Options specific to object validation. */
export interface ObjectOptions extends SchemaOptions {
  /** Whether unknown properties are allowed. */
  additionalProperties?: boolean
}

/** Schema representing a string. */
export interface TString extends TSchema, StringOptions {
  static: string
  type: 'string'
}

/** Schema representing a number. */
export interface TNumber extends TSchema, NumberOptions {
  static: number
  type: 'number'
}

/** Schema representing an integer. */
export interface TInteger extends TSchema, NumberOptions {
  static: number
  type: 'integer'
}

/** Schema representing a number that accepts a coercible string (useful for params/query and body). */
export interface TNumeric extends TSchema, NumberOptions {
  static: number
  type: 'numeric'
}

/** Schema representing a boolean. */
export interface TBoolean extends TSchema {
  static: boolean
  type: 'boolean'
}

/** Schema representing a null value. */
export interface TNull extends TSchema {
  static: null
  type: 'null'
}

/** Schema representing any value. */
export interface TAny extends TSchema {
  static: unknown
  type: 'any'
}

/** Schema representing an unknown value. */
export interface TUnknown extends TSchema {
  static: unknown
  type: 'unknown'
}

/** Schema representing a File object. */
export interface TFile extends TSchema {
  static: File
  type: 'file'
}

/** Schema representing a Date object. */
export interface TDate extends TSchema {
  static: Date
  type: 'date'
}

/** Schema representing an exact literal value. */
export interface TLiteral<T extends string | number | boolean = string | number | boolean>
  extends TSchema {
  static: T
  type: 'literal'
  /** The constant literal value. */
  const: T
}

/** Schema representing a union of multiple schemas. */
export interface TUnion<T extends TSchema[] = TSchema[]> extends TSchema {
  static: T[number]['static']
  type: 'union'
  /** The possible schemas in this union. */
  anyOf: T
}

/** Schema representing an enum of specific values. */
export interface TEnum<T extends Record<string, string | number> = Record<string, string | number>>
  extends TSchema {
  static: T[keyof T]
  type: 'union'
  /** The possible schemas derived from enum values. */
  anyOf: TSchema[]
}

/** Schema representing an array of items. */
export interface TArray<T extends TSchema = TSchema> extends TSchema, ArrayOptions {
  static: T['static'][]
  type: 'array'
  /** The schema for the array items. */
  items: T
}

/** Record of object properties mapped to their schemas. */
export type TProperties = Record<string, TSchema>

/** Internal helper to extract optional keys. */
export type OptionalKeys<P extends TProperties> = {
  [K in keyof P]: P[K] extends { optional: true } ? K : never
}[keyof P]

/** Internal helper to extract required keys. */
export type RequiredKeys<P extends TProperties> = Exclude<keyof P, OptionalKeys<P>>

/** Infers the static type of an object from its properties. */
export type StaticProperties<P extends TProperties> = Prettify<
  & { [K in RequiredKeys<P>]: P[K]['static'] }
  & { [K in OptionalKeys<P>]?: P[K]['static'] }
>

/** Schema representing an object with specific properties. */
export interface TObject<P extends TProperties = TProperties> extends TSchema, ObjectOptions {
  static: StaticProperties<P>
  type: 'object'
  /** The schemas for each object property. */
  properties: P
}

/** Schema modifier marking a property as optional. */
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

/** Schema builder object, similar to TypeBox's `Type`. */
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

/**
 * Converts a TSchema instance into a standard JSON Schema object.
 * @param schema The TSchema to convert.
 * @returns A JSON Schema compatible record.
 */
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

/** Options for runtime validation. */
export interface ValidateOptions {
  /** Coerces strings to number/boolean (used for query/params/headers). */
  coerce?: boolean
  /** Path prefix used in error messages (e.g., 'body'). */
  path?: string
}

/**
 * Validates a value against a given schema. Throws ValidationError on failure.
 * @param schema The TSchema to validate against.
 * @param value The value to validate.
 * @param options Optional validation settings.
 * @returns The validated (and possibly coerced) value.
 */
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
