import { Layout } from '../components/layout.tsx'
import { Code } from '../components/code.tsx'

// Read the real demo source files verbatim (ipsis literis), so the docs
// never drift from the actual code in ../src/.
const INDEX_TS_URL = new URL('../../src/index.ts', import.meta.url)
const APP_TSX_URL = new URL('../../src/app.tsx', import.meta.url)
const PAGE_TSX_URL = new URL('../../src/page.tsx', import.meta.url)
const LAYOUT_TSX_URL = new URL('../../src/components/Layout.tsx', import.meta.url)
const TODOITEM_TSX_URL = new URL('../../src/components/TodoItem.tsx', import.meta.url)

export async function renderExamples() {
  const [indexSource, appSource, pageSource, layoutSource, todoItemSource] = await Promise.all([
    Deno.readTextFile(INDEX_TS_URL),
    Deno.readTextFile(APP_TSX_URL),
    Deno.readTextFile(PAGE_TSX_URL),
    Deno.readTextFile(LAYOUT_TSX_URL),
    Deno.readTextFile(TODOITEM_TSX_URL),
  ])

  return Layout({
    title: 'Examples',
    description: 'Practical Goddo examples: Todo API with validation, TSX SSR, and OpenAPI.',
    active: '/examples',
    children: (
      <>
        <h1 style='display: flex; align-items: center; gap: 0.5rem;'>
          <i class='ph ph-code' style='color: var(--pico-primary);'></i> Examples
        </h1>
        <p style='color: var(--pico-muted-color);'>
          The official Goddo demo (in <code>src/</code>{' '}
          in the repository) is a full Todo API: CRUD with validation via{' '}
          <code>t</code>, automatic documentation with <code>@goddo/openapi</code>, an{' '}
          <code>/llms.txt</code>{' '}
          endpoint for AI agents, and a true HATEOAS / HTMX architecture with TSX Server-Side
          Rendering.
        </p>
        <div style='background-color: var(--pico-form-element-background); padding: 1rem; border-left: 4px solid var(--pico-primary); margin-bottom: 2rem;'>
          <strong>Standalone Demo:</strong>{' '}
          If you want to see an example using the published JSR packages, check out the{' '}
          <a
            href='https://github.com/carlosxfelipe/goddo-example'
            target='_blank'
            rel='noopener'
            style='text-decoration: none;'
          >
            goddo-example
          </a>{' '}
          repository.
        </div>

        <article>
          <h2 style='display: flex; align-items: center; gap: 0.5rem;'>
            <i class='ph ph-rocket-launch' style='color: var(--pico-primary);'></i> Entrypoint
          </h2>
          <p>
            <code>src/index.ts</code> is the file that actually starts the server: it imports the
            {' '}
            <code>app</code> instance defined in <code>src/app.tsx</code> and calls{' '}
            <code>.listen()</code> on it. Running <code>deno task dev</code> (or{' '}
            <code>deno task start</code>) executes this file:
          </p>
          <Code lang='ts'>{indexSource}</Code>
        </article>

        <article style='margin-top: 2rem;'>
          <h2 style='display: flex; align-items: center; gap: 0.5rem;'>
            <i class='ph ph-list-checks' style='color: var(--pico-primary);'></i>{' '}
            API & Content Negotiation
          </h2>
          <p>
            The <code>src/app.tsx</code>{' '}
            file contains the API routes. Notice how Goddo easily handles
            <strong>Content Negotiation</strong>: if the request comes from HTMX (checking the{' '}
            <code>HX-Request</code>{' '}
            header), it returns the rendered TSX component fragment. Otherwise, it functions as a
            standard JSON REST API.
          </p>
          <Code lang='tsx'>{appSource}</Code>
        </article>

        <article style='margin-top: 2rem;'>
          <h2 style='display: flex; align-items: center; gap: 0.5rem;'>
            <i class='ph ph-browser' style='color: var(--pico-primary);'></i>{' '}
            HATEOAS Interface (HTMX + Alpine.js)
          </h2>
          <p>
            The UI is split into components to enable hypermedia-driven interactions.
            <code>src/page.tsx</code> orchestrates the page:
          </p>
          <Code lang='tsx'>{pageSource}</Code>

          <p style='margin-top: 1rem;'>
            <code>src/components/TodoItem.tsx</code>{' '}
            is a standalone component that replaces itself in the DOM via{' '}
            <code>hx-swap="outerHTML"</code> when toggled, edited, or deleted:
          </p>
          <Code lang='tsx'>{todoItemSource}</Code>

          <p style='margin-top: 1rem;'>
            <code>src/components/Layout.tsx</code> encapsulates the document boilerplate:
          </p>
          <Code lang='tsx'>{layoutSource}</Code>
        </article>

        <article style='margin-top: 2rem;'>
          <h2 style='display: flex; align-items: center; gap: 0.5rem;'>
            <i class='ph ph-terminal-window' style='color: var(--pico-primary);'></i>{' '}
            Running the demo locally
          </h2>
          <Code lang='sh'>
            {`git clone https://github.com/carlosxfelipe/goddo.git
cd goddo
deno task dev`}
          </Code>
          <p style='color: var(--pico-muted-color);'>
            The demo runs at <code>http://localhost:3000</code>. The UI is at{' '}
            <code>/page</code>, the OpenAPI documentation at <code>/docs</code>{' '}
            and the endpoint for LLMs at <code>/llms.txt</code>.
          </p>
        </article>

        <article style='margin-top: 2rem; background-color: var(--pico-form-element-background); padding: 1.5rem;'>
          <h3 style='display: flex; align-items: center; gap: 0.5rem;'>
            <i class='ph ph-flask' style='color: var(--pico-primary);'></i> Bruno & Benchmarks
          </h3>
          <p style='color: var(--pico-muted-color); margin-bottom: 0.5rem;'>
            The repository also includes API collections for{' '}
            <a href='https://www.usebruno.com/' target='_blank' rel='noopener'>Bruno</a> (in the
            {' '}
            <code>bruno/</code> folder) and a set of performance benchmarks (
            <code>deno task bench</code>) covering routing, compiled handler throughput, and
            compilation overhead.
          </p>
        </article>
      </>
    ),
  })
}
