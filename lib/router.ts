import type { Handler, HTTPMethod, LocalHooks } from '@goddo/types'

interface RouteData {
  handler: Handler
  hooks: LocalHooks
}

interface RadixNode {
  part: string
  store: Partial<Record<HTTPMethod, RouteData>> | null
  static: Map<string, RadixNode> | null
  param: RadixNode | null
  paramName: string | null
  wildcard: RouteData | null
  wildcardMethod: Partial<Record<HTTPMethod, RouteData>> | null
}

const createNode = (part = ''): RadixNode => ({
  part,
  store: null,
  static: null,
  param: null,
  paramName: null,
  wildcard: null,
  wildcardMethod: null,
})

export interface RouteMatch {
  handler: Handler
  hooks: LocalHooks
  params: Record<string, string>
}

export class Router {
  root: RadixNode = createNode()

  add(method: HTTPMethod, path: string, handler: Handler, hooks: LocalHooks = {}): void {
    if (path === '') path = '/'

    const segments = path.split('/').filter((segment) => segment !== '')
    let node = this.root

    for (const segment of segments) {
      if (segment === '*') {
        if (!node.wildcardMethod) node.wildcardMethod = {}
        node.wildcardMethod[method] = { handler, hooks }
        return
      }

      if (segment.startsWith(':')) {
        if (!node.param) {
          node.param = createNode(segment)
          node.paramName = segment.slice(1)
        }
        node = node.param
        continue
      }

      if (!node.static) node.static = new Map()

      let child = node.static.get(segment)
      if (!child) {
        child = createNode(segment)
        node.static.set(segment, child)
      }
      node = child
    }

    if (!node.store) node.store = {}
    node.store[method] = { handler, hooks }
  }

  find(method: HTTPMethod, path: string): RouteMatch | null {
    const segments = path.split('/').filter((segment) => segment !== '')
    const params: Record<string, string> = {}

    let node: RadixNode = this.root
    let fallbackWildcard: RouteData | null = null
    let fallbackPath = ''

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i]!

      const wildcardStore = node.wildcardMethod?.[method] ?? node.wildcardMethod?.ALL
      if (wildcardStore) {
        fallbackWildcard = wildcardStore
        fallbackPath = segments.slice(i).join('/')
      }

      const staticChild = node.static?.get(segment)
      if (staticChild) {
        node = staticChild
        continue
      }

      if (node.param) {
        params[node.paramName!] = decodeURIComponent(segment)
        node = node.param
        continue
      }

      if (fallbackWildcard) {
        params['*'] = fallbackPath
        return { ...fallbackWildcard, params }
      }

      return null
    }

    const store = node.store?.[method] ?? node.store?.ALL
    if (store) return { ...store, params }

    const wildcardStore = node.wildcardMethod?.[method] ?? node.wildcardMethod?.ALL
    if (wildcardStore) {
      params['*'] = ''
      return { ...wildcardStore, params }
    }

    if (fallbackWildcard) {
      params['*'] = fallbackPath
      return { ...fallbackWildcard, params }
    }

    return null
  }
}
