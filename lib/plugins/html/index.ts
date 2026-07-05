import type { Goddo } from 'goddo'
import { HtmlString } from './jsx-runtime.ts'

import type { Context } from '@goddo/context'

export const html = () => (app: Goddo) =>
  app.onAfterHandle((ctx: Context & { response?: unknown }) => {
    // If response is an HtmlString (or a resolved Promise of HtmlString),
    // convert it to a standard Response object with text/html.
    if (ctx.response && ctx.response instanceof HtmlString) {
      if (!ctx.set.headers['content-type']) {
        ctx.set.headers['content-type'] = 'text/html;charset=utf-8'
      }
      return new Response(ctx.response.toString(), {
        status: ctx.set.status ?? 200,
        headers: ctx.set.headers,
      })
    }
  })

export { HtmlString }
