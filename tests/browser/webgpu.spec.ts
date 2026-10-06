import { expect, test } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

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
  expect(stats?.backend).toBe('WebGPU'); expect(stats?.references).toBe(3); expect(stats?.scene).toBe('showcase'); expect(errors).toEqual([]);
  await test.info().attach('webgpu-statistics', { body: JSON.stringify(stats, null, 2), contentType: 'application/json' });
  await page.screenshot({ path: 'docs/qa/phase3/browser/courtyard-webgpu.png' });
  await page.getByRole('button', { name: 'Medic', exact: true }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'docs/qa/phase3/browser/medic-webgpu.png' });
  const poses = [await page.evaluate(() => window.__VESPER_DEBUG__?.snapshot())];
  await expect(page.locator('#animation option')).toHaveText(['Static pose', 'Idle_Loop', 'Walk_Loop', 'Jog_Fwd_Loop', 'Punch_Jab', 'Punch_Cross', 'Spell_Simple_Shoot', 'Roll', 'Hit_Chest', 'Death01']);
  expect(poses[0]?.animation).toBe('Idle_Loop');
  expect(poses[0]?.rig?.feet).toHaveLength(2);
  for (const angle of ['side', 'back']) {
    await page.getByRole('button', { name: 'Turn Medic' }).click(); await page.getByRole('button', { name: 'Turn Medic' }).click();
    await page.waitForTimeout(100);
    await page.screenshot({ path: `docs/qa/phase3/browser/medic-${angle}-webgpu.png` });
  }
  expect(errors).toEqual([]);
  await writeFile('docs/qa/phase3/browser/webgpu-poses.json', JSON.stringify({ stats, poses, errors }, null, 2));
});
