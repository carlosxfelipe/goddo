/**
 * @module
 * schema.ts module for @goddo/core
 */

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

/** Options specific to file validation. */
export interface FileOptions extends SchemaOptions {
  /** Minimum file size in bytes. */
  minSize?: number
  /** Maximum file size in bytes. */
  maxSize?: number
  /** Accepted MIME type(s). Supports wildcards, e.g. `image/*`. */
  type?: string | string[]
}

/** Schema representing a string. */
export interface TString extends TSchema, StringOptions {
  /** Inferred TypeScript type. */
  static: string
  /** String literal type identifier. */
  type: 'string'
}

/** Schema representing a number. */
export interface TNumber extends TSchema, NumberOptions {
  /** Inferred TypeScript type. */
  static: number
  /** String literal type identifier. */
  type: 'number'
}

/** Schema representing an integer. */
export interface TInteger extends TSchema, NumberOptions {
  /** Inferred TypeScript type. */
  static: number
  /** String literal type identifier. */
  type: 'integer'
}

/** Schema representing a number that accepts a coercible string (useful for params/query and body). */
export interface TNumeric extends TSchema, NumberOptions {
  /** Inferred TypeScript type. */
  static: number
  /** String literal type identifier. */
  type: 'numeric'
}

/** Schema representing a boolean. */
export interface TBoolean extends TSchema {
  /** Inferred TypeScript type. */
  static: boolean
  /** String literal type identifier. */
  type: 'boolean'
}

/** Schema representing a null value. */
export interface TNull extends TSchema {
  /** Inferred TypeScript type. */
  static: null
  /** String literal type identifier. */
  type: 'null'
}

/** Schema representing any value. */
export interface TAny extends TSchema {
  /** Inferred TypeScript type. */
  static: unknown
  /** String literal type identifier. */
  type: 'any'
}

/** Schema representing an unknown value. */
export interface TUnknown extends TSchema {
  /** Inferred TypeScript type. */
  static: unknown
  /** String literal type identifier. */
  type: 'unknown'
}

/** Internal representation of file options after the `type` key is renamed. */
export interface FileSchemaOptions extends SchemaOptions {
  /** Minimum file size in bytes */
  minSize?: number
  /** Maximum file size in bytes */
  maxSize?: number
  /** Allowed MIME types */
  mimeType?: string | string[]
}

/** Schema representing a File object. */
export interface TFile extends TSchema, FileSchemaOptions {
  /** Inferred TypeScript type. */
  static: File
  /** String literal type identifier. */
  type: 'file'
}

/** Schema representing an array of File objects (multipart file upload). */
export interface TFiles extends TSchema, FileSchemaOptions {
  /** Inferred TypeScript type. */
  static: File[]
  /** String literal type identifier. */
  type: 'files'
}

/** Schema representing a Date object. */
export interface TDate extends TSchema {
  /** Inferred TypeScript type. */
  static: Date
  /** String literal type identifier. */
  type: 'date'
}

/** Schema representing an exact literal value. */
export interface TLiteral<T extends string | number | boolean = string | number | boolean>
  extends TSchema {
  /** Inferred TypeScript type. */
  static: T
  /** String literal type identifier. */
  type: 'literal'
  /** The constant literal value. */
  const: T
}

/** Schema representing a union of multiple schemas. */
export interface TUnion<T extends TSchema[] = TSchema[]> extends TSchema {
  /** Inferred TypeScript type. */
  static: T[number]['static']
  /** String literal type identifier. */
  type: 'union'
  /** The possible schemas in this union. */
  anyOf: T
}

/** Computes the intersection of a tuple of static schema types. */
export type IntersectStatics<T extends readonly TSchema[]> = T extends readonly [
  infer F extends TSchema,
  ...infer Rest extends readonly TSchema[],
] ? Rest extends readonly [] ? F['static']
  : F['static'] & IntersectStatics<Rest>
  : unknown

/** Schema representing an intersection of multiple schemas (must satisfy all). */
export interface TIntersect<T extends readonly TSchema[] = readonly TSchema[]> extends TSchema {
  /** Inferred TypeScript type. */
  static: IntersectStatics<T>
  /** String literal type identifier. */
  type: 'intersect'
  /** The schemas that must all be satisfied. */
  allOf: T
}

/** Schema representing a string that encodes an object (e.g. JSON in query/cookie). */
export interface TObjectString<T extends TSchema = TSchema> extends TSchema {
  /** Inferred TypeScript type. */
  static: T['static']
  /** String literal type identifier. */
  type: 'objectString'
  /** The schema the parsed string object must satisfy. */
  properties: T
}

/** Schema representing an enum of specific values. */
export interface TEnum<T extends Record<string, string | number> = Record<string, string | number>>
  extends TSchema {
  /** Inferred TypeScript type. */
  static: T[keyof T]
  /** String literal type identifier. */
  type: 'union'
  /** The possible schemas derived from enum values. */
  anyOf: TSchema[]
}

/** Schema representing an array of items. */
export interface TArray<T extends TSchema = TSchema> extends TSchema, ArrayOptions {
  /** Inferred TypeScript type. */
  static: T['static'][]
  /** String literal type identifier. */
  type: 'array'
  /** The schema for the array items. */
  items: T
}

/** Schema representing a record of arbitrary string keys to typed values. */
export interface TRecord<T extends TSchema = TSchema> extends TSchema {
  /** Inferred TypeScript type. */
  static: Record<string, T['static']>
  /** String literal type identifier. */
  type: 'record'
  /** The schema each record value is validated against. */
  items: T
}

/** Schema representing a fixed-length tuple of typed items. */
export interface TTuple<T extends readonly TSchema[] = readonly TSchema[]> extends TSchema {
  /** Inferred TypeScript type. */
  static: { [K in keyof T]: T[K]['static'] }
  /** String literal type identifier. */
  type: 'tuple'
  /** The schemas for each tuple position. */
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
  /** Inferred TypeScript type. */
  static: StaticProperties<P>
  /** String literal type identifier. */
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

const FileSchema = (options: FileOptions = {}): TFile => {
  const { type, ...rest } = options
  return { ...rest, mimeType: type, type: 'file' } as unknown as TFile
}

const FilesSchema = (options: FileOptions = {}): TFiles => {
  const { type, ...rest } = options
  return { ...rest, mimeType: type, type: 'files' } as unknown as TFiles
}

const DateSchema = (options: SchemaOptions = {}): TDate => ({ ...options, type: 'date' }) as TDate

const Literal = <const T extends string | number | boolean>(
  value: T,
  options: SchemaOptions = {},
): TLiteral<T> =>
  ({
    ...options,
    type: 'literal',
    const: value,
  }) as TLiteral<T>

const Union = <const T extends TSchema[]>(anyOf: T, options: SchemaOptions = {}): TUnion<T> =>
  ({ ...options, type: 'union', anyOf }) as TUnion<T>

const Intersect = <const T extends readonly TSchema[]>(
  allOf: T,
  options: SchemaOptions = {},
): TIntersect<T> => ({ ...options, type: 'intersect', allOf }) as TIntersect<T>

const ObjectString = <T extends TSchema>(
  properties: T,
  options: SchemaOptions = {},
): TObjectString<T> => ({ ...options, type: 'objectString', properties }) as TObjectString<T>

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

const RecordSchema = <T extends TSchema>(items: T, options: SchemaOptions = {}): TRecord<T> =>
  ({ ...options, type: 'record', items }) as TRecord<T>

const TupleSchema = <const T extends readonly TSchema[]>(
  items: T,
  options: SchemaOptions = {},
): TTuple<T> => ({ ...options, type: 'tuple', items }) as TTuple<T>

const ObjectSchema = <P extends TProperties>(
  properties: P,
  options: ObjectOptions = {},
): TObject<P> => ({ ...options, type: 'object', properties }) as TObject<P>

const Optional = <T extends TSchema>(schema: T): TOptional<T> =>
  ({ ...schema, optional: true }) as TOptional<T>

/** Schema builder object, similar to TypeBox's `Type`. */
export const t = {
  /** Schema representing a string. */
  String,
  /** Schema representing a number. */
  Number,
  /** Schema representing an integer. */
  Integer,
  /** Schema representing a coercible numeric value. */
  Numeric,
  /** Schema representing a boolean. */
  Boolean,
  /** Schema representing a null value. */
  Null,
  /** Schema representing any value. */
  Any,
  /** Schema representing an unknown value. */
  Unknown,
  /** Schema representing an exact literal value. */
  Literal,
  /** Schema representing a union of multiple schemas. */
  Union,
  /** Schema representing an enum of specific values. */
  Enum,
  /** Schema representing a nullable schema. */
  Nullable,
  /** Schema representing an array of items. */
  Array: ArraySchema,
  /** Schema representing a record of string keys to typed values. */
  Record: RecordSchema,
  /** Schema representing a fixed-length tuple of typed items. */
  Tuple: TupleSchema,
  /** Schema representing an object with specific properties. */
  Object: ObjectSchema,
  /** Schema modifier marking a property as optional. */
  Optional,
  /** Schema representing an intersection of multiple schemas. */
  Intersect,
  /** Schema representing a string that encodes an object. */
  ObjectString,
  /** Schema representing a File object. */
  File: FileSchema,
  /** Schema representing an array of File objects. */
  Files: FilesSchema,
  /** Schema representing a Date object. */
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

    case 'files':
      return { ...base, type: 'array', items: { type: 'string', format: 'binary' } }

    case 'date':
      return { ...base, type: 'string', format: 'date-time' }

    case 'union':
      return { ...base, anyOf: (schema as TUnion).anyOf.map(toJSONSchema) }

    case 'intersect':
      return { ...base, allOf: (schema as TIntersect).allOf.map(toJSONSchema) }

    case 'objectString':
      return { ...base, type: 'string', description: (schema as TObjectString).properties.type }

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

    case 'record':
      return {
        ...base,
        type: 'object',
        additionalProperties: toJSONSchema((schema as TRecord).items),
      }

    case 'tuple': {
      const s = schema as TTuple
      return {
        ...base,
        type: 'array',
        prefixItems: s.items.map(toJSONSchema),
        minItems: s.items.length,
        maxItems: s.items.length,
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

const matchesMime = (expected: string, actual: string): boolean => {
  if (expected === actual) return true
  if (expected.endsWith('/*')) {
    return actual.startsWith(expected.slice(0, -1))
  }
  return false
}

const checkFile = (schema: TFile, value: unknown, path: string): unknown => {
  const single = schema.type === 'file'

  const files = single
    ? (value instanceof File ? [value] : null)
    : (Array.isArray(value) && value.every((v) => v instanceof File) ? value : null)

  if (files === null) {
    return fail(schema, path, `Expected ${schema.type}, got ${display(value)}`)
  }

  if (
    schema.minSize !== undefined || schema.maxSize !== undefined || schema.mimeType !== undefined
  ) {
    for (const file of files) {
      if (schema.minSize !== undefined && file.size < schema.minSize) {
        return fail(schema, path, `Expected file size >= ${schema.minSize} bytes`)
      }
      if (schema.maxSize !== undefined && file.size > schema.maxSize) {
        return fail(schema, path, `Expected file size <= ${schema.maxSize} bytes`)
      }
      if (schema.mimeType !== undefined) {
        const accepted = Array.isArray(schema.mimeType) ? schema.mimeType : [schema.mimeType]
        if (!accepted.some((t) => matchesMime(t, file.type))) {
          return fail(schema, path, `Expected file type ${accepted.join(' or ')}, got ${file.type}`)
        }
      }
    }
  }

  return single ? files[0] : files
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
    case 'files':
      return checkFile(schema as TFile, value, path)

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

    case 'intersect': {
      const { allOf } = schema as TIntersect
      let result: unknown = value
      for (const member of allOf) {
        result = check(member, result, path, coerce)
      }
      return result
    }

    case 'objectString': {
      const s = schema as TObjectString
      let data = value
      if (typeof value === 'string') {
        if (!coerce) {
          return fail(schema, path, `Expected object string, got ${display(value)}`)
        }
        try {
          data = JSON.parse(value)
        } catch {
          return fail(schema, path, `Invalid object string: ${display(value)}`)
        }
      }
      return check(s.properties, data, path, coerce)
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

    case 'record': {
      const s = schema as TRecord
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return fail(schema, path, `Expected object, got ${display(value)}`)
      }
      const input = value as Record<string, unknown>
      const result: Record<string, unknown> = {}
      for (const [key, item] of Object.entries(input)) {
        result[key] = check(s.items, item, `${path}.${key}`, coerce)
      }
      return result
    }

    case 'tuple': {
      const s = schema as TTuple
      if (!Array.isArray(value)) {
        return fail(schema, path, `Expected tuple, got ${display(value)}`)
      }
      if (value.length !== s.items.length) {
        return fail(schema, path, `Expected tuple length ${s.items.length}, got ${value.length}`)
      }
      return s.items.map((itemSchema, index) =>
        check(itemSchema, value[index], `${path}[${index}]`, coerce)
      )
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
        result[key] = input[key]
      }

      return result
    }

    default:
      return value
  }
}

// ---------------------------------------------------------------------------
// JIT Compiler
// ---------------------------------------------------------------------------

/**
 * Compiles a TSchema into a highly optimized JIT validation function.
 * Falls back to dynamic `check` if `new Function` is restricted.
 *
 * @param schema The schema to compile
 * @param options Validation options
 * @returns An optimized validation function
 */
export const compileSchema = (
  schema: TSchema,
  options: ValidateOptions = {},
): (value: unknown) => unknown => {
  const coerce = options.coerce ?? false
  const basePath = options.path ?? 'value'

  try {
    let code = `return function(value) {\n`
    const schemaMap: Record<number, TSchema> = {}
    let varCounter = 0

    const fail = (p: string, msg: string, customError?: string) => {
      const err = customError
        ? customError.replace(/"/g, '\\"')
        : `${p}: ${msg.replace(/"/g, '\\"')}`
      return `throw new helpers.ValidationError("${err}");`
    }

    const gen = (
      s: TSchema & Record<string, unknown>,
      valRef: string,
      p: string,
      depth: number,
    ) => {
      const indent = '  '.repeat(depth)

      if (s.default !== undefined || s.optional) {
        code += `${indent}if (${valRef} === undefined) {\n`
        if (s.default !== undefined) {
          code += `${indent}  ${valRef} = ${JSON.stringify(s.default)};\n`
        }
        code += `${indent}} else {\n`
      } else {
        code += `${indent}if (${valRef} === undefined) ${fail(p, 'Required property', s.error)}\n`
      }

      const d = (s.default !== undefined || s.optional) ? depth + 1 : depth
      const ind = '  '.repeat(d)

      switch (s.type) {
        case 'string':
          code += `${ind}if (typeof ${valRef} !== 'string') ${
            fail(p, 'Expected string', s.error)
          }\n`
          if (s.minLength !== undefined) {
            code += `${ind}if (${valRef}.length < ${s.minLength}) ${
              fail(p, `Expected string length >= ${s.minLength}`, s.error)
            }\n`
          }
          if (s.maxLength !== undefined) {
            code += `${ind}if (${valRef}.length > ${s.maxLength}) ${
              fail(p, `Expected string length <= ${s.maxLength}`, s.error)
            }\n`
          }
          if (s.pattern !== undefined) {
            code += `${ind}if (!new RegExp(${JSON.stringify(s.pattern)}).test(${valRef})) ${
              fail(p, `Expected string to match pattern ${s.pattern}`, s.error)
            }\n`
          }
          if (s.format !== undefined) {
            code += `${ind}if (!helpers.checkFormat(${JSON.stringify(s.format)}, ${valRef})) ${
              fail(p, `Expected string with format '${s.format}'`, s.error)
            }\n`
          }
          break

        case 'number':
        case 'integer':
        case 'numeric':
          if (coerce || s.type === 'numeric') {
            code += `${ind}if (typeof ${valRef} === 'string' && ${valRef}.trim() !== '') {\n`
            code += `${ind}  const parsed = Number(${valRef});\n`
            code += `${ind}  if (!Number.isNaN(parsed)) ${valRef} = parsed;\n`
            code += `${ind}}\n`
          }
          code += `${ind}if (typeof ${valRef} !== 'number' || Number.isNaN(${valRef})) ${
            fail(p, 'Expected number', s.error)
          }\n`
          if (s.type === 'integer') {
            code += `${ind}if (!Number.isInteger(${valRef})) ${
              fail(p, 'Expected integer', s.error)
            }\n`
          }
          if (s.minimum !== undefined) {
            code += `${ind}if (${valRef} < ${s.minimum}) ${
              fail(p, `Expected number >= ${s.minimum}`, s.error)
            }\n`
          }
          if (s.maximum !== undefined) {
            code += `${ind}if (${valRef} > ${s.maximum}) ${
              fail(p, `Expected number <= ${s.maximum}`, s.error)
            }\n`
          }
          if (s.multipleOf !== undefined) {
            code += `${ind}if (${valRef} % ${s.multipleOf} !== 0) ${
              fail(p, `Expected multiple of ${s.multipleOf}`, s.error)
            }\n`
          }
          break

        case 'boolean':
          if (coerce) {
            code += `${ind}if (${valRef} === 'true') ${valRef} = true;\n`
            code += `${ind}else if (${valRef} === 'false') ${valRef} = false;\n`
          }
          code += `${ind}if (typeof ${valRef} !== 'boolean') ${
            fail(p, 'Expected boolean', s.error)
          }\n`
          break

        case 'object':
          code +=
            `${ind}if (typeof ${valRef} !== 'object' || ${valRef} === null || Array.isArray(${valRef})) ${
              fail(p, 'Expected object', s.error)
            }\n`
          for (
            const [key, prop] of Object.entries(
              s.properties as Record<string, TSchema & Record<string, unknown>>,
            )
          ) {
            const safeKey = JSON.stringify(key)
            code += `${ind}let _val_${depth}_${key} = ${valRef}[${safeKey}];\n`
            gen(prop, `_val_${depth}_${key}`, `${p}.${key}`, d + 1)
            code +=
              `${ind}if (_val_${depth}_${key} !== undefined) ${valRef}[${safeKey}] = _val_${depth}_${key};\n`
          }

          if (s.additionalProperties === false) {
            code += `${ind}for (const key of Object.keys(${valRef})) {\n`
            code += `${ind}  if (!${
              JSON.stringify(Object.keys(s.properties as object))
            }.includes(key)) ${fail(`${p}.\${key}`, 'Unexpected property', s.error)}\n`
            code += `${ind}}\n`
          }
          break

        default:
          code +=
            `${ind}${valRef} = helpers.check(helpers.schemaMap[${varCounter}], ${valRef}, "${p}", ${coerce});\n`
          schemaMap[varCounter] = s
          varCounter++
          break
      }

      if (s.default !== undefined || s.optional) {
        code += `${indent}}\n`
      }
    }

    code += `  let _root = value;\n`
    gen(schema as TSchema & Record<string, unknown>, '_root', basePath, 1)
    code += `  return _root;\n`
    code += `}\n`

    const builder = new Function('helpers', code)
    const compiledFn = builder({ checkFormat, checkFile, ValidationError, check, schemaMap })

    return (value: unknown) => compiledFn(value)
  } catch (_err) {
    // Fallback if 'new Function' fails (e.g. CSP)
    return (value: unknown) => validate(schema, value, options)
  }
}
