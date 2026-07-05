import { toJSONSchema } from '@goddo/schema'
import type { TObject, TSchema } from '@goddo/schema'
import type { Route } from '@goddo/types'
import type { Goddo } from 'goddo'

export interface OpenAPIOptions {
  /** Path where the documentation is served. Default: '/docs' */
  path?: string
  /** Version of @scalar/api-reference on the CDN. Default: 'latest' */
  version?: string
  /** Extra configuration passed to Scalar (data-configuration) */
  scalarConfig?: Record<string, unknown>
  /** Base OpenAPI document (info, tags, servers, components, ...) */
  documentation?: {
    info?: { title?: string; version?: string; description?: string; [key: string]: unknown }
    [key: string]: unknown
  }
  /** Paths excluded from the specification */
  exclude?: (string | RegExp)[]
}

const toOpenAPIPath = (path: string): string =>
  path
    .split('/')
    .map((segment) =>
      segment.startsWith(':') ? `{${segment.slice(1)}}` : segment === '*' ? '{wildcard}' : segment
    )
    .join('/')

const paramsIn = (
  schema: TSchema | undefined,
  location: 'path' | 'query' | 'header',
): Record<string, unknown>[] => {
  if (!schema || schema.type !== 'object') return []

  return Object.entries((schema as TObject).properties).map(([name, property]) => ({
    name,
    in: location,
    required: location === 'path' ? true : !property.optional && property.default === undefined,
    schema: toJSONSchema(property),
  }))
}

const buildPaths = (
  routes: Route[],
  exclude: (string | RegExp)[],
): Record<string, Record<string, unknown>> => {
  const paths: Record<string, Record<string, unknown>> = {}

  for (const route of routes) {
    if (route.method === 'ALL' || route.method === 'CONNECT' || route.method === 'TRACE') continue
    if (route.hooks['_ws']) continue // WebSocket endpoints have no HTTP semantics
    if (
      exclude.some((pattern) =>
        typeof pattern === 'string' ? pattern === route.path : pattern.test(route.path)
      )
    ) continue

    const path = toOpenAPIPath(route.path)
    const { hooks } = route

    const operation: Record<string, unknown> = { ...hooks.detail }

    const parameters = [
      ...paramsIn(hooks.params, 'path'),
      ...paramsIn(hooks.query, 'query'),
      ...paramsIn(hooks.headers, 'header'),
    ]
    if (parameters.length > 0) operation.parameters = parameters

    if (hooks.body) {
      operation.requestBody = {
        required: true,
        content: { 'application/json': { schema: toJSONSchema(hooks.body) } },
      }
    }

    if (hooks.response) {
      const responses: Record<string, unknown> = {}
      if (typeof hooks.response === 'object' && !('type' in hooks.response)) {
        for (const [status, schema] of Object.entries(hooks.response)) {
          responses[status] = {
            description: status === '200' ? 'OK' : 'Response',
            content: {
              'application/json': {
                schema: toJSONSchema(schema as import('@goddo/schema').TSchema),
              },
            },
          }
        }
      } else {
        responses['200'] = {
          description: 'OK',
          content: {
            'application/json': {
              schema: toJSONSchema(hooks.response as import('@goddo/schema').TSchema),
            },
          },
        }
      }
      operation.responses = responses
    } else {
      operation.responses = { 200: { description: 'OK' } }
    }

    if (!paths[path]) paths[path] = {}
    paths[path][route.method.toLowerCase()] = operation
  }

  return paths
}

const scalarHTML = (specUrl: string, title: string, version: string, config: unknown): string =>
  `<!doctype html>
<html>
  <head>
    <title>${title}</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>body { margin: 0 }</style>
  </head>
  <body>
    <script
      id="api-reference"
      data-url="${specUrl}"
      data-configuration='${JSON.stringify(config ?? {}).replaceAll("'", '&#39;')}'
    ></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference@${version}"></script>
  </body>
</html>`

/**
 * OpenAPI documentation plugin with Scalar (equivalent to @elysiajs/swagger or @elysiajs/openapi).
 *
 * ```ts
 * import { Goddo } from 'goddo'
 * import { openapi } from '@goddo/openapi'
 *
 * new Goddo().use(openapi()).get('/', () => 'hi').listen(3000)
 * // UI:   GET /docs
 * // Spec: GET /docs/json
 * ```
 */
export const openapi = (options: OpenAPIOptions = {}) => (app: Goddo): Goddo => {
  const path = options.path ?? '/docs'
  const specPath = `${path}/json`
  const version = options.version ?? 'latest'
  const info = {
    title: 'Goddo Documentation',
    version: '0.0.0',
    description: 'Development documentation',
    ...options.documentation?.info,
  }
  const exclude = [...(options.exclude ?? []), path, specPath]

  return app
    .get(path, ({ set }) => {
      set.headers['content-type'] = 'text/html; charset=utf-8'
      return scalarHTML(specPath, info.title, version, options.scalarConfig)
    })
    .get(specPath, () => ({
      openapi: '3.0.3',
      ...options.documentation,
      info,
      paths: buildPaths(app.routes, exclude),
    }))
}

export default openapi
