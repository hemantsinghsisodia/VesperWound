import { expect,test,type Page } from '@playwright/test';
import { mkdir,writeFile } from 'node:fs/promises';
import { exerciseEncounter, type ExerciseTotals } from '../helpers/encounter-driver';
test.use({video:{mode:'on',size:{width:1440,height:900}}});
const snapshot=(page:Page)=>page.evaluate(()=>window.__VESPER_DEBUG__!.snapshot());
async function enter(page:Page,backend:string){await page.goto(`/?backend=${backend}`);await expect(page.locator('#app')).toHaveAttribute('data-state','ready');await page.locator('#start').click();await page.locator('#encounter-start').click();await expect(page.locator('#app')).toHaveAttribute('data-encounter','active');}
for(const backend of ['webgpu-required','webgl2'])test(`enemy pursuit, Ward and lifecycle on ${backend}`,async({page})=>{
  test.skip(!test.info().project.name.endsWith('desktop'),'Desktop capture');const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await mkdir('docs/qa/phase4a/browser',{recursive:true});await enter(page,backend);
  await expect.poll(async()=>(await snapshot(page)).enemies![0]!.action,{intervals:[20]}).toBe('windup');
  await page.keyboard.press('q');await page.screenshot({path:`docs/qa/phase4a/browser/${backend}-windup.png`});
  await expect.poll(async()=>(await snapshot(page)).player!.blocks,{intervals:[20]}).toBe(1);
  await page.screenshot({path:`docs/qa/phase4a/browser/${backend}-ward.png`});
  await page.locator('#settings-open').click();const frozen=(await snapshot(page)).enemies;await page.waitForTimeout(300);expect((await snapshot(page)).enemies).toEqual(frozen);
  await page.locator('#quality').selectOption('Low');await expect(page.locator('#quality')).toBeEnabled();await page.locator('#resume').click();await expect(page.locator('#app')).toHaveAttribute('data-state','running');
  expect((await snapshot(page)).enemies![0]!.health).toBe(frozen![0]!.health);
  await page.locator('#encounter-return').click();await expect(page.locator('#app')).toHaveAttribute('data-encounter','training');
  const baseline=await snapshot(page),cycles=[];
  for(let i=0;i<4;i++){await page.locator('#encounter-start').click();await expect(page.locator('#app')).toHaveAttribute('data-encounter','active');await page.locator('#encounter-return').click();await page.waitForTimeout(150);cycles.push(await snapshot(page));}
  expect(cycles.every(s=>s.resources===baseline.resources&&s.references===baseline.references)).toBe(true);expect(errors).toEqual([]);
  await writeFile(`docs/qa/phase4a/browser/${backend}-lifecycle.json`,JSON.stringify({baseline,cycles,errors},null,2));
});
test('encounter loading cancellation, failure, retry, inspection and pooled restart',async({page})=>{
  test.skip(!test.info().project.name.endsWith('desktop'),'Desktop lifecycle');
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/?backend=webgl2');await expect(page.locator('#app')).toHaveAttribute('data-state','ready');await page.locator('#start').click();
  const baseline=await snapshot(page);
  await page.route('**/encounter/**/zombie7.glb',async route=>{await new Promise(r=>setTimeout(r,350));await route.continue().catch(()=>{});});
  await page.locator('#encounter-start').click();await expect(page.locator('#app')).toHaveAttribute('data-encounter','loading');await page.locator('#encounter-start').click();await page.waitForTimeout(800);
  expect((await snapshot(page)).encounter).toBe('training');expect((await snapshot(page)).resources).toBe(baseline.resources);expect((await snapshot(page)).references).toBe(baseline.references);
  await page.unroute('**/encounter/**/zombie7.glb');await page.route('**/encounter/**/zombie7.glb',route=>route.abort());
  await page.locator('#encounter-start').click();await expect(page.locator('#app')).toHaveAttribute('data-encounter','failed');expect((await snapshot(page)).encounter).toBe('training');
  await page.unroute('**/encounter/**/zombie7.glb');await page.locator('#encounter-start').click();await expect(page.locator('#app')).toHaveAttribute('data-encounter','active');
  await page.locator('#inspection-toggle').click();await expect(page.locator('#app')).toHaveAttribute('data-inspection','active');const frozen=(await snapshot(page)).enemies;await page.waitForTimeout(300);expect((await snapshot(page)).enemies).toEqual(frozen);
  await page.locator('#inspection-toggle').click();await expect(page.locator('#app')).toHaveAttribute('data-inspection','courtyard');
  await page.locator('#settings-open').click();const unchanged=await snapshot(page);
  await page.route('**/encounter/mobile/zombie7.glb',route=>route.abort());await page.locator('#quality').selectOption('Mobile');
  await expect(page.locator('#art-status')).toContainText('Current view retained');await expect(page.locator('#quality')).toHaveValue('High');
  expect((await snapshot(page)).enemies).toEqual(unchanged.enemies);expect((await snapshot(page)).resources).toBe(unchanged.resources);
  await page.unroute('**/encounter/mobile/zombie7.glb');await page.locator('#resume').click();
  await page.evaluate(()=>window.__VESPER_DEBUG__!.encounter(3));const generation=(await snapshot(page)).enemies![0]!.generation;
  await page.waitForTimeout(3000);const pooled=(await snapshot(page)).enemies!;expect(pooled).toHaveLength(3);expect(pooled.filter(e=>e.action==='windup'||e.action==='active').length).toBeLessThanOrEqual(1);
  for(let i=0;i<pooled.length;i++)for(let j=i+1;j<pooled.length;j++)expect(Math.hypot(pooled[i]!.position.x-pooled[j]!.position.x,pooled[i]!.position.z-pooled[j]!.position.z)).toBeGreaterThanOrEqual(.59);
  await page.locator('#encounter-restart').click();expect((await snapshot(page)).enemies![0]!.generation).toBeGreaterThan(generation);expect((await snapshot(page)).player!.health).toBe(100);
  await page.locator('#encounter-return').click();expect((await snapshot(page)).resources).toBe(baseline.resources);expect(errors).toEqual([]);
  await writeFile('docs/qa/phase4a/browser/loading-pooling.json',JSON.stringify({baseline,final:await snapshot(page),errors},null,2));
});
test('enemy combat demonstration reaches stagger, critical and victory through real controls',async({page})=>{
  test.skip(!test.info().project.name.endsWith('desktop'),'Keyboard demonstration');
  await enter(page,'webgpu-required');
  const totals:ExerciseTotals={encounters:0,victories:0,hits:0,criticals:0,blocks:0,strikes:0};let running=true;
  const driver=exerciseEncounter(page,()=>running,totals);
  await expect.poll(async()=>(await snapshot(page)).enemies![0]!.action,{timeout:60000,intervals:[20]}).toBe('stagger');
  await page.screenshot({path:'docs/qa/phase4a/browser/stagger.png'});
  await expect.poll(()=>totals.victories,{timeout:60000,intervals:[100]}).toBeGreaterThan(0);running=false;await driver;
  expect(totals.criticals).toBeGreaterThan(0);expect(totals.blocks).toBeGreaterThan(0);
  await writeFile('docs/qa/phase4a/browser/combat-demonstration.json',JSON.stringify({totals,snapshot:await snapshot(page)},null,2));
  await page.screenshot({path:'docs/qa/phase4a/browser/critical-victory.png'});await page.waitForTimeout(3000);await page.screenshot({path:'docs/qa/phase4a/browser/death.png'});
  const video=page.video();await page.context().close();await video?.saveAs('docs/qa/phase4a/combat-demonstration.webm');
});
test('mobile enemy tier, enlarged left-handed controls and pointer cancellation',async({page})=>{
  test.skip(!test.info().project.name.endsWith('mobile'),'Touch landscape');const requests:string[]=[];page.on('request',r=>requests.push(r.url()));
  await page.goto('/?backend=webgl2');await expect(page.locator('#app')).toHaveAttribute('data-state','ready');await page.locator('#start').tap();
  expect(requests.some(r=>r.includes('/encounter/'))).toBe(false);
  await page.locator('#settings-open').tap();await page.locator('#left-handed').check();await page.locator('#ui-scale').fill('1.4');await page.locator('#resume').tap();
  await page.locator('#encounter-start').tap();await expect(page.locator('#app')).toHaveAttribute('data-encounter','active');
  await expect.poll(async()=>(await snapshot(page)).enemies![0]!.action,{intervals:[20]}).toBe('windup');await page.locator('#ward').tap();await expect.poll(async()=>(await snapshot(page)).player!.blocks,{intervals:[20]}).toBe(1);
  for(const selector of ['#movement-stick','#heavy','#ward','#dodge','#encounter-return']){const b=(await page.locator(selector).boundingBox())!;expect(b.x).toBeGreaterThanOrEqual(0);expect(b.y).toBeGreaterThanOrEqual(0);expect(b.x+b.width).toBeLessThanOrEqual(915);expect(b.y+b.height).toBeLessThanOrEqual(412);}
  await page.evaluate(()=>{const stick=document.querySelector<HTMLElement>('#movement-stick')!;stick.setPointerCapture=()=>{};const b=stick.getBoundingClientRect();stick.dispatchEvent(new PointerEvent('pointerdown',{pointerId:202,pointerType:'touch',clientX:b.x+b.width,clientY:b.y+b.height/2,bubbles:true}));});
  await page.waitForTimeout(100);await page.evaluate(()=>window.dispatchEvent(new PointerEvent('pointercancel',{pointerId:202,pointerType:'touch'})));await page.waitForTimeout(850);
  await page.screenshot({path:'docs/qa/phase4a/browser/mobile-left.png'});
  await page.setViewportSize({width:412,height:915});const frozen=(await snapshot(page)).enemies;await page.waitForTimeout(300);expect((await snapshot(page)).enemies).toEqual(frozen);await page.setViewportSize({width:915,height:412});
  expect(requests.some(r=>r.includes('/encounter/desktop/')||r.includes('/cinematic/'))).toBe(false);expect(requests.some(r=>r.includes('/encounter/mobile/'))).toBe(true);
  await page.locator('#encounter-return').tap();await writeFile('docs/qa/phase4a/browser/mobile.json',JSON.stringify({snapshot:await snapshot(page),requests},null,2));
});
