import type { Route } from '@goddo/types'
import type { Goddo } from 'goddo'
import type { TArray, TObject, TSchema } from '@goddo/schema'

export interface LlmsTxtOptions {
  /** Path to serve the markdown documentation. Default: '/llms.txt' */
  path?: string
  /** Title of the API documentation */
  title?: string
  /** Description of the API documentation */
  description?: string
  /** Paths excluded from the specification */
  exclude?: (string | RegExp)[]
}

const formatSchemaProperty = (schema: TSchema, indent = ''): string => {
  if (schema.type === 'object') {
    const props = Object.entries((schema as TObject).properties || {})
    if (props.length === 0) return 'object'
    return '\n' + props.map(([name, prop]) => {
      const p = prop as TSchema
      const req = !(p.optional || p.default !== undefined) ? ' *(required)*' : ''
      const desc = p.description ? ` - ${p.description}` : ''

      if (p.type === 'object' || p.type === 'array') {
        const typeStr = formatSchemaProperty(p, indent + '  ')
        return `${indent}- \`${name}\` (${p.type})${req}${desc}${typeStr}`
      }
      return `${indent}- \`${name}\` (${p.type})${req}${desc}`
    }).join('\n')
  }
  if (schema.type === 'array') {
    const itemSchema = (schema as TArray).items
    if (itemSchema?.type === 'object' || itemSchema?.type === 'array') {
      return `\n${indent}- Array of:${formatSchemaProperty(itemSchema, indent + '  ')}`
    }
    return `Array<${itemSchema?.type || 'unknown'}>`
  }
  return schema.type || 'unknown'
}

const buildMarkdown = (
  routes: Route[],
  options: LlmsTxtOptions,
): string => {
  const lines: string[] = []

  if (options.title) lines.push(`# ${options.title}`)
  if (options.description) lines.push(`> ${options.description}\n`)

  const exclude = options.exclude ?? [options.path ?? '/llms.txt']

  for (const route of routes) {
    if (route.method === 'ALL' || route.method === 'CONNECT' || route.method === 'TRACE') continue
    if ((route.hooks as Record<string, unknown>)['_ws']) continue
    if (
      exclude.some((pattern) =>
        typeof pattern === 'string' ? pattern === route.path : pattern.test(route.path)
      )
    ) continue

    const path = route.path.replace(/:([a-zA-Z0-9_]+)/g, '{$1}')
    lines.push(`## \`${route.method}\` ${path}`)

    const detail = route.hooks.detail || {}
    if (detail.summary) lines.push(`**Summary:** ${detail.summary}`)
    if (detail.description) lines.push(`**Description:** ${detail.description}`)
    lines.push('')

    const hasParams = route.hooks.params || route.hooks.query || route.hooks.headers
    if (hasParams) {
      lines.push('### Parameters')
      const printParams = (schema: TSchema | undefined, loc: string) => {
        if (!schema || schema.type !== 'object') return
        for (const [name, prop] of Object.entries((schema as TObject).properties)) {
          const p = prop as TSchema
          const req = loc === 'path' ? true : !(p.optional || p.default !== undefined)
          const desc = p.description ? ` - ${p.description}` : ''
          lines.push(`- \`${name}\` (${loc}): ${p.type}${req ? ' *(required)*' : ''}${desc}`)
        }
      }
      printParams(route.hooks.params, 'path')
      printParams(route.hooks.query, 'query')
      printParams(route.hooks.headers, 'header')
      lines.push('')
    }

    if (route.hooks.body) {
      lines.push('### Request Body')
      if (route.hooks.body.type === 'object') {
        lines.push(formatSchemaProperty(route.hooks.body).trim())
      } else {
        lines.push(`- ${route.hooks.body.type}`)
      }
      lines.push('')
    }
  }

  return lines.join('\n').trim()
}

/**
 * Generates an \`llms.txt\` markdown file from the registered routes,
 * acting as an AI-friendly API documentation endpoint.
 *
 * \`\`\`ts
 * import { Goddo } from 'goddo'
 * import { llmstxt } from '@goddo/llms-txt'
 *
 * new Goddo().use(llmstxt()).listen(3000)
 * \`\`\`
 */
export const llmstxt = (options: LlmsTxtOptions = {}) => (app: Goddo): Goddo => {
  const path = options.path ?? '/llms.txt'
  const title = options.title ?? 'API Documentation'
  const description = options.description ?? 'LLM-friendly API Documentation'
  const exclude = [...(options.exclude ?? []), path]

  let cachedDocs: string | null = null

  return app.get(path, ({ set }) => {
    set.headers['content-type'] = 'text/plain; charset=utf-8'
    if (!cachedDocs) {
      cachedDocs = buildMarkdown(app.routes, { ...options, path, title, description, exclude })
    }
    return cachedDocs
  }, {
    detail: { summary: 'LLMs txt Documentation', tags: ['Documentation'] },
  })
}

export default llmstxt
