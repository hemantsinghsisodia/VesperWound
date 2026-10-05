import { mkdir, writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

test('sustained ten-minute desktop WebGPU measurement', async ({ page, browser }) => {
  test.skip(process.env.VESPER_PERFORMANCE !== '1', 'Opt in with VESPER_PERFORMANCE=1; ten-minute hardware measurement.');
  test.setTimeout(720000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?backend=webgpu-required');
  await expect(page.locator('#app')).toHaveAttribute('data-state', 'ready');
  await page.getByRole('button', { name: 'ENTER THE WORKS' }).click();
  // Fixed High settings make this result comparable; adaptation cannot hide the cost.
  await page.getByRole('button', { name: 'Open settings' }).click();
  await page.locator('#quality').selectOption('High');
  await page.locator('#adaptive').uncheck();
  await page.getByRole('button', { name: 'RETURN TO THE WORKS' }).click();
  await expect(page.locator('#app')).toHaveAttribute('data-state', 'running');
  await page.waitForTimeout(30000);
  const adapter = await page.evaluate(async () => {
    const selected = await navigator.gpu?.requestAdapter();
    return selected ? { vendor: selected.info.vendor, architecture: selected.info.architecture, device: selected.info.device, description: selected.info.description } : null;
  });
  const before = await page.evaluate(() => { window.__VESPER_DEBUG__?.resetMetrics(); return window.__VESPER_DEBUG__?.snapshot(); });
  const samples = [];
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(30000);
    const sample = await page.evaluate(() => window.__VESPER_DEBUG__?.snapshot());
    samples.push(sample);
    console.log(`Measured ${(i + 1) * 30}s: ${sample?.fps.toFixed(1)} FPS, p95 ${sample?.p95.toFixed(1)} ms`);
    await expect(page.locator('#app')).toHaveAttribute('data-state', 'running');
  }
  const metrics = await page.evaluate(() => window.__VESPER_DEBUG__?.exportMetrics());
  const evidence = { date: new Date().toISOString(), browser: browser.version(), backend: 'WebGPU', durationSeconds: 600, warmupSeconds: 30, adapter, before, samples, metrics, errors };
  await mkdir('docs/qa', { recursive: true });
  await writeFile('docs/qa/desktop-performance.json', JSON.stringify(evidence, null, 2));
  expect(errors).toEqual([]);
  expect(samples.at(-1)?.references).toBe(before?.references);
  expect(samples.at(-1)?.resources).toBe(before?.resources);
  expect(samples.at(-1)?.textures).toBe(before?.textures);
});
