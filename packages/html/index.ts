/**
 * @module
 * HTML and JSX rendering plugin for Goddo (equivalent to @elysiajs/html).
 *
 * Automatically intercepts JSX components and `HtmlString` objects returned
 * from route handlers, rendering them to strings and setting the appropriate
 * `Content-Type: text/html` headers.
 */
import { HtmlString } from './jsx-runtime.ts'

import type { Context } from '@goddo/core/context'

/**
 * HTML plugin to render JSX or HTML strings.
 */
export const html =
  (): <App extends import('@goddo/core/types').AnyGoddo>(app: App) => App =>
  <App extends import('@goddo/core/types').AnyGoddo>(app: App): App =>
    app.onAfterHandle((ctx: Context & { response?: unknown }) => {
      // If response is an HtmlString (or a resolved Promise of HtmlString),
      // convert it to a standard Response object with text/html.
      if (ctx.response && ctx.response instanceof HtmlString) {
        if (!ctx.set.headers['content-type']) {
          ctx.set.headers['content-type'] = 'text/html;charset=utf-8'
        }
        return ctx.response.toString()
      }
    })

export { HtmlString }
