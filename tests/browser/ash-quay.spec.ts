import { expect, test } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { clickSceneTool } from '../helpers/scene-menu';

test('authored Ash Quay proof, compact HUD, practice and retained inspection', async ({ page, browser }) => {
  const name = test.info().project.name, mobile = name === 'proof-mobile';
  const backend = name === 'proof-webgpu' ? 'webgpu-required' : 'webgl2';
  const errors: string[] = [], requests: string[] = [];
  page.on('pageerror', e => errors.push(e.message)); page.on('request', r => requests.push(r.url()));
  const folder = 'docs/qa/ash-quay-checkpoint-b'; await mkdir(folder, { recursive: true });
  await page.goto(`/?backend=${backend}`); await expect(page.locator('#app')).toHaveAttribute('data-state', 'ready');
  await page.locator('#start').click(); await page.waitForTimeout(1500);
  await expect(page.locator('#showcase-controls')).toBeHidden();
  await expect(page.locator('#player-hud')).toBeVisible();
  await expect(page.locator('#combat-score')).toBeHidden();
  await page.screenshot({ path: `${folder}/${name}-player.png` });
  const before = await page.evaluate(() => window.__VESPER_DEBUG__!.snapshot());
  expect(before.backend).toBe(name === 'proof-webgpu' ? 'WebGPU' : 'WebGL2');
  expect(before.variant).toBe(mobile ? 'mobile' : 'desktop');
  await page.keyboard.press('f'); await expect(page.locator('#app')).toHaveAttribute('data-weapon', 'baton');
  await clickSceneTool(page, '#view-courtyard'); await page.waitForTimeout(700);
  await page.screenshot({ path: `${folder}/${name}-overview.png` });
  await clickSceneTool(page, '#view-player'); await clickSceneTool(page, '#encounter-group');
  await expect(page.locator('#app')).toHaveAttribute('data-encounter-kind', 'group');
  await page.keyboard.press('q'); await page.waitForTimeout(400);
  await page.screenshot({ path: `${folder}/${name}-combat.png` });
  await clickSceneTool(page, '#encounter-return');
  await page.locator('#settings-open').click();
  if (mobile) {
    await page.locator('#ui-scale').fill('1.4'); await page.locator('#left-handed').check();
    await page.locator('#resume').click();
    for (const selector of ['#movement-stick', '#pulse', '#heavy', '#ward']) {
      const box = await page.locator(selector).boundingBox(); expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThanOrEqual(44); expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.x).toBeGreaterThanOrEqual(0); expect(box!.x + box!.width).toBeLessThanOrEqual(915);
    }
    await page.screenshot({ path: `${folder}/${name}-left-handed.png` });
    const stick = (await page.locator('#movement-stick').boundingBox())!;
    const touch = await page.context().newCDPSession(page);
    await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: stick.x + stick.width * .7, y: stick.y + stick.height / 2 }] });
    await touch.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    await touch.detach();
    await page.setViewportSize({ width: 412, height: 915 }); await expect(page.locator('#rotate')).toBeVisible();
    await page.setViewportSize({ width: 915, height: 412 }); await expect(page.locator('#rotate')).toBeHidden();
    expect(requests.some(url => url.includes('/showcase/cinematic/') || url.includes('/showcase/desktop/'))).toBe(false);
  } else {
    await page.screenshot({ path: `${folder}/${name}-pause.png` }); await page.locator('#resume').click();
    await clickSceneTool(page, '#inspection-toggle'); await expect(page.locator('#app')).toHaveAttribute('data-inspection', 'active');
    await clickSceneTool(page, '#inspection-toggle'); await page.waitForTimeout(500);
    const after = await page.evaluate(() => window.__VESPER_DEBUG__!.snapshot());
    expect(after.resources).toBe(before.resources + 1); // Acquired armed pack remains session-owned.
    expect(after.player!.weapon).toBe('baton');
    expect(after.listeners).toBe(before.listeners);
  }
  expect(errors).toEqual([]);
  await writeFile(`${folder}/${name}.json`, JSON.stringify({ backend: before.backend, browser: browser.version(), viewport: page.viewportSize(), before, after: await page.evaluate(() => window.__VESPER_DEBUG__!.snapshot()), errors, requests }, null, 2));
  const video = page.video(); await page.context().close(); await video?.saveAs(`${folder}/${name}-walkthrough.webm`);
});
