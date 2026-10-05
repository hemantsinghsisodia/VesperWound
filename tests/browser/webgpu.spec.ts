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
  expect(stats?.backend).toBe('WebGPU'); expect(stats?.references).toBe(2); expect(stats?.scene).toBe('showcase'); expect(errors).toEqual([]);
  await test.info().attach('webgpu-statistics', { body: JSON.stringify(stats, null, 2), contentType: 'application/json' });
  await page.screenshot({ path: 'docs/qa/visual/courtyard-webgpu.png' });
  await page.getByRole('button', { name: 'Iona', exact: true }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'docs/qa/visual/iona-webgpu.png' });
  const poses = [];
  for (const clip of ['walk', 'run', 'attack', 'dodge', 'idle']) {
    await page.locator('#animation').selectOption(clip);
    await page.waitForTimeout(350);
    await page.screenshot({ path: `docs/qa/visual/iona-${clip}-webgpu.png` });
    for (let sample = 0; sample < 8; sample++) {
      const pose = await page.evaluate(() => window.__VESPER_DEBUG__?.snapshot()); poses.push(pose);
      expect(pose?.rig?.gripDistances).toHaveLength(2);
      for (const distance of pose?.rig?.gripDistances ?? []) expect(distance).toBeLessThan(0.065);
      for (const foot of pose?.rig?.feet ?? []) { expect(foot[1]).toBeGreaterThan(0.065); expect(foot[1]).toBeLessThan(0.30); }
      await page.waitForTimeout(130);
    }
    if (clip === 'attack' || clip === 'dodge') await expect.poll(async () => page.evaluate(() => window.__VESPER_DEBUG__?.snapshot().animation)).toBe('idle');
  }
  for (const angle of ['side', 'back']) {
    await page.getByRole('button', { name: 'Turn Iona' }).click(); await page.getByRole('button', { name: 'Turn Iona' }).click();
    await page.waitForTimeout(100);
    await page.screenshot({ path: `docs/qa/visual/iona-${angle}-webgpu.png` });
  }
  expect(errors).toEqual([]);
  await writeFile('docs/qa/visual/webgpu-poses.json', JSON.stringify({ stats, poses, errors }, null, 2));
});
