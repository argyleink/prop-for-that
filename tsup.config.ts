import { defineConfig } from 'tsup'

const shared = {
  treeshake: true,
  minify: true,
  sourcemap: true,
  target: 'es2022',
} as const

export default defineConfig([
  // Package builds consumed by bundlers / Node: ESM + CJS + type declarations.
  {
    ...shared,
    entry: {
      index: 'src/index.ts',
      auto: 'src/auto.ts',
      head: 'src/head.ts',
      plugins: 'src/plugins/index.ts',
    },
    format: ['esm', 'cjs'],
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

  // Drop-in <script> builds: side-effecting, expose no global.
  //   <script src=".../dist/auto.global.js"></script>  binds [data-prop]
  //   <script src=".../dist/head.global.js"></script>  FOUC-safe --const-*
  {
    ...shared,
    entry: { auto: 'src/auto.ts', head: 'src/head.ts' },
    format: ['iife'],
    outExtension: () => ({ js: '.global.js' }),
  },
])
