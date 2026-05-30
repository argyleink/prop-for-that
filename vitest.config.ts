import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    // unit tests only; the Playwright e2e suite lives in e2e/ (*.spec.ts)
    include: ['test/**/*.test.ts'],
  },
})
