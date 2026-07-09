# Goddo Site

Documentation and examples site for [Goddo](../README.md), served by the framework itself
(dogfooding) with Server-Side Rendering via `@goddo/html`.

This is a standalone Deno project inside the monorepo — isolated to keep its context separate from
the API/demo in `../src/`. It imports packages from `../packages/*` directly via relative paths (see
`imports` in `deno.json`), without going through JSR and without a build step.

## Stack (100% via CDN, no build step)

- [Pico CSS](https://picocss.com) (`classless`) — semantic base styles
- [Phosphor Icons](https://phosphoricons.com) — icons
- [Alpine.js](https://alpinejs.dev) — interactivity (copy code, navigation, etc.)

## Running

```sh
deno task dev    # with watch
# or
deno task start
```

Open `http://localhost:3001` (port configurable via `PORT`).

## Deploy (Netlify / any static host)

All pages are static (no per-request state), so everything can be exported to plain HTML and
published on any static host — Netlify does not run a Deno server directly, but serves static files
just fine:

```sh
deno task build   # generates ./dist with index.html, docs/index.html, plugins/index.html, examples/index.html
```

Then publish the `dist/` folder, for example via Netlify CLI:

```sh
netlify deploy --dir=dist --prod
```

`netlify.toml` already points to `publish = "dist"` (no build command — the build is done locally
with Deno before deploying).

## Structure

- `main.ts` — entrypoint, starts the server (local/dev use)
- `build.ts` — static export to `dist/` (used for deploy)
- `app.tsx` — route definitions
- `pages/` — each site page (Home, Docs, Plugins, Examples)
- `components/` — `Layout` (shared head/nav/footer) and `Code` (code block with copy button)
