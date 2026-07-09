/**
 * Renders a code block with a copy-to-clipboard button (Alpine.js powered).
 * The source is escaped automatically by the JSX runtime (`@goddo/html`),
 * so no HTML injection is possible even with untrusted-looking snippets.
 */
export function Code({ lang = 'ts', children }: { lang?: string; children: string }) {
  const source = children.replace(/^\n/, '').replace(/\n$/, '')

  return (
    <div
      class='code-wrapper'
      x-data={`{ copied: false, copy() { navigator.clipboard.writeText(${
        JSON.stringify(source)
      }); this.copied = true; setTimeout(() => this.copied = false, 1500) } }`}
    >
      <button type='button' class='copy-btn' x-on:click='copy()'>
        <i class='ph ph-copy' x-show='!copied'></i>
        <i class='ph ph-check' x-show='copied' style='display: none;'></i>
        <span x-text="copied ? 'Copied!' : 'Copy'"></span>
      </button>
      <pre class={`language-${lang}`}>
        <code class={`language-${lang}`}>{source}</code>
      </pre>
    </div>
  )
}
