import { defineConfig } from 'vite'
import { resolve } from 'node:path'

export default defineConfig({
  resolve: {
    // order matters: the more specific subpath must resolve before the bare one
    alias: [
      { find: 'prop-for-that/plugins', replacement: resolve(__dirname, '../src/plugins/index.ts') },
      { find: 'prop-for-that', replacement: resolve(__dirname, '../src/index.ts') },
    ],
  },
  server: { fs: { allow: ['..'] } },
})
