import { defineConfig } from 'vite'
import { resolve } from 'node:path'

export default defineConfig({
  resolve: {
    // order matters: the more specific subpath must resolve before the bare one
    alias: [
      { find: 'prop-for-that/plugins', replacement: resolve(__dirname, '../src/plugins/index.ts') },
      { find: 'prop-for-that/auto', replacement: resolve(__dirname, '../src/auto.ts') },
      { find: 'prop-for-that/head', replacement: resolve(__dirname, '../src/head.ts') },
      { find: 'prop-for-that', replacement: resolve(__dirname, '../src/index.ts') },
    ],
  },
  server: { port: 8080, strictPort: true, fs: { allow: ['..'] } },
})
