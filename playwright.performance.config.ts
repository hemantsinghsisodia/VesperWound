import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/performance', timeout: 720000, workers: 1,
  expect: { timeout: 30000 },
  use: {
    baseURL: 'http://127.0.0.1:4173', channel: 'chrome',
    viewport: { width: 1440, height: 900 }, launchOptions: { args: ['--disable-frame-rate-limit', '--disable-gpu-vsync'] },
    screenshot: 'only-on-failure',
  },
  webServer: { command: 'npm run preview', url: 'http://127.0.0.1:4173', reuseExistingServer: true },
});
