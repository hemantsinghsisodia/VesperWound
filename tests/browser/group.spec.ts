import { expect, test, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { exerciseGroup, type GroupTotals } from '../helpers/group-driver';

test.use({ video: { mode: 'on', size: { width: 1440, height: 900 } } });
const root = 'docs/qa/phase4b';
const snapshot = (page: Page) => page.evaluate(() => window.__VESPER_DEBUG__!.snapshot());
async function enter(page: Page, backend: string, touch = false) {
  await page.goto(`/?backend=${backend}`); await expect(page.locator('#app')).toHaveAttribute('data-state', 'ready');
  if (touch) { await page.locator('#start').tap(); await page.locator('#pickup').tap(); } else { await page.locator('#start').click(); await page.keyboard.press('f'); }
  await expect(page.locator('#app')).toHaveAttribute('data-weapon', 'baton');
}
for (const backend of ['webgpu-required', 'webgl2']) test(`group combat, targeting and victory on ${backend}`, async ({ page }) => {
  test.skip(!test.info().project.name.endsWith('desktop'), 'Desktop fight'); test.setTimeout(120000);
  await mkdir(`${root}/browser`, { recursive: true }); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await enter(page, backend); await page.locator('#encounter-group').click(); await expect(page.locator('#app')).toHaveAttribute('data-encounter-kind', 'group');
  await expect(page.locator('#encounter-progress')).toContainText('3 / 3 remaining');
  await page.keyboard.press('t'); await expect.poll(async()=>(await snapshot(page)).player!.target?.id).toBeTruthy();const first = (await snapshot(page)).player!.target; await page.keyboard.press('t');
  await expect.poll(async()=>(await snapshot(page)).player!.target?.id).not.toBe(first?.id); await page.screenshot({ path: `${root}/browser/${backend}-group.png` });
  const totals: GroupTotals = { encounters: 0, victories: 0, hits: 0, criticals: 0, blocks: 0, strikes: 0, multiTargetAttacks: 0, defeated: 0 };
  let running = true; const driver = exerciseGroup(page, () => running, totals);
  await expect.poll(() => totals.victories, { timeout: 100000, intervals: [100] }).toBeGreaterThan(0); running = false; await driver;
  expect(totals.multiTargetAttacks).toBeGreaterThan(0); expect(totals.blocks).toBeGreaterThan(0); expect(totals.criticals).toBeGreaterThan(0); expect(totals.defeated).toBeGreaterThanOrEqual(3);
  await expect(page.locator('#player-message')).toContainText('GROUP COMPLETE'); await expect(page.locator('#encounter-progress')).toContainText('0 / 3 remaining');
  await page.screenshot({ path: `${root}/browser/${backend}-victory.png` }); const victory = await snapshot(page);
  await page.locator('#encounter-restart').click(); const restart = await snapshot(page);
  expect(restart.enemies).toHaveLength(3); expect(restart.enemies!.every(e => e.health === 120 && e.generation > victory.enemies![0]!.generation)).toBe(true);
  expect(restart.player!.weapon).toBe('baton'); expect(restart.player!.health).toBe(100);
  await page.locator('#encounter-return').click(); await expect(page.locator('#app')).toHaveAttribute('data-encounter', 'training'); expect(errors).toEqual([]);
  await writeFile(`${root}/browser/${backend}-combat.json`, JSON.stringify({ errors, totals, victory, restart }, null, 2));
  const video = page.video(); await page.context().close(); await video?.saveAs(`${root}/${backend}-combat.webm`);
});

test('group loading failure/cancellation, frozen inspection, quality reconstruction and disposal', async ({ page }) => {
  test.skip(!test.info().project.name.endsWith('desktop'), 'Desktop lifecycle'); test.setTimeout(150000);
  const errors: string[] = [], requests: string[] = []; page.on('pageerror', e => errors.push(e.message)); page.on('request', r => requests.push(r.url()));
  await enter(page, 'webgl2'); const baseline = await snapshot(page);
  await page.route('**/encounter/**/zombie7.glb', async route => { await new Promise(r => setTimeout(r,500)); await route.continue().catch(() => {}); });
  await page.locator('#encounter-group').click(); await expect(page.locator('#app')).toHaveAttribute('data-encounter','loading'); await page.locator('#encounter-start').click(); await page.waitForTimeout(900);
  expect((await snapshot(page)).resources).toBe(baseline.resources); expect((await snapshot(page)).enemies).toHaveLength(0);
  await page.unroute('**/encounter/**/zombie7.glb'); await page.route('**/encounter/**/zombie7.glb', route => route.abort());
  await page.locator('#encounter-group').click(); await expect(page.locator('#app')).toHaveAttribute('data-encounter','failed'); expect((await snapshot(page)).encounter).toBe('training');
  await page.unroute('**/encounter/**/zombie7.glb'); await page.locator('#encounter-group').click(); await expect(page.locator('#app')).toHaveAttribute('data-encounter-kind','group');
  await page.locator('#settings-open').click(); const before = await snapshot(page); await page.waitForTimeout(250); expect((await snapshot(page)).enemies).toEqual(before.enemies);
  await page.route('**/encounter/mobile/zombie7.glb',route=>route.abort()); await page.locator('#quality').selectOption('Low'); await expect(page.locator('#art-status')).toContainText('Current view retained');
  expect((await snapshot(page)).enemies).toEqual(before.enemies); expect((await snapshot(page)).resources).toBe(before.resources);
  await page.unroute('**/encounter/mobile/zombie7.glb'); await page.locator('#quality').selectOption('Low'); await expect(page.locator('#quality')).toBeEnabled(); expect((await snapshot(page)).enemies).toEqual(before.enemies);
  await page.locator('#quality').selectOption('High'); await expect(page.locator('#quality')).toBeEnabled(); expect((await snapshot(page)).enemies).toEqual(before.enemies); await page.locator('#resume').click();
  await page.locator('#inspection-toggle').click(); await expect(page.locator('#app')).toHaveAttribute('data-inspection','active'); const frozen = (await snapshot(page)).enemies; await page.waitForTimeout(300); expect((await snapshot(page)).enemies).toEqual(frozen);
  await page.locator('#inspection-toggle').click(); await page.locator('#encounter-return').click(); const cycles=[];
  for(let i=0;i<4;i++){ await page.locator('#encounter-group').click(); await expect(page.locator('#app')).toHaveAttribute('data-encounter-kind','group'); await page.locator('#encounter-return').click(); cycles.push(await snapshot(page)); }
  expect(cycles.every(s=>s.resources===baseline.resources&&s.references===baseline.references)).toBe(true); expect(errors).toEqual([]);
  await writeFile(`${root}/browser/lifecycle.json`, JSON.stringify({ baseline, before, cycles, errors, requests }, null, 2));
});

test('touch group targeting, simultaneous movement, defense and enlarged left-handed layout', async ({ page }) => {
  test.skip(!test.info().project.name.endsWith('mobile'), 'Mobile controls');
  const errors:string[]=[],requests:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
  await mkdir(`${root}/browser`, {recursive:true});await enter(page,'webgl2',true);
  await page.locator('#settings-open').tap();await page.locator('#left-handed').check();await page.locator('#ui-scale').fill('1.4');await page.locator('#resume').tap();await page.locator('#encounter-group').tap();
  await expect(page.locator('#app')).toHaveAttribute('data-encounter-kind','group');await page.locator('#target-cycle').tap();await expect.poll(async()=>(await snapshot(page)).player!.target?.id).toBeTruthy();const first=(await snapshot(page)).player!.target;await page.locator('#target-cycle').tap();await expect.poll(async()=>(await snapshot(page)).player!.target?.id).not.toBe(first?.id);
  await expect.poll(async()=>(await snapshot(page)).enemies!.some(e=>e.action==='windup'),{intervals:[20]}).toBe(true);await page.locator('#ward').tap();await expect.poll(async()=>(await snapshot(page)).player!.blocks,{intervals:[20]}).toBeGreaterThan(0);
  for(const selector of ['#movement-stick','#target-cycle','#heavy','#ward','#encounter-return']){const b=(await page.locator(selector).boundingBox())!;expect(b.x).toBeGreaterThanOrEqual(0);expect(b.y).toBeGreaterThanOrEqual(0);expect(b.x+b.width).toBeLessThanOrEqual(915);expect(b.y+b.height).toBeLessThanOrEqual(412);}
  await page.evaluate(()=>{const stick=document.querySelector<HTMLElement>('#movement-stick')!;stick.setPointerCapture=()=>{};const b=stick.getBoundingClientRect();stick.dispatchEvent(new PointerEvent('pointerdown',{pointerId:407,pointerType:'touch',clientX:b.x+b.width,clientY:b.y+b.height/2,bubbles:true}));});
  await page.locator('#target-cycle').tap();await page.locator('#heavy').tap();await page.evaluate(()=>window.dispatchEvent(new PointerEvent('pointercancel',{pointerId:407,pointerType:'touch'})));await page.waitForTimeout(1100);
  await page.screenshot({path:`${root}/browser/mobile-left.png`});await page.setViewportSize({width:412,height:915});const frozen=await snapshot(page);await page.waitForTimeout(300);expect((await snapshot(page)).enemies).toEqual(frozen.enemies);expect((await snapshot(page)).player).toEqual(frozen.player);
  expect(requests.some(r=>r.includes('/encounter/desktop/')||r.includes('/cinematic/'))).toBe(false);expect(requests.some(r=>r.includes('/encounter/mobile/'))).toBe(true);expect(errors).toEqual([]);
  await writeFile(`${root}/browser/mobile.json`,JSON.stringify({frozen,requests,errors},null,2));
});
