import { defineConfig } from '@playwright/test'

/**
 * Smoke tests against a production build, in the locally installed Chrome (no browser download).
 * Port 3100, because 3000 is often taken during development. An existing server on 3100 is reused.
 */
export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.spec.ts',
  workers: 1,
  timeout: 60_000,
  reporter: 'list',
  use: { baseURL: 'http://localhost:3100', channel: 'chrome', trace: 'retain-on-failure' },
  webServer: {
    command: 'npm run build && npx next start -p 3100',
    url: 'http://localhost:3100',
    reuseExistingServer: true,
    timeout: 600_000,
  },
})
