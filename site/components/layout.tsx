import { HtmlString } from '@goddo/html'
import { Logo } from './logo.tsx'

export type NavItem = { href: string; label: string; icon: string }

const NAV: NavItem[] = [
  { href: '/', label: 'Home', icon: 'ph-house' },
  { href: '/docs', label: 'Docs', icon: 'ph-book-open-text' },
  { href: '/plugins', label: 'Plugins', icon: 'ph-puzzle-piece' },
  { href: '/examples', label: 'Examples', icon: 'ph-code' },
]

type LayoutProps = {
  title: string
  description?: string
  active?: string
  children: unknown
}

/**
 * Shared page shell: CDN-only assets (Pico CSS classless, Phosphor Icons, Alpine.js),
 * top navigation and footer. No build step required.
 */
export function Layout({ title, description, active, children }: LayoutProps) {
  const page = (
    <html lang='en'>
      <head>
        <meta charset='utf-8' />
        <meta name='viewport' content='width=device-width, initial-scale=1' />
        <title>{title} · Goddo</title>
        {description && <meta name='description' content={description} />}
        <link
          rel='stylesheet'
          href='https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.classless.min.css'
        />
        <script src='https://unpkg.com/@phosphor-icons/web'></script>
        <script
          defer
          src='https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js'
        >
        </script>
        <script defer src='https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js'>
        </script>
        <script
          defer
          src='https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-typescript.min.js'
        >
        </script>
        <script
          defer
          src='https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-jsx.min.js'
        >
        </script>
        <script
          defer
          src='https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-tsx.min.js'
        >
        </script>
        <script
          defer
          src='https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-json.min.js'
        >
        </script>
        <script
          defer
          src='https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-bash.min.js'
        >
        </script>
        <style>
          {`
          html { font-size: 14px; }

          body { display: flex; flex-direction: column; min-height: 100vh; }

          .site-header {
            border-bottom: 1px solid var(--pico-muted-border-color);
            padding: 1rem 1rem;
          }

          .site-header nav ul { align-items: center; }

          .site-header a {
            display: flex;
            align-items: center;
            gap: 0.4rem;
            padding: 0.35rem 0.5rem;
            border-radius: var(--pico-border-radius);
            text-decoration: none;
            transition: background-color 0.15s ease, color 0.15s ease;
          }

          .site-header a:hover,
          .site-header a:focus {
            text-decoration: none;
            background-color: var(--pico-muted-border-color);
          }

          .site-header a i { font-size: 1.1rem; }

          .brand {
            font-weight: 700;
            font-size: 1.25rem;
            padding-left: 0;
          }
          .brand i { font-size: 1.4rem; }

          .site-nav a.active { color: var(--pico-primary); font-weight: 600; }

          .menu-toggle {
            display: none;
            align-items: center;
            justify-content: center;
            gap: 0.35rem;
            background: var(--pico-secondary-background);
            border: var(--pico-border-width) solid var(--pico-secondary-border);
            border-radius: var(--pico-border-radius);
            padding: 0.5rem 0.75rem;
            font-size: 1.1rem;
            line-height: 1;
            color: var(--pico-secondary-inverse);
            cursor: pointer;
          }
          .menu-toggle:hover {
            background: var(--pico-secondary-hover-background);
          }

          @media (max-width: 768px) {
            .site-header nav { flex-wrap: wrap; }

            .menu-toggle { display: flex; }

            .site-nav {
              display: none;
              flex-basis: 100%;
              flex-direction: column;
              align-items: flex-start;
              gap: 0.75rem;
              margin-top: 1rem;
            }

            .site-nav.is-open { display: flex; }

            .site-nav li { width: 100%; }
          }

          main.site-main {
            flex: 1;
            padding-top: 2rem;
            padding-bottom: 3rem;
            padding-left: 1rem;
            padding-right: 1rem;
          }

          .callout {
            border-left: 4px solid var(--pico-primary);
            background: var(--pico-card-sectioning-background-color);
            padding: 0.75rem 1rem;
            margin: 1rem 0;
            border-radius: var(--pico-border-radius);
          }
          .callout p:last-child { margin-bottom: 0; }
          .callout-title {
            display: flex;
            align-items: center;
            gap: 0.35rem;
            font-weight: 700;
            margin-bottom: 0.35rem;
          }
          .callout-warning { border-left-color: #d97706; }
          .callout-warning .callout-title { color: #d97706; }

          .site-footer {
            border-top: 1px solid var(--pico-muted-border-color);
            padding: 1.5rem 1rem;
            color: var(--pico-muted-color);
            font-size: 0.85rem;
            text-align: center;
          }

          .code-wrapper {
            position: relative;
          }

          pre {
            border-radius: 6px;
          }

          pre > code { font-size: 0.85rem; }

          /* Pico-native Prism Syntax Highlighting */
          .token.comment, .token.prolog, .token.doctype, .token.cdata { color: var(--pico-muted-color); font-style: italic; }
          .token.punctuation { color: var(--pico-color); opacity: 0.7; }
          .token.namespace { opacity: .7; }
          .token.property, .token.tag, .token.boolean, .token.number, .token.constant, .token.symbol, .token.deleted { color: #d946ef; }
          .token.selector, .token.attr-name, .token.string, .token.char, .token.builtin, .token.inserted { color: #10b981; }
          .token.operator, .token.entity, .token.url, .language-css .token.string, .style .token.string { color: var(--pico-color); }
          .token.atrule, .token.attr-value, .token.keyword { color: var(--pico-primary); }
          .token.function, .token.class-name { color: #3b82f6; }
          .token.regex, .token.important, .token.variable { color: #f59e0b; }

          @media (prefers-color-scheme: dark) {
            .token.property, .token.tag, .token.boolean, .token.number, .token.constant, .token.symbol, .token.deleted { color: #e879f9; }
            .token.selector, .token.attr-name, .token.string, .token.char, .token.builtin, .token.inserted { color: #34d399; }
            .token.function, .token.class-name { color: #60a5fa; }
            .token.regex, .token.important, .token.variable { color: #fbbf24; }
          }

          .copy-btn {
            position: absolute;
            top: 0.5rem;
            right: 0.5rem;
            border: none;
            background: var(--pico-secondary-background);
            color: var(--pico-secondary-inverse);
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.75rem;
            display: flex;
            align-items: center;
            gap: 0.25rem;
          }
          .copy-btn:hover { background: var(--pico-secondary-hover); }

          .badge {
            display: inline-flex;
            align-items: center;
            gap: 0.25rem;
            font-size: 0.75rem;
            padding: 0.15rem 0.5rem;
            border-radius: 999px;
            background: var(--pico-secondary-background);
            color: var(--pico-secondary-inverse);
          }

          .grid-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
            gap: 1rem;
          }

          .docs-layout {
            display: grid;
            grid-template-columns: 220px 1fr;
            gap: 2rem;
            align-items: start;
          }

          .docs-sidebar {
            position: sticky;
            top: 1rem;
          }

          .docs-sidebar ul {
            display: block;
            list-style: none;
            padding-left: 0;
            margin: 0.5rem 0 0;
          }
          .docs-sidebar li { display: block; margin-bottom: 0.35rem; }
          .docs-sidebar a { display: inline-flex; align-items: center; gap: 0.35rem; text-decoration: none; }

          @media (max-width: 900px) {
            .docs-layout { grid-template-columns: 1fr; }
            .docs-sidebar { position: static; }
          }
          `}
        </style>
      </head>
      <body x-data='{ menuOpen: false }'>
        <header class='site-header'>
          <nav class='container'>
            <ul>
              <li>
                <a href='/' class='brand'>
                  <Logo style='font-size: 1.4rem;' />
                  Goddo
                </a>
              </li>
            </ul>
            <button
              type='button'
              class='menu-toggle'
              aria-label='Toggle menu'
              x-on:click='menuOpen = !menuOpen'
              x-bind:aria-expanded='menuOpen'
            >
              <i class='ph ph-list' x-show='!menuOpen'></i>
              <i class='ph ph-x' x-show='menuOpen' style='display: none;'></i>
              <span x-text="menuOpen ? 'Close' : 'Menu'">Menu</span>
            </button>
            <ul class='site-nav' x-bind:class="{ 'is-open': menuOpen }">
              {NAV.map((item) => (
                <li>
                  <a href={item.href} class={active === item.href ? 'active' : ''}>
                    <i class={`ph ${item.icon}`}></i> {item.label}
                  </a>
                </li>
              ))}
              <li>
                <a href='https://github.com/carlosxfelipe/goddo' target='_blank' rel='noopener'>
                  <i class='ph ph-github-logo'></i> GitHub
                </a>
              </li>
            </ul>
          </nav>
        </header>

        <main class='container site-main'>
          {children}
        </main>

        <footer class='site-footer'>
          <div class='container'>
            Goddo · Ergonomic web framework for Deno, inspired by ElysiaJS ·{' '}
            <a href='https://jsr.io/@goddo' target='_blank' rel='noopener'>JSR</a> ·{' '}
            <a href='https://github.com/carlosxfelipe/goddo' target='_blank' rel='noopener'>
              GitHub
            </a>
          </div>
        </footer>
      </body>
    </html>
  )
  return new HtmlString('<!DOCTYPE html>\n' + page)
}
