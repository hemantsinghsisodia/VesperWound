import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/production', timeout: 60000, workers: 1,
  use: { baseURL: 'http://127.0.0.1:4173', channel: 'chrome', viewport: { width: 1440, height: 900 } },
  webServer: { command: 'npm run preview', url: 'http://127.0.0.1:4173', reuseExistingServer: true },
});
