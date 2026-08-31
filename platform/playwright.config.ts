import { defineConfig, devices } from '@playwright/test';
import { readAuthBundle } from './e2e/support/auth-state.js';
import { readE2EEnvironment } from './e2e/support/test-environment.js';

const authBundle = readAuthBundle();
const e2eEnvironment = readE2EEnvironment();

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  outputDir: 'test-results',
  webServer: e2eEnvironment.mockAuth
    ? {
        command: 'pnpm --filter @hodor/admin preview --host 127.0.0.1 --port 4173',
        url: e2eEnvironment.baseUrl,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      }
    : undefined,
  use: {
    baseURL: e2eEnvironment.baseUrl,
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
    screenshot: 'only-on-failure',
    trace: 'off',
    video: 'off',
  },
  projects: [
    {
      name: 'auth',
      testMatch: /auth\.setup\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        headless: false,
        storageState: { cookies: [], origins: [] },
      },
    },
    {
      name: 'chromium',
      testIgnore: /auth\.setup\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        channel: process.env.CI ? 'chromium' : 'chrome',
        storageState: authBundle?.storageState,
      },
    },
  ],
});
