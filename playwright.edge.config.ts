import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser', testMatch: '**/edge-quality.spec.ts', workers: 1,
  timeout: 240000, expect: { timeout: 45000 }, reporter: 'list',
  outputDir: '.cache/edge-browser-results',
  use: { baseURL: 'http://127.0.0.1:4184', channel: 'chrome', screenshot: 'only-on-failure' },
  projects: [
    { name: 'edge-webgpu', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'edge-webgl2', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'edge-mobile', use: { ...devices['Pixel 7'], viewport: { width: 915, height: 412 } } },
  ],
  webServer: { command: 'npm run preview -- --port 4184 --strictPort', url: 'http://127.0.0.1:4184', reuseExistingServer: true },
});
