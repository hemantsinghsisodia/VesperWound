import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { clickSceneTool } from '../helpers/scene-menu';
import { exerciseEncounter, type ExerciseTotals } from '../helpers/encounter-driver';
import { projectGround } from '../helpers/scene-menu';
import { BATON } from '../../src/player/weapon-definitions';
import { sampleWeaponContact } from '../../src/player/weapon-contact';
import type { FrameStatistics } from '../../src/performance/metrics';
import { walkTo } from '../helpers/district-driver';

const baseline = process.env.VESPER_BATON_BASELINE === '1';
const root = `docs/qa/baton-combat-feel/${baseline ? 'before' : 'after'}`;
test.use({ video: { mode: 'on', size: { width: 1440, height: 900 } } });
interface Trace { clicks: number[]; frames: { at: number; player: FrameStatistics['player']; contact: FrameStatistics['weaponContact'] }[]; stopped: boolean }
declare global { interface Window { __BATON_TRACE__?: Trace } }

test('swing comparisons and real-input combat', async ({ page, browser }, info) => {
  test.skip(info.project.name.endsWith('mobile'), 'Desktop matched studio captures.');
  const backend = info.project.name.endsWith('webgpu') ? 'webgpu-required' : 'webgl2';
  const folder = `${root}/${info.project.name}`;
  await mkdir(folder, { recursive: true });
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`/?backend=${backend}`);
  await expect(page.locator('#app')).toHaveAttribute('data-state', 'ready');
  await page.locator('#start').click(); await page.keyboard.press('f');
  await expect(page.locator('#app')).toHaveAttribute('data-weapon', 'baton');
  await page.mouse.click(550, 550); await page.waitForTimeout(baseline ? 280 : 180);
  await page.screenshot({ path: `${folder}/gameplay-light.png` });
  await page.waitForTimeout(800);
  await clickSceneTool(page, '#inspection-toggle');
  await expect(page.locator('#app')).toHaveAttribute('data-inspection', 'active');
  for (const name of ['Light1', 'Light2', 'Light3', 'Heavy']) {
    await page.locator('#animation').selectOption(`clip:Baton_${name}`);
    if (baseline) {
      await page.waitForTimeout(name === 'Heavy' ? 500 : 280);
      await page.locator('#animation-pause').click();
    } else {
      const time = name === 'Heavy' ? .425 : name === 'Light1' ? .2 : name === 'Light2' ? .225 : 16 / 60;
      await page.waitForTimeout(200);
      await page.evaluate(t => window.__VESPER_DEBUG__!.inspectPose(t), time);
    }
    await page.screenshot({ path: `${folder}/${name}-front.png` });
    await page.locator('#turn-character').click({ clickCount: 2, delay: 50 });
    await page.screenshot({ path: `${folder}/${name}-side.png` });
    await page.locator('#turn-character').click({ clickCount: 6, delay: 30 });
    if (!baseline) {
      const a = Object.values(BATON.attacks).find(a => a!.clip === `Baton_${name}`)!;
      for (const [label, time] of [['windup', a.active[0] - .05], ['follow-through', a.active[1] + .05]] as const) {
        await page.evaluate(t => window.__VESPER_DEBUG__!.inspectPose(t), time);
        await page.screenshot({ path: `${folder}/${name}-${label}.png` });
      }
    }
    await page.locator('#animation-pause').click();
  }
  await clickSceneTool(page, '#inspection-toggle');
  await clickSceneTool(page, '#encounter-start');
  await expect(page.locator('#app')).toHaveAttribute('data-encounter', 'active');
  const totals: ExerciseTotals = { encounters: 0, victories: 0, hits: 0, criticals: 0, blocks: 0, strikes: 0, damageTaken: 0 };
  let running = true;
  const driver = exerciseEncounter(page, () => running, totals);
  await page.waitForTimeout(15000); running = false; await driver;
  await page.screenshot({ path: `${folder}/combat.png` });
  await writeFile(`${folder}/comparison.json`, JSON.stringify({ browser: browser.version(), backend, totals, errors, snapshot: await page.evaluate(() => window.__VESPER_DEBUG__!.snapshot()) }, null, 2));
  expect(errors).toEqual([]);
  const video = page.video(); await page.context().close(); await video?.saveAs(`${folder}/swing-combat.webm`);
});

test('real clicks queue the chain and rendered contact follows CPU attack time', async ({ page }, info) => {
  test.skip(baseline, 'Repaired input acceptance.');
  const mobile = info.project.name.endsWith('mobile');
  await page.goto(`/?backend=${info.project.name.endsWith('webgl2') ? 'webgl2' : 'webgpu-required'}`);
  await expect(page.locator('#app')).toHaveAttribute('data-state', 'ready'); await page.locator('#start').click();
  if (mobile) {
    await page.locator('#settings-open').click(); await page.locator('#left-handed').check();
    await page.locator('#ui-scale').fill('1.4'); await page.locator('#resume').click();
    await page.locator('#pickup').tap();
  } else await page.keyboard.press('f');
  await expect(page.locator('#app')).toHaveAttribute('data-weapon', 'baton');
  const start = await page.evaluate(() => window.__VESPER_DEBUG__!.snapshot().player!);
  const aim = await projectGround(page, { x: start.position.x, y: start.position.y, z: start.position.z + 1 });
  // Warm the armed pipeline before latency observations; this test does not
  // attribute first-use shader compilation to simulation input handling.
  if (mobile) await page.locator('#pulse').tap(); else await page.mouse.click(aim.x, aim.y);
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    const trace: Trace = { clicks: [], frames: [], stopped: false }; window.__BATON_TRACE__ = trace;
    const controller = new AbortController();
    document.addEventListener('pointerdown', () => trace.clicks.push(performance.now()), { signal: controller.signal });
    const observe = () => {
      if (trace.stopped) { controller.abort(); return; }
      const s = window.__VESPER_DEBUG__!.snapshot();
      trace.frames.push({ at: performance.now(), player: s.player, contact: s.weaponContact });
      requestAnimationFrame(observe);
    }; requestAnimationFrame(observe);
  });
  // Warm-up was light 1; let its combo expire so the measured chain starts at 1.
  await page.waitForTimeout(350);
  const attack = async (heavy = false) => { if (mobile) await page.locator(heavy ? '#heavy' : '#pulse').tap(); else await page.mouse.click(aim.x, aim.y, { button: heavy ? 'right' : 'left' }); };
  await attack();
  await page.waitForFunction(() => window.__VESPER_DEBUG__!.snapshot().player?.attack === 'baton-light1');
  await page.waitForTimeout(55); await attack();
  await page.waitForFunction(() => window.__VESPER_DEBUG__!.snapshot().player?.attack === 'baton-light2');
  await page.waitForTimeout(55); await attack();
  await page.waitForFunction(() => window.__VESPER_DEBUG__!.snapshot().player?.attack === 'baton-light3');
  await page.waitForTimeout(55); await attack(true);
  await page.waitForFunction(() => window.__VESPER_DEBUG__!.snapshot().player?.attack === 'baton-heavy');
  await page.waitForTimeout(850);
  const trace = await page.evaluate(() => { window.__BATON_TRACE__!.stopped = true; return window.__BATON_TRACE__!; });
  const contacts: { attack: string; time: number; error: number }[] = [];
  for (const f of trace.frames) {
    const p = f.player, c = f.contact;
    if (!p?.attack || !c || c.time == null) continue;
    expect(c.time).toBeGreaterThanOrEqual(p.actionTime - 1e-6);
    expect(c.time).toBeLessThanOrEqual(p.actionTime + 1 / 60 + 1e-6);
    const a = BATON.attacks[p.attack]; if (!a || c.time < a.active[0] || c.time >= a.active[1]) continue;
    const pose = sampleWeaponContact(a.contact!, c.time);
    for (const key of ['base', 'tip'] as const) {
      const v = pose[key], expected = [p.position.x + v.x * Math.cos(p.facing) + v.z * Math.sin(p.facing), p.position.y + v.y, p.position.z + v.z * Math.cos(p.facing) - v.x * Math.sin(p.facing)];
      contacts.push({ attack: p.attack, time: c.time, error: Math.hypot(...c[key].map((n, i) => n - expected[i]!)) });
    }
  }
  const first = trace.frames.find(f => f.at >= trace.clicks[0]! && f.player?.attack === 'baton-light1');
  const latency = first!.at - trace.clicks[0]!;
  const guard = trace.frames.filter(f => f.at < trace.clicks[0]!).at(-1)!.contact!;
  const moving = trace.frames.find(f => f.at >= trace.clicks[0]! && f.player?.attack === 'baton-light1' && f.contact && Math.hypot(...f.contact.tip.map((v, i) => v - guard.tip[i]!)) > .001);
  const visibleMotionMs = moving!.at - trace.clicks[0]!;
  for (const id of [...BATON.light, BATON.heavy]) expect(contacts.filter(c => c.attack === id).length, id).toBeGreaterThan(0);
  expect(Math.max(...contacts.map(c => c.error))).toBeLessThan(.03);
  expect(latency).toBeLessThan(100);
  expect(visibleMotionMs).toBeLessThan(100);
  await mkdir(`${root}/${info.project.name}`, { recursive: true });
  await writeFile(`${root}/${info.project.name}/input-contact.json`, JSON.stringify({ latencyMs: latency, visibleMotionMs, contacts, trace }, null, 2));
  if (mobile) await page.screenshot({ path: `${root}/${info.project.name}/mobile-controls.png` });
  const video = page.video(); await page.context().close(); await video?.saveAs(`${root}/${info.project.name}/chain-input.webm`);
});

test('queued follow-ups clear across settings, inspection and quality replacement', async ({ page }, info) => {
  test.skip(baseline || !info.project.name.endsWith('webgpu'), 'One desktop lifecycle regression.');
  await page.goto('/?backend=webgpu-required'); await expect(page.locator('#app')).toHaveAttribute('data-state', 'ready');
  await page.locator('#start').click(); await page.keyboard.press('f');
  await expect(page.locator('#app')).toHaveAttribute('data-weapon', 'baton');
  for (const operation of ['pause', 'inspection', 'quality']) {
    const before = await page.evaluate(() => window.__VESPER_DEBUG__!.snapshot().player!.strikes);
    await page.mouse.click(550, 550);
    await page.waitForFunction(() => window.__VESPER_DEBUG__!.snapshot().player!.attack !== null);
    await page.waitForTimeout(50); await page.mouse.click(550, 550);
    await page.waitForFunction(() => window.__VESPER_DEBUG__!.snapshot().player!.pendingAttack === 'attack');
    if (operation === 'inspection') {
      await clickSceneTool(page, '#inspection-toggle'); await expect(page.locator('#app')).toHaveAttribute('data-inspection', 'active');
      expect((await page.evaluate(() => window.__VESPER_DEBUG__!.snapshot().player!.pendingAttack))).toBeNull();
      await clickSceneTool(page, '#inspection-toggle');
    } else {
      await page.locator('#settings-open').click();
      expect((await page.evaluate(() => window.__VESPER_DEBUG__!.snapshot().player!.pendingAttack))).toBeNull();
      if (operation === 'quality') { await page.locator('#quality').selectOption('Low'); await expect(page.locator('#quality')).toBeEnabled(); }
      await page.locator('#resume').click();
    }
    await page.waitForTimeout(1100);
    expect((await page.evaluate(() => window.__VESPER_DEBUG__!.snapshot().player!.strikes))).toBe(before + 1);
    await expect(page.locator('#app')).toHaveAttribute('data-weapon', 'baton');
  }
});

test('three early queued clicks land the full light combo on a real training target', async ({ page }, info) => {
  test.skip(baseline, 'Repaired light-combo contact.');
  const mobile = info.project.name.endsWith('mobile');
  await page.goto(`/?backend=${info.project.name.endsWith('webgl2') || mobile ? 'webgl2' : 'webgpu-required'}`);
  await expect(page.locator('#app')).toHaveAttribute('data-state', 'ready'); await page.locator('#start').click();
  if (mobile) await page.locator('#pickup').tap(); else await page.keyboard.press('f');
  await expect(page.locator('#app')).toHaveAttribute('data-weapon', 'baton');
  await walkTo(page, { x: .8, z: 3.4 }, mobile);
  const target = (await page.evaluate(() => window.__VESPER_DEBUG__!.snapshot().targets!)).find(t => t.id === 'isolated')!;
  const point = await projectGround(page, target.position);
  const strike = async () => { if (mobile) await page.locator('#pulse').tap(); else await page.mouse.click(point.x, point.y); };
  await strike();
  await page.waitForFunction(() => window.__VESPER_DEBUG__!.snapshot().player?.attack === 'baton-light1');
  await page.waitForTimeout(55); await strike();
  await page.waitForFunction(() => window.__VESPER_DEBUG__!.snapshot().player?.attack === 'baton-light2');
  await page.waitForTimeout(55); await strike();
  await page.waitForFunction(() => window.__VESPER_DEBUG__!.snapshot().player?.attack === 'baton-light3');
  await page.waitForTimeout(700);
  const snapshot = await page.evaluate(() => window.__VESPER_DEBUG__!.snapshot());
  expect(snapshot.targets!.find(t => t.id === 'isolated')!.health).toBe(16);
  expect(snapshot.player!.targetHits).toBe(3); expect(snapshot.player!.strikes).toBe(3);
  await mkdir(`${root}/${info.project.name}`, { recursive: true });
  await page.screenshot({ path: `${root}/${info.project.name}/training-combo.png` });
  await writeFile(`${root}/${info.project.name}/training-combo.json`, JSON.stringify(snapshot, null, 2));
  const video = page.video(); await page.context().close(); await video?.saveAs(`${root}/${info.project.name}/training-combo.webm`);
});

test('native dodge commits windup, cancels recovery and discards the pending heavy', async ({ page }, info) => {
  test.skip(baseline, 'Repaired recovery timing.');
  const mobile = info.project.name.endsWith('mobile');
  await page.goto(`/?backend=${info.project.name.endsWith('webgl2') || mobile ? 'webgl2' : 'webgpu-required'}`);
  await expect(page.locator('#app')).toHaveAttribute('data-state', 'ready'); await page.locator('#start').click();
  if (mobile) await page.locator('#pickup').tap(); else await page.keyboard.press('f');
  await expect(page.locator('#app')).toHaveAttribute('data-weapon', 'baton');
  const p = (await page.evaluate(() => window.__VESPER_DEBUG__!.snapshot())).player!;
  const point = await projectGround(page, { ...p.position, z: p.position.z + 1 });
  if (mobile) await page.locator('#pulse').tap(); else await page.mouse.click(point.x, point.y);
  await page.waitForFunction(() => window.__VESPER_DEBUG__!.snapshot().player?.attack === 'baton-light1');
  if (mobile) await page.locator('#dodge').tap(); else await page.keyboard.press('Space');
  expect((await page.evaluate(() => window.__VESPER_DEBUG__!.snapshot().player!.action))).toBe('attack');
  await page.waitForTimeout(55);
  if (mobile) await page.locator('#heavy').tap(); else await page.mouse.click(point.x, point.y, { button: 'right' });
  await page.waitForFunction(() => { const p = window.__VESPER_DEBUG__!.snapshot().player!; return p.attack === 'baton-light1' && p.actionTime >= .27; });
  if (mobile) await page.locator('#dodge').tap(); else await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__VESPER_DEBUG__!.snapshot().player?.action === 'dodge');
  expect((await page.evaluate(() => window.__VESPER_DEBUG__!.snapshot().player!.pendingAttack))).toBeNull();
  await page.waitForTimeout(1000);
  expect((await page.evaluate(() => window.__VESPER_DEBUG__!.snapshot().player!.strikes))).toBe(1);
});
