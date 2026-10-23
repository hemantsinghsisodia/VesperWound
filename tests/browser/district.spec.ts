import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { walkTo, observedPosition } from '../helpers/district-driver';
import { clickSceneTool } from '../helpers/scene-menu';
const folder = process.env.VESPER_DISTRICT_QA ?? 'docs/qa/ash-quay-checkpoint-c';
test('two-area traversal, loaded-tier ownership, cutaway and return', async ({ page, browser }) => {
  const name = test.info().project.name, mobile = name === 'district-mobile', backend = name === 'district-webgpu' ? 'webgpu-required' : 'webgl2';
  const errors: string[] = [], requests: string[] = [];
  page.on('pageerror', e => errors.push(e.message)); page.on('request', r => requests.push(r.url()));
  await mkdir(folder, { recursive: true });
  await page.goto(`/?backend=${backend}`); await expect(page.locator('#app')).toHaveAttribute('data-state', 'ready'); await page.locator('#start').click();
  await page.keyboard.press('f'); await expect(page.locator('#app')).toHaveAttribute('data-weapon', 'baton');
  expect(requests.some(r => r.includes('/district/'))).toBe(false);
  if (mobile) { await page.locator('#settings-open').click(); await page.locator('#left-handed').check(); await page.locator('#ui-scale').fill('1.4'); await page.locator('#resume').click(); }
  const initial = await page.evaluate(() => window.__VESPER_DEBUG__!.snapshot());
  await page.screenshot({ path: `${folder}/${name}-court.png` });
  await walkTo(page, { x: 0, z: 6.8 }, mobile); await expect(page.locator('#app')).toHaveAttribute('data-district', 'ready');
  await walkTo(page, { x: 0, z: 13 }, mobile); await page.waitForTimeout(400); await page.screenshot({ path: `${folder}/${name}-lane.png` });
  await walkTo(page, { x: 0, z: 25.5 }, mobile); await page.waitForTimeout(400); await page.screenshot({ path: `${folder}/${name}-quay.png` });
  expect((await observedPosition(page)).y).toBeGreaterThan(-.1);
  await walkTo(page, { x: -5, z: 23 }, mobile); await page.waitForTimeout(400); await page.screenshot({ path: `${folder}/${name}-canopy.png` });
  const inside = await page.evaluate(() => window.__VESPER_DEBUG__!.snapshot());
  expect(inside.references).toBe(initial.references + 1);
  expect(inside.hiddenCutaways).toBeGreaterThan(0);
  if (!mobile) {
    await page.route('**/assets/district/mobile/**', route => route.fulfill({ status: 503, body: 'offline replacement' }));
    await page.locator('#settings-open').click(); await page.locator('#quality').selectOption('Low');
    await expect(page.locator('#quality')).toHaveValue('High'); await expect(page.locator('#quality')).toBeEnabled();
    await page.locator('#resume').click(); expect((await observedPosition(page)).z).toBeGreaterThan(22);
    expect((await page.evaluate(() => window.__VESPER_DEBUG__!.snapshot())).references).toBe(inside.references);
    await page.unroute('**/assets/district/mobile/**');
  }
  await page.locator('#settings-open').click(); await page.locator('#quality').selectOption('Low'); await expect(page.locator('#quality')).toBeEnabled();
  await page.locator('#resume').click(); expect((await observedPosition(page)).z).toBeGreaterThan(22);
  await expect(page.locator('#app')).toHaveAttribute('data-district', 'ready');
  if (!mobile) {
    await page.locator('#settings-open').click(); await page.locator('#quality').selectOption('High'); await expect(page.locator('#quality')).toBeEnabled(); await page.locator('#resume').click();
    await clickSceneTool(page, '#inspection-toggle'); await expect(page.locator('#app')).toHaveAttribute('data-inspection', 'active');
    await clickSceneTool(page, '#inspection-toggle'); expect((await observedPosition(page)).z).toBeGreaterThan(22);
  }
  await walkTo(page, { x: 0, z: 23 }, mobile); await walkTo(page, { x: 0, z: 6.8 }, mobile); await walkTo(page, { x: 0, z: 1 }, mobile);
  await expect(page.locator('#app')).toHaveAttribute('data-district', 'closed');
  // Warm re-entry must not request or upload a fresh section. The single retained
  // lease belongs to this scene and is released with it.
  const sectionRequests = requests.filter(r => r.includes('/district/')).length;
  const cycles = [];
  for (let cycle = 0; cycle < 2; cycle++) {
    await walkTo(page, { x: 0, z: 6.8 }, mobile); await expect(page.locator('#app')).toHaveAttribute('data-district', 'ready');
    await walkTo(page, { x: 0, z: 18 }, mobile); await walkTo(page, { x: 0, z: 1 }, mobile);
    await expect(page.locator('#app')).toHaveAttribute('data-district', 'closed');
    await page.waitForTimeout(200); cycles.push(await page.evaluate(() => window.__VESPER_DEBUG__!.snapshot()));
  }
  const final = await page.evaluate(() => window.__VESPER_DEBUG__!.snapshot());
  expect(final.references).toBe(initial.references + 1); expect(final.resources).toBe(initial.resources + 1); expect(final.listeners).toBe(initial.listeners);
  expect(requests.filter(r => r.includes('/district/')).length).toBe(sectionRequests);
  expect(final.player!.weapon).toBe('baton'); expect(errors).toEqual([]);
  if (mobile) expect(requests.some(r => r.includes('/district/desktop/') || r.includes('/showcase/cinematic/'))).toBe(false);
  await writeFile(`${folder}/${name}.json`, JSON.stringify({ browser: browser.version(), initial, inside, cycles, final, errors, requests }, null, 2));
  expect(cycles[1]!.textures).toBeLessThanOrEqual(cycles[0]!.textures + 1);
  expect(cycles[1]!.estimatedGpuBytes).toBeLessThanOrEqual(cycles[0]!.estimatedGpuBytes * 1.02);
  // A scene reload from the court releases the warm section; the new scene
  // must return to its baseline references without requesting another quay.
  await page.evaluate(async () => { await window.__VESPER_DEBUG__!.reloadFixture(); });
  const released = await page.evaluate(() => window.__VESPER_DEBUG__!.snapshot());
  expect(released.references).toBe(initial.references); expect(released.resources).toBe(initial.resources);
  expect(requests.filter(r => r.includes('/district/')).length).toBe(sectionRequests);
  const video = page.video(); await page.context().close(); await video?.saveAs(`${folder}/${name}.webm`);
});

test('failed and cancelled passage loads retain safe collision and retry', async ({ page }) => {
  test.skip(test.info().project.name !== 'district-webgpu');
  await page.route('**/assets/district/**', route => route.fulfill({ status: 503, body: 'offline' }));
  await page.goto('/'); await expect(page.locator('#app')).toHaveAttribute('data-state', 'ready'); await page.locator('#start').click();
  await walkTo(page, { x: 0, z: 7.3 }); await expect(page.locator('#app')).toHaveAttribute('data-district', 'failed');
  await page.keyboard.down('a'); await page.keyboard.down('s'); await page.waitForTimeout(800); await page.keyboard.up('a'); await page.keyboard.up('s');
  expect((await observedPosition(page)).z).toBeLessThan(8);
  await page.unroute('**/assets/district/**');
  let finish!: () => void;
  const delayed = new Promise<void>(resolve => { finish = resolve; });
  await page.route('**/assets/district/**', async route => { await delayed; await route.continue(); });
  await page.locator('#district-retry').click(); await expect(page.locator('#app')).toHaveAttribute('data-district', 'loading');
  await walkTo(page, { x: 0, z: 1 }); await expect(page.locator('#app')).toHaveAttribute('data-district', 'closed'); finish();
  // Cancelled preparation retains its lease until the last scheduled GPU task
  // settles. Assert eventual exact cleanup rather than a fixed wall-clock delay.
  await expect.poll(async () => (await page.evaluate(() => window.__VESPER_DEBUG__!.snapshot())).references).toBe(5);
  await page.unroute('**/assets/district/**'); await walkTo(page, { x: 0, z: 7 }); await expect(page.locator('#app')).toHaveAttribute('data-district', 'ready');
  await walkTo(page, { x: 0, z: 18 }); expect((await observedPosition(page)).z).toBeGreaterThan(17);
});

test('touch passage retry stays readable with compact mobile guidance', async ({ page }) => {
  test.skip(test.info().project.name !== 'district-mobile');
  await page.route('**/assets/district/**', route => route.fulfill({ status: 503, body: 'offline' }));
  await page.goto('/?backend=webgl2'); await expect(page.locator('#app')).toHaveAttribute('data-state', 'ready'); await page.locator('#start').tap();
  await page.locator('#settings-open').tap(); await page.locator('#left-handed').check(); await page.locator('#ui-scale').fill('1.4'); await page.locator('#resume').tap();
  await walkTo(page, { x: 0, z: 6.8 }, true); await expect(page.locator('#app')).toHaveAttribute('data-district', 'failed');
  // Mission polish intentionally hides the duplicate district heading on mobile.
  await expect(page.locator('#district-guide')).toBeHidden();
  await expect(page.locator('#district-status')).toBeVisible();
  const message = (await page.locator('#district-status').boundingBox())!;
  expect(message.y).toBeGreaterThanOrEqual(0); expect(message.y + message.height).toBeLessThan(412);
  const retry = (await page.locator('#district-retry').boundingBox())!;
  expect(retry.height).toBeGreaterThanOrEqual(44); expect(retry.y + retry.height).toBeLessThan(412);
  await page.screenshot({ path: `${folder}/district-mobile-retry.png` });
  await page.unroute('**/assets/district/**'); await page.locator('#district-retry').tap(); await expect(page.locator('#app')).toHaveAttribute('data-district', 'ready');
  await walkTo(page, { x: 0, z: 18 }, true); expect((await observedPosition(page)).z).toBeGreaterThan(17);
});
