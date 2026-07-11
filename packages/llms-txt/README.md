# @goddo/llms-txt

LLM-friendly API documentation plugin for the [Goddo](https://jsr.io/@goddo/core) framework.

Generates a `/llms.txt` Markdown endpoint from your registered routes — an AI-readable summary of
your API that large language models can ingest as context.

## Installation

```sh
deno add jsr:@goddo/llms-txt
```

## Usage

```ts
import { Goddo } from '@goddo/core'
import { llmstxt } from '@goddo/llms-txt'

new Goddo()
  .use(llmstxt())
  .get('/users', () => [])
  .listen(3000)

// GET /llms.txt → Markdown API documentation
```

## Options

| Option        | Type                   | Default                            | Description                                      |
| ------------- | ---------------------- | ---------------------------------- | ------------------------------------------------ |
| `path`        | `string`               | `'/llms.txt'`                      | Path to serve the Markdown documentation.        |
| `title`       | `string`               | `'API Documentation'`              | Title shown at the top of the document.          |
| `description` | `string`               | `'LLM-friendly API Documentation'` | Description shown below the title.               |
| `exclude`     | `(string \| RegExp)[]` | `[]`                               | Paths excluded from the generated documentation. |

## Advanced Example

```ts
import { Goddo, t } from '@goddo/core'
import { llmstxt } from '@goddo/llms-txt'

new Goddo()
  .use(llmstxt({
    title: 'Todo API',
    description: 'REST API for managing todos.',
    exclude: ['/health', /^\/internal/],
  }))
  .get('/todos', () => [], {
    detail: { summary: 'List all todos' },
  })
  .post('/todos', ({ body }) => body, {
    body: t.Object({ title: t.String(), done: t.Boolean() }),
    detail: { summary: 'Create a todo' },
  })
  .listen(3000)
```
