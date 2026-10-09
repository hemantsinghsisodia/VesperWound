import {test,expect} from '@playwright/test';
import {exerciseEncounter,type ExerciseTotals} from '../helpers/encounter-driver';
import paths from '../../src/player/baton-contact.json' with { type:'json' };
import {mkdir,writeFile} from 'node:fs/promises';
test.use({video:{mode:'on',size:{width:1440,height:900}}});
for(const backend of ['webgpu-required','webgl2'])test(`baton pickup, armed previews and lifecycle ${backend}`,async({page})=>{
  test.skip(!test.info().project.name.endsWith('desktop'),'Desktop armed capture');
  const errors:string[]=[],requests:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
  await mkdir('docs/qa/baton/browser',{recursive:true});await page.goto(`/?backend=${backend}`);await expect(page.locator('#app')).toHaveAttribute('data-state','ready');await page.locator('#start').click();
  await expect(page.locator('#pickup-status')).toContainText('Pick up steel baton');expect(requests.some(r=>r.includes('/weapons/baton/animations.glb'))).toBe(false);
  await page.screenshot({path:`docs/qa/baton/browser/${backend}-pickup.png`});await page.keyboard.press('f');await expect(page.locator('#app')).toHaveAttribute('data-weapon','baton');
  await page.locator('#inspection-toggle').click();await expect(page.locator('#app')).toHaveAttribute('data-inspection','active');
  await page.screenshot({path:`docs/qa/baton/browser/${backend}-idle.png`});await page.locator('#inspection-view').selectOption('equipment');await page.screenshot({path:`docs/qa/baton/browser/${backend}-grip.png`});
  await page.locator('#inspection-view').selectOption('full-body');
  for(const name of ['Light1','Light2','Light3','Heavy','Walk','Run','Dodge','Ward','Hit','Death']){await page.locator('#animation').selectOption(`clip:Baton_${name}`);await page.waitForTimeout(name==='Heavy'?500:250);await page.screenshot({path:`docs/qa/baton/browser/${backend}-${name}.png`});}
  await page.locator('#inspection-toggle').click();await page.locator('#encounter-start').click();await expect(page.locator('#app')).toHaveAttribute('data-encounter','active');
  await page.locator('#encounter-restart').click();await expect(page.locator('#app')).toHaveAttribute('data-weapon','baton');await page.locator('#encounter-return').click();
  await page.locator('#settings-open').click();await page.locator('#quality').selectOption('Low');await expect(page.locator('#quality')).toBeEnabled();await page.locator('#resume').click();await expect(page.locator('#app')).toHaveAttribute('data-weapon','baton');
  expect(errors).toEqual([]);await writeFile(`docs/qa/baton/browser/${backend}.json`,JSON.stringify({errors,requests,snapshot:await page.evaluate(()=>window.__VESPER_DEBUG__!.snapshot())},null,2));
});

test('armed combat demonstration and exported contact alignment',async({page})=>{
  test.skip(!test.info().project.name.endsWith('desktop'),'Real keyboard demonstration');
  await page.goto('/?backend=webgpu-required');await expect(page.locator('#app')).toHaveAttribute('data-state','ready');await page.locator('#start').click();await page.keyboard.press('f');await expect(page.locator('#app')).toHaveAttribute('data-weapon','baton');
  await page.locator('#encounter-start').click();await expect(page.locator('#app')).toHaveAttribute('data-encounter','active');
  const totals:ExerciseTotals={encounters:0,victories:0,hits:0,criticals:0,blocks:0,strikes:0};let running=true;const driver=exerciseEncounter(page,()=>running,totals);
  const contacts:{time:number;error:number}[]=[];
  for(let i=0;i<100&&totals.victories<1;i++){
    const s=await page.evaluate(()=>window.__VESPER_DEBUG__!.snapshot());
    if(s.player?.attack==='baton-heavy'&&s.player.actionTime>.44&&s.player.actionTime<.58&&s.weaponContact){
      const p=s.player,row=paths.Baton_Heavy[Math.min(paths.Baton_Heavy.length-1,Math.round((p.actionTime+1/60)*60))]!;
      const expected=[p.position.x+row.tip[0]!*Math.cos(p.facing)+row.tip[2]!*Math.sin(p.facing),p.position.y+row.tip[1]!,p.position.z+row.tip[2]!*Math.cos(p.facing)-row.tip[0]!*Math.sin(p.facing)];
      contacts.push({time:p.actionTime,error:Math.hypot(...s.weaponContact.tip.map((v,k)=>v-expected[k]!))});
    }
    await page.waitForTimeout(70);
  }
  await expect.poll(()=>totals.victories,{timeout:60000}).toBeGreaterThan(0);running=false;await driver;
  expect(totals.criticals).toBeGreaterThan(0);expect(totals.blocks).toBeGreaterThan(0);expect(contacts.length).toBeGreaterThan(0);expect(Math.max(...contacts.map(c=>c.error))).toBeLessThan(.03);
  await page.screenshot({path:'docs/qa/baton/browser/victory.png'});await writeFile('docs/qa/baton/browser/combat.json',JSON.stringify({totals,contacts,snapshot:await page.evaluate(()=>window.__VESPER_DEBUG__!.snapshot())},null,2));
  const video=page.video();await page.context().close();await video?.saveAs('docs/qa/baton/pickup-combat.webm');
});
test('pickup failure, late cancellation, retry and resource ownership',async({page})=>{
  test.skip(!test.info().project.name.endsWith('desktop'),'Desktop loading');await page.goto('/?backend=webgl2');await expect(page.locator('#app')).toHaveAttribute('data-state','ready');await page.locator('#start').click();
  const baseline=await page.evaluate(()=>window.__VESPER_DEBUG__!.snapshot());
  await page.route('**/weapons/baton/animations.glb',route=>route.abort());await page.keyboard.press('f');await expect(page.locator('#app')).toHaveAttribute('data-pickup','failed');await page.unroute('**/weapons/baton/animations.glb');
  await page.route('**/weapons/baton/animations.glb',async route=>{await new Promise(r=>setTimeout(r,700));await route.continue().catch(()=>{});});await page.keyboard.press('f');await expect(page.locator('#app')).toHaveAttribute('data-pickup','loading');
  await page.keyboard.down('w');await page.waitForTimeout(650);await page.keyboard.up('w');await page.waitForTimeout(700);await expect(page.locator('#app')).toHaveAttribute('data-weapon','unarmed');
  expect((await page.evaluate(()=>window.__VESPER_DEBUG__!.snapshot())).resources).toBe(baseline.resources);await page.unroute('**/weapons/baton/animations.glb');
  await page.locator('#encounter-start').click();await expect(page.locator('#app')).toHaveAttribute('data-encounter','active');await page.locator('#encounter-return').click();await page.keyboard.press('f');await expect(page.locator('#app')).toHaveAttribute('data-weapon','baton');
  const equipped=await page.evaluate(()=>window.__VESPER_DEBUG__!.snapshot()),cycles=[];
  for(let i=0;i<3;i++){await page.locator('#inspection-toggle').click();await expect(page.locator('#app')).toHaveAttribute('data-inspection','active');await page.locator('#inspection-toggle').click();await page.evaluate(()=>window.__VESPER_DEBUG__!.reloadFixture());cycles.push(await page.evaluate(()=>window.__VESPER_DEBUG__!.snapshot()));}
  expect(cycles.every(c=>c.resources===equipped.resources&&c.references===equipped.references)).toBe(true);await writeFile('docs/qa/baton/browser/lifecycle.json',JSON.stringify({baseline,equipped,cycles},null,2));
  await page.reload();await expect(page.locator('#app')).toHaveAttribute('data-state','ready');await page.locator('#start').click();await expect(page.locator('#app')).toHaveAttribute('data-weapon','unarmed');
});
test('touch pickup, simultaneous movement, enlarged left-handed layout and cancellation',async({page})=>{
  test.skip(!test.info().project.name.endsWith('mobile'),'Mobile touch');const requests:string[]=[];page.on('request',r=>requests.push(r.url()));
  await page.goto('/?backend=webgl2');await expect(page.locator('#app')).toHaveAttribute('data-state','ready');await page.locator('#start').tap();await page.locator('#settings-open').tap();await page.locator('#left-handed').check();await page.locator('#ui-scale').fill('1.4');await page.locator('#resume').tap();
  const b=(await page.locator('#pickup').boundingBox())!;expect(b.x).toBeGreaterThanOrEqual(0);expect(b.y).toBeGreaterThanOrEqual(0);expect(b.x+b.width).toBeLessThanOrEqual(915);expect(b.y+b.height).toBeLessThanOrEqual(412);
  await page.locator('#pickup').tap();await expect(page.locator('#app')).toHaveAttribute('data-weapon','baton');await page.screenshot({path:'docs/qa/baton/browser/mobile-left.png'});
  await page.evaluate(()=>{const stick=document.querySelector<HTMLElement>('#movement-stick')!;stick.setPointerCapture=()=>{};const b=stick.getBoundingClientRect();stick.dispatchEvent(new PointerEvent('pointerdown',{pointerId:208,pointerType:'touch',clientX:b.x+b.width,clientY:b.y+b.height/2,bubbles:true}));});await page.locator('#pulse').tap();await page.waitForTimeout(100);await page.evaluate(()=>window.dispatchEvent(new PointerEvent('pointercancel',{pointerId:208,pointerType:'touch'})));await page.waitForTimeout(900);
  await expect(page.locator('#world')).toHaveAttribute('data-player-action','idle');expect(requests.some(r=>r.includes('/showcase/desktop/')||r.includes('/cinematic/'))).toBe(false);
  await page.setViewportSize({width:412,height:915});const frozen=await page.evaluate(()=>window.__VESPER_DEBUG__!.snapshot().player);await page.waitForTimeout(300);expect((await page.evaluate(()=>window.__VESPER_DEBUG__!.snapshot())).player).toEqual(frozen);
  await writeFile('docs/qa/baton/browser/mobile.json',JSON.stringify({requests,frozen},null,2));
});
