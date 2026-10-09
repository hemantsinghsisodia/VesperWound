import { expect, test, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { PerspectiveCamera, Vector3 } from 'three';

const state = (page: Page) => page.evaluate(() => window.__VESPER_DEBUG__!.snapshot().player!);
async function enter(page: Page) {
  await page.goto('/?backend=webgl2'); await expect(page.locator('#app')).toHaveAttribute('data-state', 'ready');
  await page.locator('#start').click(); await expect.poll(async () => (await state(page)).grounded).toBe(true);
}

test('player walks, runs, punches a target, dodges and freezes in preview/settings', async ({ page }) => {
  test.skip(!test.info().project.name.endsWith('desktop'), 'Keyboard/mouse flow.'); test.setTimeout(120000);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message)); await enter(page);
  await mkdir('docs/qa/phase4a/regressions/browser', { recursive: true });
  await page.keyboard.down('d'); await page.keyboard.down('s');
  await expect.poll(async () => (await state(page)).position.x, { intervals: [20] }).toBeGreaterThan(.7);
  await page.keyboard.up('d'); await page.keyboard.up('s'); await page.waitForTimeout(250);
  const before = await state(page); expect(before.position.z).toBeCloseTo(3.4, 1); expect(before.health).toBe(100);
  const viewport = page.viewportSize()!; const camera = new PerspectiveCamera(38, viewport.width / viewport.height, .1, 100);
  camera.position.set(before.position.x + 9.5, before.position.y + .85 + 15, before.position.z + 9.5);
  camera.lookAt(before.position.x, before.position.y + .85, before.position.z); camera.updateMatrixWorld();
  const projected = new Vector3(1.5, .05, 3.4).project(camera);
  await page.mouse.click((projected.x + 1) * viewport.width / 2, (1 - projected.y) * viewport.height / 2);
  await expect.poll(async () => (await state(page)).targetHits).toBe(1);
  await page.screenshot({ path: 'docs/qa/phase4a/regressions/browser/desktop-punch.png' });
  await page.waitForTimeout(600); await page.keyboard.press('Space');
  await expect.poll(async () => (await state(page)).action, { intervals: [20] }).toBe('dodge');
  await page.screenshot({ path: 'docs/qa/phase4a/regressions/browser/desktop-dodge.png' }); await page.waitForTimeout(850);
  await page.getByRole('button', { name: 'Open settings' }).click(); const stopped = (await state(page)).position;
  await page.keyboard.down('w'); await page.waitForTimeout(250); expect((await state(page)).position).toEqual(stopped);
  await page.keyboard.up('w'); await page.locator('#resume').click();
  await page.locator('#view-character').click(); const frozen = (await state(page)).position;
  await page.keyboard.down('w'); await page.waitForTimeout(250); await page.keyboard.up('w'); expect((await state(page)).position).toEqual(frozen);
  await page.locator('#view-player').click(); await page.keyboard.down('Shift'); await page.keyboard.down('a');
  await expect.poll(async () => (await state(page)).action).toBe('run'); await page.keyboard.up('a'); await page.keyboard.up('Shift');
  expect(errors).toEqual([]); await writeFile('docs/qa/phase4a/regressions/player-desktop.json', JSON.stringify({ before, after: await state(page), errors }, null, 2));
});

test('pressure vent damages the player, death locks movement, restart restores health', async ({ page }) => {
  test.skip(!test.info().project.name.endsWith('desktop'), 'Keyboard flow.'); await enter(page);
  // W moves toward the marked vent in the 45-degree camera basis.
  await page.keyboard.down('w'); await expect.poll(async () => (await state(page)).position.x, { intervals: [20] }).toBeLessThan(-3.6);
  await page.keyboard.up('w'); await expect.poll(async () => (await state(page)).health, { intervals: [20] }).toBeLessThan(100);
  await expect.poll(async () => (await state(page)).health, { timeout: 12000 }).toBe(0);
  const dead = await state(page); await page.waitForTimeout(2500);
  await page.screenshot({ path: 'docs/qa/phase4a/regressions/browser/desktop-death.png' });
  await page.keyboard.down('d'); await page.waitForTimeout(200); await page.keyboard.up('d'); expect((await state(page)).position).toEqual(dead.position);
  await page.locator('#restart-player').click(); expect((await state(page)).health).toBe(100);
  expect((await state(page)).action).toBe('idle'); await writeFile('docs/qa/phase4a/regressions/player-death.json', JSON.stringify({ dead, restarted: await state(page) }, null, 2));
});

test('mobile player supports simultaneous touch, cancellation, handedness and portrait pause', async ({ page }) => {
  test.skip(!test.info().project.name.endsWith('mobile'), 'Touch flow.'); await enter(page);
  const requests: string[] = []; page.on('request', r => requests.push(r.url()));
  for (const selector of ['#movement-stick', '#pulse', '#dodge', '#run']) {
    await expect(page.locator(selector)).toBeVisible(); const bounds = (await page.locator(selector).boundingBox())!;
    expect(bounds.height).toBeGreaterThanOrEqual(44); expect(bounds.width).toBeGreaterThanOrEqual(44);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(412); expect(bounds.x + bounds.width).toBeLessThanOrEqual(915);
  }
  await page.evaluate(() => {
    const stick = document.querySelector<HTMLElement>('#movement-stick')!; const run = document.querySelector<HTMLElement>('#run')!;
    stick.setPointerCapture = () => {}; run.setPointerCapture = () => {};
    const b = stick.getBoundingClientRect(); stick.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 101, pointerType: 'touch', clientX: b.x + b.width, clientY: b.y + b.height / 2, bubbles: true }));
    run.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 102, pointerType: 'touch', bubbles: true }));
  });
  await expect.poll(async () => (await state(page)).action).toBe('run');
  await page.evaluate(() => { for (const pointerId of [101, 102]) window.dispatchEvent(new PointerEvent('pointercancel', { pointerId, pointerType: 'touch' })); });
  await expect.poll(async () => (await state(page)).action).toBe('idle'); const stopped = (await state(page)).position;
  await page.waitForTimeout(250); const settled = (await state(page)).position;
  expect(settled.x).toBeCloseTo(stopped.x, 4); expect(settled.z).toBeCloseTo(stopped.z, 4);
  await page.locator('#dodge').tap(); await expect.poll(async () => (await state(page)).action, { intervals: [20] }).toBe('dodge');
  await page.waitForTimeout(850); await page.locator('#pulse').tap(); await expect.poll(async () => (await state(page)).strikes).toBe(1);
  await page.locator('#settings-open').tap(); await page.locator('#left-handed').check(); await page.locator('#ui-scale').fill('1.4'); await page.locator('#resume').tap();
  await page.screenshot({ path: 'docs/qa/phase4a/regressions/browser/mobile-player.png' });
  const stick = (await page.locator('#movement-stick').boundingBox())!; expect(stick.x).toBeGreaterThan(700);
  await page.setViewportSize({ width: 412, height: 915 }); await expect(page.locator('#rotate')).toBeVisible();
  await page.setViewportSize({ width: 915, height: 412 }); await expect(page.locator('#rotate')).toBeHidden();
  expect(requests.some(r => r.includes('/cinematic/'))).toBe(false);
});
