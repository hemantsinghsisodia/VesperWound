import { expect, test } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';

for (const backend of ['webgl2', 'webgpu-required']) test(`ten scene reloads and six quality swaps retain stable resources (${backend})`, async ({ page }) => {
  test.setTimeout(180000);
  const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`/?backend=${backend}`);
  await expect(page.locator('#app')).toHaveAttribute('data-state', 'ready');
  await page.getByRole('button', { name: 'ENTER THE WORKS' }).click();
  await page.waitForTimeout(1000);
  const before = await page.evaluate(() => window.__VESPER_DEBUG__?.snapshot());
  const loads = [];
  for (let i = 0; i < 10; i++) {
    await page.evaluate(async () => { await window.__VESPER_DEBUG__?.reloadFixture(); });
    await page.waitForTimeout(100);
    loads.push(await page.evaluate(() => window.__VESPER_DEBUG__?.snapshot()));
  }
  const report = `docs/qa/ash-quay-checkpoint-b/lifecycle${backend === 'webgl2' ? '' : '-webgpu'}.json`;
  await writeFile(report, JSON.stringify({ before, loads, errors }, null, 2));
  for (const stats of loads) {
    expect(stats?.references).toBe(5); expect(stats?.resources).toBe(before?.resources); expect(stats?.listeners).toBe(before?.listeners);
    expect(stats?.textures).toBeLessThanOrEqual((before?.textures ?? 0) + 2);
    expect(stats?.estimatedGpuBytes).toBeLessThanOrEqual((before?.estimatedGpuBytes ?? 0) * 1.02);
  }
  await page.getByRole('button', { name: 'Open settings' }).click();
  const swaps = [];
  for (const quality of ['Mobile', 'High', 'Low', 'High', 'Mobile', 'High']) {
    await page.locator('#quality').selectOption(quality);
    await expect(page.locator('#quality')).toBeEnabled();
    await expect.poll(async () => page.evaluate(() => window.__VESPER_DEBUG__?.snapshot().artLoading)).toBe(false);
    await page.waitForTimeout(150);
    const stats = await page.evaluate(() => window.__VESPER_DEBUG__?.snapshot()); swaps.push(stats);
    expect(stats?.quality).toBe(quality); expect(stats?.references).toBe(5); expect(stats?.resources).toBe(before?.resources);
    if (quality === 'High') expect(stats?.textures).toBeLessThanOrEqual((before?.textures ?? 0) + 2);
  }
  await page.getByRole('button', { name: 'RETURN TO THE WORKS' }).click();
  await expect(page.locator('#app')).toHaveAttribute('data-state', 'running');
  await page.waitForTimeout(500);
  const after = await page.evaluate(() => window.__VESPER_DEBUG__?.snapshot());
  expect(after?.estimatedGpuBytes).toBeLessThanOrEqual((before?.estimatedGpuBytes ?? 0) * 1.02);
  expect(after?.textures).toBeLessThanOrEqual((before?.textures ?? 0) + 2);
  expect(errors).toEqual([]);
  await writeFile(report, JSON.stringify({ before, loads, swaps, after, errors }, null, 2));
});

test('a failed reflection variant load preserves the current scene and can be retried', async ({ page }) => {
  await page.goto('/?backend=webgl2'); await expect(page.locator('#app')).toHaveAttribute('data-state', 'ready');
  await page.getByRole('button', { name: 'ENTER THE WORKS' }).click();
  await page.route('**/assets/showcase/mobile/reflection.ktx2', (route) => route.fulfill({ status: 404, body: 'missing' }));
  await page.getByRole('button', { name: 'Open settings' }).click();
  await page.locator('#quality').selectOption('Mobile');
  await expect(page.locator('#art-status')).toContainText('Current view retained');
  await expect(page.locator('#quality')).toHaveValue('High');
  expect(await page.evaluate(() => window.__VESPER_DEBUG__?.snapshot().variant)).toBe('desktop');
  expect(await page.evaluate(() => window.__VESPER_DEBUG__?.snapshot().references)).toBe(5);
  await page.unroute('**/assets/showcase/mobile/reflection.ktx2');
  await page.locator('#quality').selectOption('Mobile'); await expect(page.locator('#quality')).toBeEnabled();
  expect(await page.evaluate(() => window.__VESPER_DEBUG__?.snapshot().variant)).toBe('mobile');
  await page.getByRole('button', { name: 'RETURN TO THE WORKS' }).click();
  await expect(page.locator('#app')).toHaveAttribute('data-state', 'running');
});

test('a relocated glTF resolves its external buffer beside the model', async ({ page }) => {
  const manifest = JSON.parse(await readFile('public/assets/fixtures/manifest.json', 'utf8')) as { assets: { vessel: { url: string } } };
  manifest.assets.vessel.url = '../relocated/models/vessel.gltf';
  const glb = await readFile('public/assets/fixtures/vessel.glb'); const jsonLength = glb.readUInt32LE(12);
  const model = JSON.parse(glb.subarray(20, 20 + jsonLength).toString()) as { buffers: Array<{ uri?: string }> };
  model.buffers[0]!.uri = 'data/vessel.bin';
  const body = glb.subarray(28 + jsonLength);
  let dependencyLoaded = false;
  await page.route('**/assets/fixtures/manifest.json', (route) => route.fulfill({ json: manifest }));
  await page.route('**/assets/relocated/models/vessel.gltf', (route) => route.fulfill({ json: model }));
  await page.route('**/assets/relocated/models/data/vessel.bin', (route) => { dependencyLoaded = true; return route.fulfill({ body, contentType: 'application/octet-stream' }); });
  await page.goto('/?scene=foundation&backend=webgl2');
  await expect(page.locator('#app')).toHaveAttribute('data-state', 'ready');
  expect(dependencyLoaded).toBe(true);
  expect(await page.evaluate(() => window.__VESPER_DEBUG__?.snapshot().references)).toBe(3);
});
