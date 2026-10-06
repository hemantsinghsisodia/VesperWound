import { expect, test } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

test('Medic and Ash Quay render with selected assets and animation previews', async ({ page }) => {
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
  expect(stats?.variant).toBe(variant); expect(stats?.references).toBe(3); expect(stats?.scene).toBe('showcase');
  expect(requests.filter((url) => url.includes('/showcase/') && url.includes(`/${variant === 'mobile' ? 'desktop' : 'mobile'}/`))).toEqual([]);
  expect(requests.some((url) => url.includes('/showcase/cinematic/'))).toBe(false);
  if (variant === 'mobile') await expect(page.locator('#inspection-toggle')).toBeHidden();
  await mkdir('docs/qa/medic/browser', { recursive: true });
  await page.screenshot({ path: `docs/qa/phase3/browser/courtyard-webgl2-${variant}.png` });
  await page.getByRole('button', { name: 'Medic', exact: true }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `docs/qa/phase3/browser/medic-webgl2-${variant}.png` });
  await expect(page.locator('#animation option')).toHaveText(['Static pose', 'Idle_Loop', 'Walk_Loop', 'Jog_Fwd_Loop', 'Punch_Jab', 'Punch_Cross', 'Spell_Simple_Shoot', 'Roll', 'Hit_Chest', 'Death01']);
  expect(stats?.animation).toBe('Idle_Loop');
  expect(errors).toEqual([]);
  if (variant === 'mobile') {
    await page.getByRole('button', { name: 'Turn Medic' }).tap();
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
  await writeFile(`docs/qa/phase3/browser/webgl2-${variant}.json`, JSON.stringify({ stats, errors, viewport: page.viewportSize(), browser: test.info().project.use.channel, userAgent: await page.evaluate(() => navigator.userAgent) }, null, 2));
});
