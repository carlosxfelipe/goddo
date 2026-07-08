# @goddo/core

The core routing and context engine for the Goddo web framework.

## Overview

`@goddo/core` provides the fundamental building blocks for creating high-performance, type-safe APIs
using Goddo. It features an incredibly fast router, built-in schema validation, and a highly
composable plugin architecture. It offers a Developer Experience (DX) and syntax almost 1:1 with
ElysiaJS, optimized for the Deno ecosystem.

## Installation

```bash
deno add jsr:@goddo/core
```

## Basic Usage

```ts
import { Goddo, t } from '@goddo/core'

const app = new Goddo()
  .get('/', () => 'Hello, Goddo!')
  .post('/user', ({ body }) => {
    return { created: body.name }
  }, {
    body: t.Object({
      name: t.String(),
    }),
  })

app.listen(3000)
```

## Documentation

For full documentation and advanced usage (including JSX rendering, static files, OpenAPI, and other
official plugins), please refer to the
[main Goddo repository](https://github.com/carlosxfelipe/goddo).

## License

MIT
