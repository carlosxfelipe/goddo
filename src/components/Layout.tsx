import { HtmlString } from '@goddo/html'

export function Layout({ children }: { children: unknown }) {
  const page = (
    <html lang='en'>
      <head>
        <meta charset='utf-8' />
        <meta name='viewport' content='width=device-width, initial-scale=1' />
        <title>My Todos</title>
        <link
          rel='stylesheet'
          href='https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.classless.min.css'
        />
        <script src='https://unpkg.com/@phosphor-icons/web'></script>
        <script defer src='https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js'></script>
        <script src='https://unpkg.com/htmx.org@1.9.12'></script>
        <script src='https://unpkg.com/htmx.org/dist/ext/json-enc.js'></script>
        <style>
          {`html { font-size: 14px; }`}
        </style>
      </head>
      <body>
        {children}
      </body>
    </html>
  )
  return new HtmlString('<!DOCTYPE html>\n' + page)
}
