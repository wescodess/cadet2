import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:3100'
const isCI = !!process.env.CI
const parsedBaseUrl = new URL(baseURL)
const devHost = parsedBaseUrl.hostname
const devPort = parsedBaseUrl.port || (parsedBaseUrl.protocol === 'https:' ? '443' : '80')
const playwrightDbDataDir = process.env.NUXT_HUB_DB_DATA_DIR || '.data/db/pglite-playwright'
const reuseExistingServer = process.env.PLAYWRIGHT_REUSE_SERVER === 'true'

export default defineConfig({
  testDir: './tests',
  outputDir: 'test-results/artifacts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list'],
  ],
  use: {
    baseURL,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      testMatch: ['e2e/**/*.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'api',
      testMatch: ['api/**/*.spec.ts'],
      use: {
        baseURL,
      },
    },
  ],
  webServer: isCI
    ? undefined
    : {
        command: `NUXT_HUB_DB_DATA_DIR=${playwrightDbDataDir} pnpm dev --host ${devHost} --port ${devPort}`,
        url: baseURL,
        reuseExistingServer,
        timeout: 120_000,
      },
})
