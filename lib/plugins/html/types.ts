declare global {
  namespace JSX {
    // Defines that a JSX component returns an HtmlString (or a Promise of one)
    type Element =
      | import('./jsx-runtime.ts').HtmlString
      | Promise<import('./jsx-runtime.ts').HtmlString>

    // Intrinsic elements (e.g. <div>, <span>) accept any properties for flexibility
    // In a fully strictly-typed framework, this could be imported from @types/react,
    // but we use 'unknown' to remain zero-dependency and lightweight.
    interface IntrinsicElements {
      [elemName: string]: unknown
    }
  }
}
