export type { JSX } from './types.ts'

/** Represents a raw HTML string that should not be escaped. */
export class HtmlString extends String {}

/** JSX Fragment component. */
export const Fragment = Symbol('Fragment')

/**
 * Escapes HTML characters in a string.
 */
export function escapeHtml(str: string): string {
  const matchHtmlRegExp = /["'&<>]/
  const match = matchHtmlRegExp.exec(str)
  if (!match) return str

  let escape
  let html = ''
  let index = 0
  let lastIndex = 0

  for (index = match.index; index < str.length; index++) {
    switch (str.charCodeAt(index)) {
      case 34: // "
        escape = '&quot;'
        break
      case 38: // &
        escape = '&amp;'
        break
      case 39: // '
        escape = '&#39;'
        break
      case 60: // <
        escape = '&lt;'
        break
      case 62: // >
        escape = '&gt;'
        break
      default:
        continue
    }
    if (lastIndex !== index) {
      html += str.substring(lastIndex, index)
    }
    lastIndex = index + 1
    html += escape
  }
  return lastIndex !== index ? html + str.substring(lastIndex, index) : html
}

/**
 * JSX factory function.
 */
export function jsx(type: unknown, props: Record<string, unknown>): unknown {
  if (typeof type === 'function') {
    return type(props)
  }

  let html = type === Fragment ? '' : `<${type}`

  if (type !== Fragment) {
    for (const key in props) {
      if (key === 'children') continue
      const val = props[key]
      if (val === true) html += ` ${key}`
      else if (val !== false && val != null) html += ` ${key}="${escapeHtml(String(val))}"`
    }
    html += '>'
  }

  const children = props.children

  const renderChild = (child: unknown): string | Promise<string> => {
    if (child == null || typeof child === 'boolean') return ''
    if (child instanceof HtmlString) return child.toString()
    if (Array.isArray(child)) {
      const parts = child.map(renderChild)
      if (parts.some((p) => p instanceof Promise)) {
        return Promise.all(parts).then((res) => res.join(''))
      }
      return parts.join('')
    }
    if (child instanceof Promise) {
      return child.then(renderChild)
    }
    if (typeof child === 'string' || typeof child === 'number') {
      return escapeHtml(String(child))
    }
    return escapeHtml(String(child))
  }

  const renderedChildren = renderChild(children)

  if (renderedChildren instanceof Promise) {
    return renderedChildren.then((res) => {
      const final = type === Fragment ? res : html + res + `</${type}>`
      return new HtmlString(final)
    })
  } else {
    const final = type === Fragment ? renderedChildren : html + renderedChildren + `</${type}>`
    return new HtmlString(final)
  }
}

/** JSX factory function for static children. */
export const jsxs: (type: unknown, props: Record<string, unknown>) => unknown = jsx

/** JSX factory function for development. */
export const jsxDEV: (type: unknown, props: Record<string, unknown>) => unknown = jsx
