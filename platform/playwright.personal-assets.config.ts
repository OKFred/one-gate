import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: /personal-assets(?:-model)?\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  outputDir: 'test-results/personal-assets',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:4185',
    channel: process.env.CI ? 'chromium' : 'chrome',
    // Exercise the real WebGL path on GPU-less CI runners.
    launchOptions: process.env.CI
      ? { args: ['--use-gl=angle', '--use-angle=swiftshader'] }
      : undefined,
    screenshot: 'only-on-failure',
    trace: 'off',
  },
  webServer: {
    command: 'pnpm exec vite --config e2e/fixtures/personal-assets/vite.config.ts',
    url: 'http://127.0.0.1:4185',
    reuseExistingServer: !process.env.CI,
  },
});
