import {test,expect,type Page} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {walkTo} from '../helpers/district-driver';
import {freshProgress,type ChapterProgress} from '../../src/chapter/progress';
import {ENCOUNTERS} from '../../src/chapter/definition';
import {winMissionFight} from '../helpers/mission-driver';
import {clickSceneTool} from '../helpers/scene-menu';
const qa='docs/qa/chapter-district';
async function seed(page:Page,progress:ChapterProgress){await page.evaluate(async progress=>{await new Promise<void>((resolve,reject)=>{const r=indexedDB.open('vesperwound-chapter',1);r.onupgradeneeded=()=>r.result.createObjectStore('progress');r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,tx=db.transaction('progress','readwrite');tx.objectStore('progress').put(progress,'current');tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};});},progress);}
async function boot(page:Page,webgl=false){await page.goto(webgl?'/?backend=webgl2':'/');await expect(page.locator('#app')).toHaveAttribute('data-state','ready');await page.locator('#start').click();}
async function startNew(page:Page){await page.locator('#chapter-new').click();await page.locator('#chapter-confirm-new').click();await expect(page.locator('#app')).toHaveAttribute('data-chapter','court');await expect(page.locator('#app')).toHaveAttribute('data-chapter-loading','false');}
async function interact(page:Page){if(await page.locator('#pickup').isVisible())await page.locator('#pickup').tap();else await page.keyboard.press('f');await page.waitForTimeout(120);}
test('chapter navigation, streamed sectors, machinery, save and checkpoint restore',async({page},info)=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));const requests:string[]=[];page.on('request',r=>{if(r.url().includes('/assets/chapter/'))requests.push(r.url());});
  await mkdir(qa,{recursive:true});await boot(page,info.project.name.includes('webgl2'));
  // Clear encounters only in a persisted navigation fixture; combat remains unchanged.
  const progress=freshProgress();progress.baton=true;progress.cleared=ENCOUNTERS.map(e=>e.id);await seed(page,progress);await page.reload();await expect(page.locator('#app')).toHaveAttribute('data-state','ready');await page.locator('#start').click();
  await expect(page.locator('#chapter-continue')).toBeVisible();await page.locator('#chapter-continue').click();await expect(page.locator('#app')).toHaveAttribute('data-chapter','court');
  const mobile=info.project.name.includes('mobile');
  if(mobile){await page.locator('#settings-open').click();await page.locator('#left-handed').check();await page.locator('#ui-scale').fill('1.4');await page.locator('#ui-scale').dispatchEvent('input');await page.locator('#resume').click();}
  for(const [x,z] of [[0,5],[0,11],[0,14],[12,14],[25,15],[28,19],[28,23],[31,26],[37,29]])await walkTo(page,{x:x!,z:z!},mobile);
  await page.screenshot({path:`${qa}/${info.project.name}-warehouse.png`});await interact(page);await interact(page);await page.waitForTimeout(3500);
  for(const [x,z] of [[38,29],[43,32],[42,35],[40,35]])await walkTo(page,{x:x!,z:z!},mobile);await interact(page);
  await expect.poll(async()=>JSON.parse((await page.locator('#app').getAttribute('data-chapter-progress'))!).regulator).toBe(true);
  for(const [x,z] of [[38,37],[30,39],[23,38]])await walkTo(page,{x:x!,z:z!},mobile);await interact(page);
  await expect(page.locator('#chapter-checkpoint')).toContainText('Warehouse office');
  for(const [x,z] of [[23,34],[23,23],[22,21]])await walkTo(page,{x:x!,z:z!},mobile);await interact(page);
  for(const [x,z] of [[23,24],[31,24],[38,27],[45,29],[46,31],[50,31],[52,33],[60,33],[60,36]])await walkTo(page,{x:x!,z:z!},mobile);await interact(page);await walkTo(page,{x:64,z:36},mobile);await interact(page);
  await page.screenshot({path:`${qa}/${info.project.name}-pump.png`});
  for(const [x,z] of [[61,39],[58,44],[51,48]])await walkTo(page,{x:x!,z:z!},mobile);await interact(page);await walkTo(page,{x:49,z:47},mobile);await interact(page);
  for(const [x,z] of [[46,47],[43,49],[37,48]])await walkTo(page,{x:x!,z:z!},mobile);await interact(page);await walkTo(page,{x:41,z:51},mobile);await interact(page);
  await expect(page.locator('#app')).toHaveAttribute('data-chapter','complete');await page.screenshot({path:`${qa}/${info.project.name}-complete.png`});
  await page.locator('#chapter-map-open').click();await page.screenshot({path:`${qa}/${info.project.name}-map.png`});await page.locator('#chapter-restart').click();await expect(page.locator('canvas')).toHaveAttribute('data-player-position',/^51\./);
  await expect(page.locator('#chapter-save-status')).toContainText('saved');await page.reload();await expect(page.locator('#app')).toHaveAttribute('data-state','ready');await page.locator('#start').click();await page.locator('#chapter-continue').click();await expect(page.locator('#app')).toHaveAttribute('data-chapter','complete');
  expect(errors).toEqual([]);expect(requests.some(r=>r.includes(mobile?'/desktop/':'/mobile/'))).toBe(false);expect(Number(await page.locator('#app').getAttribute('data-chapter-sectors'))).toBeLessThanOrEqual(2);
  await writeFile(`${qa}/${info.project.name}.json`,JSON.stringify({errors,requests,progress:JSON.parse((await page.locator('#app').getAttribute('data-chapter-progress'))!)},null,2));
  await page.context().close();await page.video()?.saveAs(`${qa}/${info.project.name}.webm`);
});
test('new chapter, failure, cancellation and backup recovery retain practice',async({page},info)=>{
  test.skip(info.project.name!=='chapter-webgpu');await boot(page);
  await page.route('**/assets/chapter/desktop/court.json',r=>r.abort());await page.locator('#chapter-new').click();await page.locator('#chapter-confirm-new').click();await expect(page.locator('#chapter-launch-status')).toContainText('could not be loaded');await expect(page.locator('#app')).toHaveAttribute('data-chapter','inactive');await page.unroute('**/assets/chapter/desktop/court.json');
  await startNew(page);await expect(page.locator('#chapter-save-status')).toContainText('saved');await page.locator('#chapter-map-open').click();await page.locator('#chapter-leave').click();
  await page.evaluate(async()=>{await new Promise<void>(resolve=>{const r=indexedDB.open('vesperwound-chapter',1);r.onsuccess=()=>{const db=r.result,tx=db.transaction('progress','readwrite'),store=tx.objectStore('progress'),read=store.get('current');read.onsuccess=()=>{store.put(read.result,'backup');store.put({broken:true},'current');};tx.oncomplete=()=>{db.close();resolve();};};});});
  await page.reload();await expect(page.locator('#app')).toHaveAttribute('data-state','ready');await page.locator('#start').click();await expect(page.locator('#chapter-launch-status')).toContainText('Recovered');await page.locator('#chapter-continue').click();await expect(page.locator('#app')).toHaveAttribute('data-chapter','court');
});
test('real intake combat, save retention, inspection and quality replacement',async({page},info)=>{
  test.skip(info.project.name!=='chapter-webgpu');const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await boot(page);await startNew(page);
  await walkTo(page,{x:-1.6,z:4.5});await page.keyboard.press('f');await expect(page.locator('#app')).toHaveAttribute('data-weapon','baton');
  await expect.poll(async()=>JSON.parse((await page.locator('canvas').getAttribute('data-enemy-roster'))!).length).toBe(1);await winMissionFight(page);
  await expect.poll(async()=>JSON.parse((await page.locator('#app').getAttribute('data-chapter-progress'))!).cleared).toContain('intake');
  const before=JSON.parse((await page.locator('#app').getAttribute('data-chapter-progress'))!) as ChapterProgress;
  for(const quality of ['Low','High']){await page.locator('#settings-open').click();await page.locator('#quality').selectOption(quality);await expect(page.locator('canvas')).toHaveAttribute('data-player-position',/./);await page.locator('#resume').click();await expect(page.locator('#quality')).toBeEnabled();await expect(page.locator('#app')).toHaveAttribute('data-weapon','baton');}
  await clickSceneTool(page,'#inspection-toggle');await expect(page.locator('#app')).toHaveAttribute('data-inspection','active');await page.waitForTimeout(300);await page.locator('#inspection-toggle').click();await expect(page.locator('#app')).toHaveAttribute('data-inspection','courtyard');
  const after=JSON.parse((await page.locator('#app').getAttribute('data-chapter-progress'))!) as ChapterProgress;expect(after.cleared).toEqual(before.cleared);expect(after.baton).toBe(true);
  await page.screenshot({path:`${qa}/combat-intake.png`});expect(errors).toEqual([]);
});
test('cancelled chapter readiness disposes late results and failed adjacent sectors block traversal',async({page},info)=>{
  test.skip(info.project.name!=='chapter-webgpu');await boot(page);
  let release!:()=>void;const wait=new Promise<void>(resolve=>{release=resolve;});
  await page.route('**/assets/chapter/desktop/court.json',async r=>{await wait;await r.continue().catch(()=>{});});
  await page.locator('#chapter-new').click();await page.locator('#chapter-confirm-new').click();await expect(page.locator('#chapter-cancel')).toBeVisible();await page.locator('#chapter-cancel').click();release();await page.unroute('**/assets/chapter/desktop/court.json');await page.waitForTimeout(300);await expect(page.locator('#app')).toHaveAttribute('data-chapter','inactive');
  await page.route('**/assets/chapter/desktop/street.json',r=>r.abort());const p=freshProgress();p.cleared=ENCOUNTERS.map(e=>e.id);await seed(page,p);await page.reload();await expect(page.locator('#app')).toHaveAttribute('data-state','ready');await page.locator('#start').click();await page.locator('#chapter-continue').click();await expect(page.locator('#app')).toHaveAttribute('data-chapter','court');
  await walkTo(page,{x:0,z:5});await expect(page.locator('#chapter-retry')).toBeVisible();
  await page.keyboard.down('s');await page.keyboard.down('a');await page.waitForTimeout(1800);await page.keyboard.up('s');await page.keyboard.up('a');expect(Number((await page.locator('canvas').getAttribute('data-player-position'))!.split(',')[2])).toBeLessThan(8);
  await page.unroute('**/assets/chapter/desktop/street.json');await page.locator('#chapter-retry').click();await walkTo(page,{x:0,z:11});await expect(page.locator('#app')).toHaveAttribute('data-chapter','street');
});




test('chapter pauses, repeated ownership, aborted writes and unavailable storage',async({page},info)=>{
  test.skip(info.project.name!=='chapter-webgpu');await boot(page);const p=freshProgress();p.baton=true;p.cleared=ENCOUNTERS.map(e=>e.id);await seed(page,p);await page.reload();await expect(page.locator('#app')).toHaveAttribute('data-state','ready');await page.locator('#start').click();
  const samples=[];
  for(let i=0;i<4;i++){
    await page.locator('#chapter-continue').click();await expect(page.locator('#app')).toHaveAttribute('data-chapter','court');await page.locator('#chapter-map-open').click();
    const before=await page.locator('#app').getAttribute('data-chapter-progress');await page.waitForTimeout(250);expect(await page.locator('#app').getAttribute('data-chapter-progress')).toBe(before);
    await page.locator('#chapter-leave').click();await expect(page.locator('#app')).toHaveAttribute('data-chapter','inactive');await page.waitForTimeout(300);
    samples.push(await page.evaluate(()=>({labels:document.querySelectorAll('.world-label').length,textures:Number(document.querySelector('canvas')!.dataset.rendererTextures),bytes:Number(document.querySelector('canvas')!.dataset.rendererBytes)})));
  }
  for(const s of samples.slice(1)){expect(s.labels).toBe(samples[0]!.labels);expect(s.textures).toBeLessThanOrEqual(samples[0]!.textures+2);expect(s.bytes).toBeLessThanOrEqual(samples[0]!.bytes+1024*1024);}
  await page.evaluate(async()=>{await new Promise<void>(resolve=>{const r=indexedDB.open('vesperwound-chapter',1);r.onsuccess=()=>{const db=r.result,tx=db.transaction('progress','readwrite');tx.objectStore('progress').put({broken:true},'current');tx.onabort=()=>{db.close();resolve();};tx.abort();};});});
  await page.reload();await expect(page.locator('#app')).toHaveAttribute('data-state','ready');await page.locator('#start').click();await page.locator('#chapter-continue').click();await expect(page.locator('#app')).toHaveAttribute('data-weapon','baton');
  await writeFile(`${qa}/lifecycle.json`,JSON.stringify({samples,abortedWriteRetained:true},null,2));
  await page.addInitScript(()=>{IDBFactory.prototype.open=()=>{throw new DOMException('Storage denied','SecurityError');};});await page.reload();await expect(page.locator('#app')).toHaveAttribute('data-state','ready');await page.locator('#start').click();await startNew(page);await expect(page.locator('#chapter-save-status')).toContainText('could not be saved');await walkTo(page,{x:-1.6,z:4.5});
});

test('complete chapter route with real combat and no progression fixture',async({page},info)=>{
  test.skip(info.project.name!=='chapter-webgpu');await boot(page);await startNew(page);await walkTo(page,{x:-1.6,z:4.5});await interact(page);await expect(page.locator('#app')).toHaveAttribute('data-weapon','baton');
  const route=async(points:number[][])=>{for(const [x,z] of points)await walkTo(page,{x:x!,z:z!});};
  const fight=async(id:string)=>{await expect.poll(async()=>JSON.parse((await page.locator('canvas').getAttribute('data-enemy-roster'))!).some((e:{health:number})=>e.health>0)).toBe(true);await winMissionFight(page);await expect.poll(async()=>JSON.parse((await page.locator('#app').getAttribute('data-chapter-progress'))!).cleared).toContain(id);};
  await fight('intake');await route([[0,5],[0,14],[9,14]]);await fight('workers');await route([[20,14],[25,15],[28,19],[28,23]]);await fight('sentry-site');
  await route([[31,26],[31,32],[31,36]]);await fight('freight');await route([[30,39],[23,38]]);await interact(page);
  await route([[30,39],[38,37],[38,29],[37,29]]);await interact(page);await interact(page);await page.waitForTimeout(3500);await route([[38,29],[43,32],[42,35],[40,35]]);await interact(page);
  await route([[43,35],[45,29],[46,31],[50,31]]);await fight('pump-workers');await route([[52,33],[60,33],[60,36]]);await interact(page);await route([[64,36]]);await interact(page);await route([[62,40]]);await fight('pump-mixed');
  await route([[58,44],[51,48]]);await interact(page);await route([[49,47]]);await interact(page);await route([[46,47],[43,49],[37,48]]);await interact(page);await route([[34,48]]);await fight('guardian-site');await route([[37,49],[41,51]]);await interact(page);
  await expect(page.locator('#app')).toHaveAttribute('data-chapter','complete');await page.screenshot({path:`${qa}/real-route-complete.png`});await writeFile(`${qa}/real-route.json`,JSON.stringify({progress:JSON.parse((await page.locator('#app').getAttribute('data-chapter-progress'))!),health:await page.locator('#health').getAttribute('value'),method:'Actual keyboard/mouse combat and interactions; no progression fixture or state mutation.'},null,2));await page.context().close();await page.video()?.saveAs(`${qa}/real-route.webm`);
});

test('fresh chapter inspection does not equip a cached baton',async({page},info)=>{
  test.skip(info.project.name!=='chapter-webgpu');await boot(page);await page.keyboard.press('f');await expect(page.locator('#app')).toHaveAttribute('data-weapon','baton');await startNew(page);await expect(page.locator('#app')).toHaveAttribute('data-weapon','unarmed');
  await clickSceneTool(page,'#inspection-toggle');await expect(page.locator('#app')).toHaveAttribute('data-inspection','active');expect(await page.locator('#animation option[value="clip:Baton_Idle"]').count()).toBe(0);await page.locator('#inspection-toggle').click();await expect(page.locator('#app')).toHaveAttribute('data-weapon','unarmed');
});

test('chapter touch cancellation and portrait suspension clear movement',async({page},info)=>{
  test.skip(info.project.name!=='chapter-mobile');await boot(page);await startNew(page);await page.locator('#settings-open').tap();await page.locator('#left-handed').check();await page.locator('#ui-scale').fill('1.4');await page.locator('#ui-scale').dispatchEvent('input');await page.locator('#resume').tap();
  const s=await page.context().newCDPSession(page),b=(await page.locator('#movement-stick').boundingBox())!,center={x:b.x+b.width/2,y:b.y+b.height/2};await s.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...center,id:0}]});await s.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:center.x+20,y:center.y,id:0}]});await page.waitForTimeout(100);await s.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await page.waitForTimeout(100);const stopped=await page.locator('canvas').getAttribute('data-player-position');await page.waitForTimeout(250);expect(await page.locator('canvas').getAttribute('data-player-position')).toBe(stopped);await s.detach();
  await page.setViewportSize({width:412,height:915});await page.waitForTimeout(100);const frozen=await page.locator('#app').getAttribute('data-chapter-progress');await page.waitForTimeout(300);expect(await page.locator('#app').getAttribute('data-chapter-progress')).toBe(frozen);await page.setViewportSize({width:915,height:412});await page.waitForTimeout(100);expect(await page.locator('canvas').getAttribute('data-player-position')).toBe(stopped);
});

test('mobile interaction label leaves Medic visible',async({page},info)=>{
  test.skip(info.project.name!=='chapter-mobile');await boot(page);const p=freshProgress();p.baton=true;p.checkpoint='office';p.cleared=ENCOUNTERS.map(e=>e.id);await seed(page,p);await page.reload();await expect(page.locator('#app')).toHaveAttribute('data-state','ready');await page.locator('#start').click();await page.locator('#chapter-continue').tap();await expect(page.locator('#app')).toHaveAttribute('data-chapter','warehouse');
  await page.locator('#settings-open').tap();await page.locator('#left-handed').check();await page.locator('#ui-scale').fill('1.4');await page.locator('#ui-scale').dispatchEvent('input');await page.locator('#resume').tap();
  for(const [x,z] of [[30,39],[38,37],[38,29],[37,29]])await walkTo(page,{x:x!,z:z!},true);await page.screenshot({path:`${qa}/chapter-mobile-warehouse.png`});await expect(page.locator('#pickup')).toHaveAccessibleName('Cargo hoist · position 1/3 → next');await page.locator('#pickup').tap();await expect.poll(async()=>JSON.parse((await page.locator('#app').getAttribute('data-chapter-progress'))!).hoist).toBe(1);
});
