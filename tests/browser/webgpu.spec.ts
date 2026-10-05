import { expect, test } from '@playwright/test';

test('real WebGPU backend renders the compressed courtyard', async ({ page }) => {
  test.skip(test.info().project.name !== 'hardware-webgpu', 'Dedicated hardware backend check.');
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?backend=webgpu-required');
  await expect(page.locator('#app')).toHaveAttribute('data-state', /ready|error/);
  const state = await page.locator('#app').getAttribute('data-state');
  test.skip(state === 'error', `WebGPU unavailable here: ${await page.locator('#error-detail').textContent()}`);
  await page.getByRole('button', { name: 'ENTER THE WORKS' }).click();
  await expect.poll(async () => page.evaluate(() => window.__VESPER_DEBUG__?.snapshot().triangles ?? 0)).toBeGreaterThan(1000);
  const stats = await page.evaluate(() => window.__VESPER_DEBUG__?.snapshot());
  expect(stats?.backend).toBe('WebGPU'); expect(stats?.references).toBe(3); expect(errors).toEqual([]);
  await test.info().attach('webgpu-statistics', { body: JSON.stringify(stats, null, 2), contentType: 'application/json' });
  await page.screenshot({ path: 'test-results/courtyard-webgpu.png' });
});
