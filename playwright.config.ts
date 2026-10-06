import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  timeout: 90000,
  expect: { timeout: 30000 },
  workers: 1,
  fullyParallel: false,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.VESPER_TEST_URL ?? 'http://127.0.0.1:5173',
    channel: 'chrome',
    launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', testIgnore: ['**/combat.spec.ts', '**/player.spec.ts', '**/webgpu.spec.ts', '**/performance.spec.ts', '**/showcase-lifecycle.spec.ts', '**/inspection.spec.ts'], use: { viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', testIgnore: ['**/combat.spec.ts', '**/player.spec.ts', '**/webgpu.spec.ts', '**/performance.spec.ts', '**/showcase-lifecycle.spec.ts', '**/inspection.spec.ts'], use: { ...devices['Pixel 7'], viewport: { width: 915, height: 412 } } },
    { name: 'hardware-player-desktop', testMatch: ['**/player.spec.ts', '**/combat.spec.ts'], use: { viewport: { width: 1440, height: 900 }, launchOptions: { args: [] } } },
    { name: 'hardware-player-mobile', testMatch: ['**/player.spec.ts', '**/combat.spec.ts'], use: { ...devices['Pixel 7'], viewport: { width: 915, height: 412 }, launchOptions: { args: [] } } },
    { name: 'hardware-inspection', testMatch: '**/inspection.spec.ts', use: { viewport: { width: 1440, height: 900 }, launchOptions: { args: [] } } },
    { name: 'hardware-webgpu', testMatch: '**/webgpu.spec.ts', use: { viewport: { width: 1440, height: 900 }, launchOptions: { args: [] } } },
    { name: 'hardware-showcase', testMatch: '**/showcase-lifecycle.spec.ts', use: { viewport: { width: 1440, height: 900 }, launchOptions: { args: [] } } },
    { name: 'performance', testMatch: '**/performance.spec.ts', use: { viewport: { width: 1440, height: 900 }, launchOptions: { args: [] } } },
  ],
  webServer: { command: 'npm run dev', url: 'http://127.0.0.1:5173', reuseExistingServer: true },
});
