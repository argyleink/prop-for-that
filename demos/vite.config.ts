import { defineConfig } from 'vite'
import { resolve } from 'node:path'

export default defineConfig({
  resolve: { alias: { 'prop-for-that': resolve(__dirname, '../src/index.ts') } },
  server: { fs: { allow: ['..'] } },
})
