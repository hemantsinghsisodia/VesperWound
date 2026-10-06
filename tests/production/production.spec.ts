import { expect, test } from '@playwright/test';

test('production ignores development flags and excludes diagnostics', async ({ page }) => {
  const errors: string[] = [];
  const requests: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => requests.push(request.url()));
  await page.addInitScript(() => { Object.defineProperty(navigator, 'gpu', { value: undefined, configurable: true }); });
  await page.goto('/?backend=webgpu-required&fixture=missing&scene=foundation');
  await expect(page.locator('#app')).toHaveAttribute('data-state', 'ready');
  await page.getByRole('button', { name: 'ENTER THE WORKS' }).click();
  await expect(page.locator('#app')).toHaveAttribute('data-state', 'running');
  await page.keyboard.press('F3');
  expect(await page.evaluate(() => window.__VESPER_DEBUG__)).toBeUndefined();
  await expect(page.locator('.debug-panel, .debug-toggle')).toHaveCount(0);
  expect(requests.some((url) => url.includes('debug-tools'))).toBe(false);
  expect(requests.some((url) => url.endsWith('/assets/showcase/desktop/character.glb'))).toBe(true);
  expect(requests.some((url) => url.includes('/assets/fixtures/'))).toBe(false);
  await expect(page.getByRole('region', { name: 'Visual showcase' })).toBeVisible();
  expect(errors).toEqual([]);
});
