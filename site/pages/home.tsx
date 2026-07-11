import { Layout } from '../components/layout.tsx'
import { Code } from '../components/code.tsx'

const FEATURES = [
  {
    icon: 'ph-lightning',
    title: 'Zero build step',
    text: 'Router, context, and validation compiled Ahead-Of-Time at listen(), no bundler.',
  },
  {
    icon: 'ph-shield-check',
    title: 'End-to-End Type Safety',
    text: 'Types inferred from handler to client (Treaty), with end-to-end autocompletion.',
  },
  {
    icon: 'ph-puzzle-piece',
    title: '1:1 Syntax with ElysiaJS',
    text: 'DX practically identical to Elysia, running 100% on native Deno and Web APIs.',
  },
  {
    icon: 'ph-package',
    title: 'Zero npm dependencies',
    text: 'Built only with Deno and Web Platform APIs (Web Crypto, Fetch, WebSocket...).',
  },
  {
    icon: 'ph-plugs',
    title: 'Official plugins',
    text: 'HTML SSR, OpenAPI, JWT, CORS, Rate Limit, Shield, CSRF, Cron, Bearer, and more.',
  },
  {
    icon: 'ph-gauge',
    title: 'Performance',
    text: 'Static routes in O(1) Map, pre-merged hooks, and V8-optimized context.',
  },
]

export function renderHome() {
  return Layout({
    title: 'Home',
    description: 'Goddo — an ergonomic web framework for Deno, with 1:1 ElysiaJS DX.',
    active: '/',
    children: (
      <>
        <section style='text-align: center; padding: 2rem 0 3rem;'>
          <span class='badge'>
            <i class='ph ph-sparkle'></i> Goddo Kurosu – God Cloths
          </span>
          <h1 style='margin-top: 1rem; font-size: 2.5rem;'>
            An{' '}
            <span style='background: linear-gradient(90deg, var(--pico-primary), var(--pico-primary-hover)); -webkit-background-clip: text; -webkit-text-fill-color: transparent;'>
              ergonomic
            </span>{' '}
            web framework for Deno
          </h1>
          <p style='max-width: 640px; margin: 1rem auto; color: var(--pico-muted-color);'>
            Recreates the syntax and Developer Experience of{' '}
            <a
              href='https://elysiajs.com'
              target='_blank'
              rel='noopener'
              style='text-decoration: none;'
            >
              ElysiaJS
            </a>{' '}
            with end-to-end type safety, autocompletion, and an intuitive API — zero npm
            dependencies, built entirely with native Deno and Web APIs.
          </p>
          <div style='display: flex; gap: 0.75rem; justify-content: center; margin-top: 1.5rem;'>
            <a href='/docs' role='button'>
              <i class='ph ph-book-open-text'></i> Read the docs
            </a>
            <a href='/plugins' role='button' class='outline'>
              <i class='ph ph-puzzle-piece'></i> View plugins
            </a>
          </div>
        </section>

        <section>
          <h2 style='display: flex; align-items: center; gap: 0.5rem;'>
            <i class='ph ph-rocket-launch' style='color: var(--pico-primary);'></i> Quick Start
          </h2>
          <p>
            Install the framework core via{' '}
            <a href='https://jsr.io/@goddo' target='_blank' rel='noopener'>JSR</a>:
          </p>
          <Code lang='sh'>{`deno add jsr:@goddo/core`}</Code>
          <p>Create a server:</p>
          <Code lang='ts'>
            {`import { Goddo } from '@goddo/core'

new Goddo()
  .get('/', () => 'Hello Goddo')
  .get('/user/:id', ({ params: { id } }) => id)
  .post('/mirror', ({ body }) => body)
  .listen(3000)`}
          </Code>
        </section>

        <section style='margin-top: 3rem;'>
          <h2 style='display: flex; align-items: center; gap: 0.5rem;'>
            <i class='ph ph-star' style='color: var(--pico-primary);'></i> Why Goddo?
          </h2>
          <div class='grid-cards'>
            {FEATURES.map((f) => (
              <article>
                <h3 style='display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;'>
                  <i class={`ph ${f.icon}`} style='color: var(--pico-primary);'></i> {f.title}
                </h3>
                <p style='color: var(--pico-muted-color); margin: 0;'>{f.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section style='margin-top: 3rem; background-color: var(--pico-form-element-background); padding: 2rem; text-align: center;'>
          <h3 style='display: flex; align-items: center; justify-content: center; gap: 0.5rem;'>
            <i class='ph ph-play-circle' style='color: var(--pico-primary);'></i>{' '}
            Complete working example
          </h3>
          <p style='color: var(--pico-muted-color); max-width: 560px; margin: 0.5rem auto 1.5rem;'>
            The official demo (a Todo List with SSR in TSX, Alpine.js, and OpenAPI) is included in
            the repository under <code>src/</code>. See the examples page for the full code.
          </p>
          <a href='/examples' role='button' class='secondary'>
            View examples <i class='ph ph-arrow-right'></i>
          </a>
        </section>
      </>
    ),
  })
}
