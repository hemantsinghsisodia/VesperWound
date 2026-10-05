import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/production', timeout: 90000, workers: 1,
  expect: { timeout: 30000 },
  use: { baseURL: 'http://127.0.0.1:4173', channel: 'chrome', viewport: { width: 1440, height: 900 } },
  webServer: { command: 'npm run preview', url: 'http://127.0.0.1:4173', reuseExistingServer: true },
});
