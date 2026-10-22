import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { clickSceneTool } from '../helpers/scene-menu';
import { exerciseEncounter, type ExerciseTotals } from '../helpers/encounter-driver';
import { ZOMBIE7 } from '../../src/enemies/enemy-definition';
import { sampleWeaponContact } from '../../src/player/weapon-contact';
import type { FrameStatistics } from '../../src/performance/metrics';
import { execFileSync } from 'node:child_process';
const baseline = process.env.VESPER_ENEMY_BASELINE === '1';
const root = `docs/qa/enemy-combat-readability/${baseline ? 'before' : 'after'}`;
test.use({ video: { mode: 'on', size: { width: 1440, height: 900 } } });
test('matched real-control defense and combat', async ({ page, browser }, info) => {
  test.skip(info.project.name.endsWith('mobile'), 'Desktop comparison.');
  const backend = info.project.name.endsWith('webgpu') ? 'webgpu-required' : 'webgl2';
  const folder = `${root}/${info.project.name}`; await mkdir(folder, { recursive: true });
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`/?backend=${backend}`); await expect(page.locator('#app')).toHaveAttribute('data-state', 'ready');
  await page.locator('#start').click(); await page.keyboard.press('f');
  await expect(page.locator('#app')).toHaveAttribute('data-weapon', 'baton');
  await clickSceneTool(page, '#encounter-start'); await expect(page.locator('#app')).toHaveAttribute('data-encounter', 'active');
  await page.waitForFunction(() => window.__VESPER_DEBUG__!.snapshot().enemies?.[0]?.action === 'windup');
  await page.keyboard.press('q'); await page.screenshot({ path: `${folder}/windup.png` });
  await expect.poll(() => page.evaluate(() => window.__VESPER_DEBUG__!.snapshot().player!.blocks)).toBeGreaterThan(0);
  await page.screenshot({ path: `${folder}/block.png` });
  await clickSceneTool(page, '#encounter-restart');
  const totals: ExerciseTotals = { encounters: 0, victories: 0, hits: 0, criticals: 0, blocks: 0, strikes: 0, damageTaken: 0 };
  let running = true; const driver = exerciseEncounter(page, () => running, totals);
  await page.waitForTimeout(20000); running = false; await driver;
  await page.screenshot({ path: `${folder}/combat.png` });
  await writeFile(`${folder}/comparison.json`, JSON.stringify({ backend, browser: browser.version(), totals, errors, snapshot: await page.evaluate(() => window.__VESPER_DEBUG__!.snapshot()) }, null, 2));
  expect(errors).toEqual([]); expect(totals.victories).toBeGreaterThan(0);
  const video = page.video(); await page.context().close(); await video?.saveAs(`${folder}/combat.webm`);
});

test('rendered hand contact, defense cues and touch controls',async({page,browser},info)=>{
  test.skip(baseline,'New contact acceptance');
  const mobile=info.project.name.endsWith('mobile'),backend=info.project.name.endsWith('webgpu')?'webgpu-required':'webgl2';
  const folder=`${root}/${info.project.name}`;await mkdir(folder,{recursive:true});
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`/?backend=${backend}`);await expect(page.locator('#app')).toHaveAttribute('data-state','ready');await page.locator('#start').click();
  await page.locator('#mute').click();await page.locator('#settings-open').click();
  if(mobile){await page.locator('#left-handed').check();await page.locator('#ui-scale').fill('1.4');}
  await page.locator('#resume').click();await clickSceneTool(page,'#encounter-start');
  await expect(page.locator('#app')).toHaveAttribute('data-encounter','active');
  const trace:FrameStatistics[]=[];
  for(let strike=0;strike<3;strike++){
    await page.waitForFunction(()=>window.__VESPER_DEBUG__!.snapshot().enemies?.[0]?.action==='windup');
    if(mobile)await page.locator('#ward').tap();else await page.keyboard.press('q');
    const samples=await page.evaluate(async()=>{
      const frames:FrameStatistics[]=[];
      await new Promise<void>(resolve=>{const collect=()=>{const s=window.__VESPER_DEBUG__!.snapshot();frames.push(s);if(s.enemies?.[0]?.action==='recovery')resolve();else requestAnimationFrame(collect);};requestAnimationFrame(collect);});
      return frames;
    });trace.push(...samples);
    await expect(page.locator('.world-label[data-kind="defense"]')).toContainText('Blocked');
    await expect(page.locator('.world-label[data-kind="defense"]')).toBeVisible();
    await page.screenshot({path:`${folder}/defense-${strike}.png`});
  }
  const measurements:number[]=[];
  for(const s of trace)for(const c of s.enemyContact??[]){
    const e=s.enemies!.find(e=>e.id===c.id)!;
    if(e.action!=='active'||c.time<.65||c.time>.77)continue;
    expect(c.time).toBeLessThanOrEqual(e.attackElapsed+1/60+1e-6);
    const expected=sampleWeaponContact(ZOMBIE7.attack.contact!,c.time);
    for(const key of ['base','tip'] as const){const p=expected[key],a=c[key];const x=e.position.x+p.x*Math.cos(e.facing)+p.z*Math.sin(e.facing),z=e.position.z+p.z*Math.cos(e.facing)-p.x*Math.sin(e.facing);measurements.push(Math.hypot(a[0]!-x,a[1]!-e.position.y-p.y,a[2]!-z));}
  }
  expect(measurements.length).toBeGreaterThan(4);expect(Math.max(...measurements)).toBeLessThan(.03);
  await page.locator('#settings-open').click();await page.locator('#reduced-motion').check();
  const frozen=(await page.evaluate(()=>window.__VESPER_DEBUG__!.snapshot())).enemies;await page.waitForTimeout(250);expect((await page.evaluate(()=>window.__VESPER_DEBUG__!.snapshot())).enemies).toEqual(frozen);
  await page.locator('#resume').click();
  await page.waitForFunction(()=>window.__VESPER_DEBUG__!.snapshot().enemies?.[0]?.action==='windup');
  await page.screenshot({path:`${folder}/reduced-muted-warning.png`});
  if(mobile){
    for(const selector of ['#movement-stick','#ward','#dodge']){const box=(await page.locator(selector).boundingBox())!;expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(915);}
    await page.evaluate(()=>{const stick=document.querySelector<HTMLElement>('#movement-stick')!;stick.setPointerCapture=()=>{};const b=stick.getBoundingClientRect();stick.dispatchEvent(new PointerEvent('pointerdown',{pointerId:202,pointerType:'touch',clientX:b.right,clientY:b.y+b.height/2,bubbles:true}));});
    await page.locator('#dodge').tap();await page.evaluate(()=>window.dispatchEvent(new PointerEvent('pointercancel',{pointerId:202,pointerType:'touch'})));
    await page.waitForTimeout(900);
    expect((await page.evaluate(()=>window.__VESPER_DEBUG__!.snapshot())).player!.action).not.toBe('walk');
    await page.setViewportSize({width:412,height:915});const held=await page.evaluate(()=>window.__VESPER_DEBUG__!.snapshot().enemies);await page.waitForTimeout(250);expect(await page.evaluate(()=>window.__VESPER_DEBUG__!.snapshot().enemies)).toEqual(held);
    await page.setViewportSize({width:915,height:412});
  }
  expect(errors).toEqual([]);await writeFile(`${folder}/contact.json`,JSON.stringify({backend,browser:browser.version(),samples:measurements.length,maxError:Math.max(...measurements),errors},null,2));
});

test('neutral authored source and compressed attack pose comparisons',async({page},info)=>{
  test.skip(baseline||!info.project.name.endsWith('webgpu'),'Neutral desktop evidence.');
  test.setTimeout(240000);
  const folder='docs/qa/enemy-combat-readability/poses';await mkdir(folder,{recursive:true});
  const original=execFileSync('git',['show','main:public/assets/encounter/desktop/zombie7.glb'],{maxBuffer:12*1024*1024});
  for(const variant of ['before','source','desktop']){
    if(variant==='before')await page.route('**/assets/encounter/desktop/zombie7.glb',route=>route.fulfill({body:original,contentType:'model/gltf-binary'}));
    await page.goto(`/docs/qa/phase4a/studio.html?backend=webgpu-required&variant=${variant==='before'?'desktop':variant}`);
    await expect(page.locator('#status')).toContainText('neutral source comparison');await page.locator('#clip').selectOption('Attack');
    for(const [label,fraction] of [['preparation',variant==='before'?.3:30/101],['contact',variant==='before'?.435:43/101],['recovery',variant==='before'?.6:66/101]] as const){
      await page.locator('#time').fill(String(Math.round(fraction*100)/100));await page.waitForTimeout(180);
      await page.screenshot({path:`${folder}/${variant}-${label}-front.png`});
      await page.locator('#turn').click({clickCount:2,delay:30});await page.screenshot({path:`${folder}/${variant}-${label}-side.png`});
      await page.locator('#turn').click({clickCount:6,delay:30});
    }
    if(variant==='before')await page.unroute('**/assets/encounter/desktop/zombie7.glb');
  }
});

test('real forward dodge reports evasion only at contact',async({page},info)=>{
  test.skip(baseline||info.project.name.endsWith('mobile'),'Desktop contact-timed input.');
  const backend=info.project.name.endsWith('webgpu')?'webgpu-required':'webgl2';
  await page.goto(`/?backend=${backend}`);await expect(page.locator('#app')).toHaveAttribute('data-state','ready');await page.locator('#start').click();
  await clickSceneTool(page,'#encounter-start');await expect(page.locator('#app')).toHaveAttribute('data-encounter','active');
  await page.waitForFunction(()=>{const e=window.__VESPER_DEBUG__!.snapshot().enemies?.[0];return e?.action==='windup'&&e.attackElapsed>=.55;});
  await page.keyboard.down('d');await page.keyboard.down('s');await page.keyboard.press('Space');
  await page.waitForFunction(()=>window.__VESPER_DEBUG__!.snapshot().player?.action==='dodge');
  await page.keyboard.up('d');await page.keyboard.up('s');
  await expect(page.locator('.world-label[data-kind="defense"]')).toHaveText('Evaded',{timeout:1500});
  expect((await page.evaluate(()=>window.__VESPER_DEBUG__!.snapshot())).player!.health).toBe(100);
  await page.screenshot({path:`${root}/${info.project.name}/evaded.png`});
});
