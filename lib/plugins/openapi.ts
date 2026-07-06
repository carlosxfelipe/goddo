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
  /** Helper to automatically configure JWT Bearer Auth in securitySchemes */
  bearerAuth?: boolean
  /** UI Provider to render the documentation. Default: 'scalar' */
  provider?: 'scalar' | 'swagger-ui'
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

    if (route.hooks.detail?.hide === true) continue

    const path = toOpenAPIPath(route.path)
    const { hooks } = route

    const { hide: _hide, ...detail } = hooks.detail ?? {}
    const operation: Record<string, unknown> = { ...detail }

    if (!operation.tags) {
      const tag = route.path.split('/')[1]
      if (tag && tag !== '*' && !tag.startsWith(':')) {
        operation.tags = [tag.charAt(0).toUpperCase() + tag.slice(1)]
      }
    }

    const parameters = [
      ...paramsIn(hooks.params, 'path'),
      ...paramsIn(hooks.query, 'query'),
      ...paramsIn(hooks.headers, 'header'),
    ]

    const pathParams = route.path.split('/')
      .filter((s) => s.startsWith(':') || s === '*')
      .map((s) => s === '*' ? 'wildcard' : s.slice(1))

    for (const p of pathParams) {
      if (
        !parameters.some((param: Record<string, unknown>) =>
          param.name === p && param.in === 'path'
        )
      ) {
        parameters.push({
          name: p,
          in: 'path',
          required: true,
          schema: { type: 'string' },
        })
      }
    }

    if (operation.parameters) {
      operation.parameters = [...parameters, ...(operation.parameters as unknown[])]
    } else if (parameters.length > 0) {
      operation.parameters = parameters
    }

    if (hooks.body) {
      const contentType = typeof hooks.type === 'string' ? hooks.type : 'application/json'
      operation.requestBody = {
        required: true,
        content: { [contentType]: { schema: toJSONSchema(hooks.body) } },
      }
    }

    const responses: Record<string, unknown> = {}
    if (hooks.response) {
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
    } else {
      responses['200'] = { description: 'OK' }
    }

    if (hooks.body || hooks.query || hooks.params || hooks.headers) {
      if (!responses['400']) {
        responses['400'] = { description: 'Bad Request (Validation Error)' }
      }
    }
    if (operation.responses) {
      operation.responses = { ...responses, ...(operation.responses as Record<string, unknown>) }
    } else {
      operation.responses = responses
    }

    if (!paths[path]) paths[path] = {}
    paths[path][route.method.toLowerCase()] = operation
  }

  return paths
}

const swaggerHTML = (specUrl: string, title: string, version: string): string =>
  `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@${version}/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@${version}/swagger-ui-bundle.js" crossorigin></script>
    <script>
      window.onload = () => {
        window.ui = SwaggerUIBundle({
          url: '${specUrl}',
          dom_id: '#swagger-ui',
        });
      };
    </script>
  </body>
</html>`

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
  const info = {
    title: 'Goddo Documentation',
    version: '0.0.0',
    description: 'Development documentation',
    ...options.documentation?.info,
  }
  const exclude = [...(options.exclude ?? []), path, specPath]

  const documentation = { ...options.documentation }
  if (options.bearerAuth) {
    documentation.components = {
      ...(documentation.components as object ?? {}),
      securitySchemes: {
        ...(((documentation.components as Record<string, unknown>)?.securitySchemes as object) ??
          {}),
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    }
  }

  return app
    .get(path, ({ set }) => {
      set.headers['content-type'] = 'text/html; charset=utf-8'
      if (options.provider === 'swagger-ui') {
        const uiVersion = options.version ?? '5.17.14'
        return swaggerHTML(specPath, info.title, uiVersion)
      }
      const uiVersion = options.version ?? 'latest'
      return scalarHTML(specPath, info.title, uiVersion, options.scalarConfig)
    })
    .get(specPath, () => ({
      openapi: '3.0.3',
      ...documentation,
      info,
      paths: buildPaths(app.routes, exclude),
    }))
}

export default openapi
