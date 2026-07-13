/**
 * JSX namespace for the HTML plugin.
 */
// deno-lint-ignore no-namespace
export namespace JSX {
  /**
   * Defines that a JSX component returns an HtmlString (or a Promise of one)
   */
  export type Element =
    | import('./jsx-runtime.ts').HtmlString
    | Promise<import('./jsx-runtime.ts').HtmlString>

  /**
   * Intrinsic elements (e.g. <div>, <span>) accept any properties for flexibility.
   * In a fully strictly-typed framework, this could be imported from @types/react,
   * but we use 'unknown' to remain zero-dependency and lightweight.
   */
  export interface IntrinsicElements {
    /** Allows any attribute for any HTML tag. */
    [elemName: string]: unknown
  }
}
