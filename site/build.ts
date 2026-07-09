/**
 * Static export for hosts without a Deno runtime (e.g. Netlify).
 *
 * All pages of this site are fully static (no per-request state), so each
 * route is rendered once at build time into a plain `.html` file under
 * `dist/`, using the clean-URL convention `<route>/index.html`.
 */
import { renderHome } from './pages/home.tsx'
import { renderDocs } from './pages/docs.tsx'
import { renderPlugins } from './pages/plugins.tsx'
import { renderExamples } from './pages/examples.tsx'

const OUT_DIR = 'dist'

const pages: { path: string; html: unknown }[] = [
  { path: 'index.html', html: renderHome() },
  { path: 'docs/index.html', html: renderDocs() },
  { path: 'plugins/index.html', html: renderPlugins() },
  { path: 'examples/index.html', html: await renderExamples() },
]

await Deno.remove(OUT_DIR, { recursive: true }).catch(() => {})
await Deno.mkdir(OUT_DIR, { recursive: true })

for (const page of pages) {
  const target = `${OUT_DIR}/${page.path}`
  await Deno.mkdir(target.slice(0, target.lastIndexOf('/')), { recursive: true })
  await Deno.writeTextFile(target, String(page.html))
  console.log(`wrote ${target}`)
}

console.log(`\nStatic export ready in ./${OUT_DIR}`)
