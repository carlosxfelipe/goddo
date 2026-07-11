# @goddo/html

HTML and JSX rendering plugin for the [Goddo](https://jsr.io/@goddo/core) framework (equivalent to
`@elysiajs/html`).

Automatically intercepts JSX components and `HtmlString` objects returned from route handlers,
rendering them to strings and setting the appropriate `Content-Type: text/html` headers.

## Installation

```sh
deno add jsr:@goddo/html
```

## Usage

```tsx
import { Goddo } from '@goddo/core'
import { html } from '@goddo/html'

new Goddo()
  .use(html())
  .get('/', () => (
    <html lang='en'>
      <body>
        <h1>Hello Goddo JSX!</h1>
      </body>
    </html>
  ))
  .listen(3000)
```

## Configuration

To use Goddo's JSX engine, update your `deno.json` or `tsconfig.json`:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@goddo/html"
  }
}
```
