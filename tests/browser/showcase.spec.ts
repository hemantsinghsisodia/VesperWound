import { expect, test } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

test('Iona and Ash Quay render with selected assets and animation previews', async ({ page }) => {
  test.setTimeout(150000);
  const errors: string[] = []; const requests: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => requests.push(request.url()));
  await page.goto('/?backend=webgl2');
  await expect(page.locator('#app')).toHaveAttribute('data-state', /ready|error/);
  const detail = await page.locator('#error-detail').textContent();
  expect(await page.locator('#app').getAttribute('data-state'), detail ?? '').toBe('ready');
  await page.getByRole('button', { name: 'ENTER THE WORKS' }).click();
  await expect(page.getByRole('region', { name: 'Visual showcase' })).toBeVisible();
  const variant = test.info().project.name === 'mobile' ? 'mobile' : 'desktop';
  const stats = await page.evaluate(() => window.__VESPER_DEBUG__?.snapshot());
  expect(stats?.variant).toBe(variant); expect(stats?.references).toBe(2); expect(stats?.scene).toBe('showcase');
  expect(requests.filter((url) => url.includes('/showcase/') && url.includes(`/${variant === 'mobile' ? 'desktop' : 'mobile'}/`))).toEqual([]);
  expect(requests.some((url) => url.includes('/showcase/cinematic/'))).toBe(false);
  if (variant === 'mobile') await expect(page.locator('#inspection-toggle')).toBeHidden();
  await mkdir('docs/qa/visual', { recursive: true });
  await page.screenshot({ path: `docs/qa/visual/courtyard-webgl2-${variant}.png` });
  await page.getByRole('button', { name: 'Iona', exact: true }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `docs/qa/visual/iona-webgl2-${variant}.png` });
  for (const clip of ['walk', 'run', 'attack', 'dodge', 'idle']) {
    await page.locator('#animation').selectOption(clip);
    await expect.poll(async () => page.evaluate(() => window.__VESPER_DEBUG__?.snapshot().animation)).toBe(clip);
    await page.waitForTimeout(250);
    await page.screenshot({ path: `docs/qa/visual/iona-${clip}-${variant}.png` });
    if (clip === 'attack' || clip === 'dodge') await expect.poll(async () => page.evaluate(() => window.__VESPER_DEBUG__?.snapshot().animation)).toBe('idle');
  }
  expect(errors).toEqual([]);
  if (variant === 'mobile') {
    await page.getByRole('button', { name: 'Turn Iona' }).tap();
    for (const selector of ['#view-courtyard', '#view-character', '#turn-character', '#animation']) {
      const bounds = await page.locator(selector).boundingBox();
      expect(bounds?.height).toBeGreaterThanOrEqual(44); expect(bounds?.width).toBeGreaterThanOrEqual(44);
      expect((bounds?.x ?? 0) + (bounds?.width ?? 0)).toBeLessThanOrEqual(915);
    }
    await page.setViewportSize({ width: 412, height: 915 });
    await expect(page.locator('#rotate')).toBeVisible(); await expect(page.locator('#app')).toHaveAttribute('data-state', 'paused');
    await page.setViewportSize({ width: 915, height: 412 });
    await expect(page.locator('#rotate')).toBeHidden(); await expect(page.locator('#app')).toHaveAttribute('data-state', 'running');
    await page.getByRole('button', { name: 'Open settings' }).tap();
    await page.locator('#quality').selectOption('High'); await expect(page.locator('#quality')).toBeEnabled();
    await page.getByRole('button', { name: 'RETURN TO THE WORKS' }).tap();
    await expect(page.locator('#inspection-toggle')).toBeHidden();
    expect(requests.some((url) => url.includes('/showcase/cinematic/'))).toBe(false);
  }
  await writeFile(`docs/qa/visual/webgl2-${variant}.json`, JSON.stringify({ stats, errors, viewport: page.viewportSize(), browser: test.info().project.use.channel, userAgent: await page.evaluate(() => navigator.userAgent) }, null, 2));
});
