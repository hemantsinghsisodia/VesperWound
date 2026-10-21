import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser', testMatch: ['**/baton-feel.spec.ts', '**/armed-motion.spec.ts'], workers: 1,
  timeout: 180000, expect: { timeout: 45000 }, reporter: 'list',
  outputDir: '.cache/baton-browser-results',
  use: { baseURL: 'http://127.0.0.1:5182', channel: 'chrome', screenshot: 'only-on-failure' },
  projects: [
    { name: 'baton-webgpu', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'baton-webgl2', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'baton-mobile', use: { ...devices['Pixel 7'], viewport: { width: 915, height: 412 } } },
  ],
  webServer: { command: 'npm run dev -- --port 5182 --strictPort', url: 'http://127.0.0.1:5182', reuseExistingServer: process.env.VESPER_BATON_EXTERNAL === '1' },
});
