import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser', testMatch: '**/district.spec.ts', workers: 1, timeout: 180000, expect: { timeout: 30000 }, reporter: 'list',
  outputDir: '.cache/district-browser-results',
  use: { baseURL: 'http://127.0.0.1:5173', channel: 'chrome', launchOptions: { args: [] }, video: { mode: 'on', size: { width: 1440, height: 900 } } },
  projects: [
    { name: 'district-webgpu', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'district-webgl2', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'district-mobile', use: { ...devices['Pixel 7'], viewport: { width: 915, height: 412 } } },
  ],
  webServer: { command: 'npm run dev', url: 'http://127.0.0.1:5173', reuseExistingServer: true },
});
