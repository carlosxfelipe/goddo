/**
 * @module
 * router.ts module for @goddo/core
 */

import type { Handler, HTTPMethod, LocalHooks } from './types.ts'

/** Data stored at a matching route node. */
export interface RouteData {
  /** The handler function. */
  handler: Handler
  /** The local hooks. */
  hooks: LocalHooks
}

/** Internal Radix Tree node structure. */
export interface RadixNode {
  /** The string part of the path segment. */
  part: string
  /** The handlers registered at this node. */
  store: Partial<Record<HTTPMethod, RouteData>> | null
  /** Static child nodes. */
  static: Map<string, RadixNode> | null
  /** Parameterized child node. */
  param: RadixNode | null
  /** Name of the parameter. */
  paramName: string | null
  /** Wildcard fallback handlers. */
  wildcard: RouteData | null
  /** Wildcard handlers by method. */
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

/** Represents a matched route during find(). */
export interface RouteMatch {
  /** The resolved handler function. */
  handler: Handler
  /** The resolved local hooks. */
  hooks: LocalHooks
  /** The extracted path parameters. */
  params: Record<string, string>
}

/**
 * High-performance Radix Tree router used by Goddo.
 */
export class Router {
  /** The root node of the routing tree. */
  root: RadixNode = createNode()

  /**
   * Registers a new route in the tree.
   * @param method The HTTP method for the route.
   * @param path The URL path pattern.
   * @param handler The function to handle the request.
   * @param hooks Local lifecycle hooks for this specific route.
   */
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

  /**
   * Finds a matching route for the given HTTP method and path.
   * @param method The requested HTTP method.
   * @param path The requested URL path.
   * @returns The route match details (handler, hooks, params) or null if not found.
   */
  find(method: HTTPMethod, path: string): RouteMatch | null {
    const params: Record<string, string> = {}

    let node: RadixNode = this.root
    let fallbackWildcard: RouteData | null = null
    let fallbackPath = ''

    let i = 0
    const length = path.length

    // Skip leading slash
    if (i < length && path[i] === '/') i++

    while (i < length) {
      // Skip any consecutive slashes
      while (i < length && path[i] === '/') i++
      if (i >= length) break

      // Find end of current segment
      const start = i
      while (i < length && path[i] !== '/') i++
      const segment = path.slice(start, i)

      const wildcardStore = node.wildcardMethod?.[method] ?? node.wildcardMethod?.ALL
      if (wildcardStore) {
        fallbackWildcard = wildcardStore
        fallbackPath = path.slice(start)
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
