import { expect, test, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { PerspectiveCamera, Vector3 } from 'three';
test.use({ video: { mode: 'on', size: { width: 1440, height: 900 } } });
const snapshot = (page: Page) => page.evaluate(() => window.__VESPER_DEBUG__!.snapshot());
async function enter(page: Page, backend = 'webgl2') {
  await page.goto(`/?backend=${backend}`); await expect(page.locator('#app')).toHaveAttribute('data-state', 'ready'); await page.locator('#start').click();
  await expect.poll(async () => (await snapshot(page)).player!.grounded).toBe(true);
}
async function aimTarget(page: Page, id = 'isolated') {
  const s = await snapshot(page); const p = s.player!.position; const t = s.targets!.find(t => t.id === id)!; const v = page.viewportSize()!;
  const camera = new PerspectiveCamera(38, v.width / v.height, .1, 100); camera.position.set(p.x + 9.5, p.y + .85 + 15, p.z + 9.5); camera.lookAt(p.x, p.y + .85, p.z); camera.updateMatrixWorld();
  const point = new Vector3(t.position.x, p.y, t.position.z).project(camera); return { x: (point.x + 1) * v.width / 2, y: (1 - point.y) * v.height / 2 };
}
for (const backend of ['webgpu-required', 'webgl2']) test(`three-light combo, stagger and critical demonstration on ${backend}`, async ({ page }) => {
  test.skip(!test.info().project.name.endsWith('desktop'), 'Desktop hardware demonstration.'); test.setTimeout(120000);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message)); await enter(page, backend);
  await mkdir('docs/qa/phase3/browser', { recursive: true });
  expect((await snapshot(page)).backend).toBe(backend === 'webgl2' ? 'WebGL2' : 'WebGPU');
  await page.keyboard.down('d'); await page.keyboard.down('s'); await expect.poll(async () => (await snapshot(page)).player!.position.x, { intervals: [30] }).toBeGreaterThan(.6); await page.keyboard.up('d'); await page.keyboard.up('s'); await page.waitForTimeout(300);
  const attacks = [];
  for (let i = 0; i < 5; i++) {
    const before = (await snapshot(page)).player!.targetHits; const aim = await aimTarget(page);
    await page.mouse.click(aim.x, aim.y, { button: i >= 3 ? 'right' : 'left' });
    await expect.poll(async () => (await snapshot(page)).player!.targetHits, { intervals: [20] }).toBe(before + 1);
    attacks.push(await snapshot(page));
    if (i === 2) await page.screenshot({ path: `docs/qa/phase3/browser/${backend}-combo.png` });
    if (i === 3) { expect((await snapshot(page)).targets![0]!.posture).toBe(100); await page.screenshot({ path: `docs/qa/phase3/browser/${backend}-stagger.png` }); }
    await expect.poll(async () => (await snapshot(page)).player!.action, { intervals: [20] }).toBe('idle');
  }
  const final = await snapshot(page); expect(final.player!.criticals).toBe(1); expect(final.targets![0]!.health).toBe(0); expect(final.player!.defeats).toBe(1);
  await page.screenshot({ path: `docs/qa/phase3/browser/${backend}-critical.png` });
  await page.locator('#reset-targets').click(); expect((await snapshot(page)).targets!.every(t => t.health === t.maxHealth && t.posture === 0)).toBe(true);
  await page.getByRole('button', { name: 'Open settings' }).click(); await page.locator('#reduced-motion').check(); await page.locator('#quality').selectOption('Low'); await expect(page.locator('#quality')).toBeEnabled(); await page.locator('#resume').click();
  await expect(page.locator('#app')).toHaveAttribute('data-state', 'running');
  const lowAttacks = [];
  for (let i = 0; i < 5; i++) {
    const hits = (await snapshot(page)).player!.targetHits; const aim = await aimTarget(page); await page.mouse.click(aim.x, aim.y, { button: i >= 3 ? 'right' : 'left' });
    await expect.poll(async () => (await snapshot(page)).player!.targetHits).toBe(hits + 1);
    const state = await snapshot(page); lowAttacks.push(state);
    expect(state.targets![0]!.health).toBe(attacks[i]!.targets![0]!.health); expect(state.targets![0]!.posture).toBe(attacks[i]!.targets![0]!.posture);
    await expect.poll(async () => (await snapshot(page)).player!.action).toBe('idle');
  }
  await expect.poll(async () => (await snapshot(page)).voices).toBe(3);
  expect(errors).toEqual([]); await writeFile(`docs/qa/phase3/combat-${backend}.json`, JSON.stringify({ attacks, final, lowAttacks, afterQualityChange: await snapshot(page), errors }, null, 2));
  const video = page.video(); await page.context().close(); await video?.saveAs(`docs/qa/phase3/combat-${backend}.webm`);
});
test('Ward absorbs a telegraphed vent pulse and consumes pressure', async ({ page }) => {
  test.skip(!test.info().project.name.endsWith('desktop'), 'Keyboard Ward timing.'); await enter(page);
  await page.keyboard.down('w'); await expect.poll(async () => (await snapshot(page)).player!.position.x, { intervals: [20] }).toBeLessThan(-3.6); await page.keyboard.up('w');
  await expect.poll(async () => (await snapshot(page)).player!.ventRemaining, { intervals: [20] }).toBeLessThan(.4);
  await expect(page.locator('#player-message')).toContainText('VENT PULSE'); await page.keyboard.press('q');
  await expect.poll(async () => (await snapshot(page)).player!.wardRemaining, { intervals: [20] }).toBeGreaterThan(0);
  await page.screenshot({ path: 'docs/qa/phase3/browser/ward.png' });
  await expect.poll(async () => (await snapshot(page)).player!.blocks, { intervals: [20] }).toBe(1);
  const s = await snapshot(page); expect(s.player!.health).toBe(100); expect(s.player!.pressure).toBe(75); await writeFile('docs/qa/phase3/ward.json', JSON.stringify(s, null, 2));
});
test('mobile Heavy and Ward controls remain distinct at maximum scale and both handedness settings', async ({ page }) => {
  test.skip(!test.info().project.name.endsWith('mobile'), 'Touch controls.'); await enter(page);
  const requests: string[] = []; page.on('request', r => requests.push(r.url()));
  for (const left of [false, true]) {
    await page.locator('#settings-open').tap(); await page.locator('#left-handed').setChecked(left); await page.locator('#ui-scale').fill('1.4'); await page.locator('#resume').tap();
    const selectors = ['#movement-stick', '#pulse', '#run', '#dodge', '#heavy', '#ward']; const rects = [];
    for (const selector of selectors) { const r = (await page.locator(selector).boundingBox())!; expect(r.width).toBeGreaterThanOrEqual(44); expect(r.height).toBeGreaterThanOrEqual(44); expect(r.x).toBeGreaterThanOrEqual(0); expect(r.y).toBeGreaterThanOrEqual(0); expect(r.x + r.width).toBeLessThanOrEqual(915); expect(r.y + r.height).toBeLessThanOrEqual(412); rects.push(r); }
    for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) { const a = rects[i]!; const b = rects[j]!; expect(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y).toBe(true); }
    await page.locator('#heavy').tap(); await expect.poll(async () => (await snapshot(page)).player!.action).toBe('heavy'); await expect.poll(async () => (await snapshot(page)).player!.action).toBe('idle');
    await page.locator('#ward').tap(); await expect.poll(async () => (await snapshot(page)).player!.action).toBe('ward'); await page.screenshot({ path: `docs/qa/phase3/browser/mobile-${left ? 'left' : 'right'}.png` }); await expect.poll(async () => (await snapshot(page)).player!.action).toBe('idle');
  }
  expect((await snapshot(page)).player!.pressure).toBe(50); expect(requests.some(r => r.includes('/cinematic/'))).toBe(false);
  await writeFile('docs/qa/phase3/mobile-combat.json', JSON.stringify({ snapshot: await snapshot(page), requests }, null, 2));
});
