import { defineConfig, devices } from '@playwright/test'

/**
 * Browser tests that verify the library's core platform premise in real engines:
 * custom properties set via `setProperty` round-trip through `var()`/`calc()`,
 * inherit to descendants, and drive `@container style()`. jsdom can't prove this.
 *
 * Run: `npx playwright install` once, then `npm run test:e2e`.
 */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  reporter: 'list',
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
})
