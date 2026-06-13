import { defineConfig } from 'tsup'

const shared = {
  treeshake: true,
  minify: true,
  sourcemap: false, // keep the published package lean; dist is publish-only (local uses src)
  target: 'es2022',
} as const

export default defineConfig([
  // Package builds consumed by bundlers / Node: ESM + CJS + type declarations.
  // `splitting` (esm only) gives each plugin its own chunk, so `auto`'s on-demand
  // `import()` fetches just the plugin a page asks for. CJS can't split, so its
  // `auto.cjs` bundles the plugins inline — fine, the JIT story is the browser/ESM one.
  {
    ...shared,
    entry: {
      index: 'src/index.ts',
      auto: 'src/auto.ts',
      head: 'src/head.ts',
      plugins: 'src/plugins/index.ts',
    },
    format: ['esm', 'cjs'],
    splitting: true,
    dts: true,
    clean: true, // first pass only; later passes add to dist/ without wiping it
  },

  // Standalone <script> build of the API, for CDN / no-bundler use:
  //   <script src=".../dist/index.global.js"></script>  →  window.PropForThat
  {
    ...shared,
    entry: { index: 'src/index.ts' },
    format: ['iife'],
    globalName: 'PropForThat',
    outExtension: () => ({ js: '.global.js' }),
  },

  // Drop-in <script> build: side-effecting, exposes no global.
  //   <script src=".../dist/head.global.js"></script>  FOUC-safe --const-*
  // (No classic `auto.global.js`: `auto` lazy-loads plugin chunks via dynamic
  // import, which only resolves correctly from `<script type="module">` —
  // use `<script type="module" src=".../auto.js">`.)
  {
    ...shared,
    entry: { head: 'src/head.ts' },
    format: ['iife'],
    outExtension: () => ({ js: '.global.js' }),
  },
])
