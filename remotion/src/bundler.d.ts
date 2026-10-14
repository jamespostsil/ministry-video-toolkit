// Types for bundler features the TypeScript compiler doesn't know about.

interface BundlerContext {
  keys(): string[];
  (key: string): unknown;
}

interface ImportMeta {
  /** Remotion's bundler (Rspack) lists matching modules at build time. */
  webpackContext(dir: string, options: { recursive?: boolean; regExp?: RegExp }): BundlerContext;
}
