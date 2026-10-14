import {test,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {walkTo} from '../helpers/district-driver';
import {winMissionFight} from '../helpers/mission-driver';
import {clickSceneTool} from '../helpers/scene-menu';

test('complete mission with real controls, pause, quality replacement and restart',async({page,browser},info)=>{
  const mobile=info.project.name.endsWith('mobile'),backend=info.project.name.endsWith('webgpu')?'webgpu-required':'webgl2';
  const errors:string[]=[],requests:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
  const folder='docs/qa/first-mission';await mkdir(folder,{recursive:true});
  await page.goto(`/?backend=${backend}`);await expect(page.locator('#app')).toHaveAttribute('data-state','ready');await page.locator('#start').click();
  if(mobile){await page.locator('#settings-open').tap();await page.locator('#left-handed').check();await page.locator('#ui-scale').fill('1.4');await page.locator('#resume').tap();}
  await page.locator('#mission-start').click();await expect(page.locator('#app')).toHaveAttribute('data-mission','prepare');
  await page.screenshot({path:`${folder}/${info.project.name}-prepare.png`});
  if(mobile)await page.locator('#pickup').tap();else await page.keyboard.press('f');
  await expect(page.locator('#app')).toHaveAttribute('data-mission','quay');
  await walkTo(page,{x:0,z:6.8},mobile);await expect(page.locator('#app')).toHaveAttribute('data-district','ready');
  await walkTo(page,{x:0,z:17.9},mobile);await expect(page.locator('#app')).toHaveAttribute('data-mission','passage-fight');
  await winMissionFight(page,mobile);await expect(page.locator('#app')).toHaveAttribute('data-mission','regulator');
  await walkTo(page,{x:-2,z:22.8},mobile);await walkTo(page,{x:-5,z:22.8},mobile);
  await page.screenshot({path:`${folder}/${info.project.name}-regulator.png`});
  const stage=await page.locator('#app').getAttribute('data-mission');await page.locator('#settings-open').click();await page.waitForTimeout(400);await expect(page.locator('#app')).toHaveAttribute('data-mission',stage!);
  if(!mobile){await page.locator('#quality').selectOption('Low');await expect(page.locator('#quality')).toBeEnabled();}
  await page.locator('#resume').click();await expect(page.locator('#app')).toHaveAttribute('data-state','running');await expect(page.locator('#app')).toHaveAttribute('data-mission','regulator');
  await expect.poll(()=>page.locator('#pressure').evaluate((p:HTMLProgressElement)=>p.value),{timeout:30000}).toBe(100);
  if(mobile)await page.locator('#pickup').tap();else await page.keyboard.press('f');await expect(page.locator('#app')).toHaveAttribute('data-mission','winch-fight');
  await walkTo(page,{x:-2,z:23},mobile);await winMissionFight(page,mobile);await expect(page.locator('#app')).toHaveAttribute('data-mission','install');
  await walkTo(page,{x:3,z:24.4},mobile);if(mobile)await page.locator('#pickup').tap();else await page.keyboard.press('f');
  await expect(page.locator('#app')).toHaveAttribute('data-mission','powering');await page.screenshot({path:`${folder}/${info.project.name}-winch.png`});
  await expect(page.locator('#app')).toHaveAttribute('data-mission','board');
  await walkTo(page,{x:0,z:28},mobile);await walkTo(page,{x:0,z:30},mobile);await page.screenshot({path:`${folder}/${info.project.name}-ramp.png`});
  if(mobile)await page.locator('#pickup').tap();else await page.keyboard.press('f');await expect(page.locator('#app')).toHaveAttribute('data-mission','complete');
  await page.screenshot({path:`${folder}/${info.project.name}-complete.png`});
  const completion=await page.locator('#mission-feedback').textContent();
  await page.locator('#mission-replay').click();await expect(page.locator('#app')).toHaveAttribute('data-mission','quay');await expect(page.locator('#app')).toHaveAttribute('data-weapon','baton');
  await clickSceneTool(page,'#mission-leave');await expect(page.locator('#app')).toHaveAttribute('data-mission','inactive');await expect(page.locator('#app')).toHaveAttribute('data-encounter','training');
  expect(errors).toEqual([]);if(mobile)expect(requests.some(r=>r.includes('/cinematic/')||r.includes('/encounter/desktop/'))).toBe(false);
  await writeFile(`${folder}/${info.project.name}.json`,JSON.stringify({browser:browser.version(),backend:await page.locator('canvas').getAttribute('data-backend'),completion,errors,requests,snapshot:await page.evaluate(()=>window.__VESPER_DEBUG__!.snapshot())},null,2));
  const video=page.video();await page.context().close();await video?.saveAs(`${folder}/${info.project.name}.webm`);
});

test('failed and cancelled mission loads retain practice; inspection retains mission',async({page},info)=>{
  test.skip(info.project.name!=='mission-webgpu','One lifecycle run');
  await page.goto('/?backend=webgpu-required');await expect(page.locator('#app')).toHaveAttribute('data-state','ready');await page.locator('#start').click();
  await page.route('**/encounter/**/zombie7.glb',r=>r.abort());
  // Match the manifest model path as well as alternate optimized names.
  await page.route('**/encounter/**/*.glb',r=>r.abort());
  await page.locator('#mission-start').click();await expect(page.locator('#mission-start')).toHaveText('Retry mission');await expect(page.locator('#app')).toHaveAttribute('data-mission','inactive');
  await page.unrouteAll({behavior:'wait'});
  await page.route('**/encounter/**/*.glb',async r=>{await new Promise(resolve=>setTimeout(resolve,1500));await r.continue().catch(()=>{});});
  await page.locator('#mission-start').click();await expect(page.locator('#mission-start')).toHaveText('Cancel mission load');await page.locator('#mission-start').click();
  await page.waitForTimeout(2200);await expect(page.locator('#app')).toHaveAttribute('data-mission','inactive');await page.unrouteAll({behavior:'wait'});
  await page.locator('#mission-start').click();await expect(page.locator('#app')).toHaveAttribute('data-mission','prepare');
  await clickSceneTool(page,'#inspection-toggle');await expect(page.locator('#app')).toHaveAttribute('data-inspection','active');await page.waitForTimeout(400);await clickSceneTool(page,'#inspection-toggle');await expect(page.locator('#app')).toHaveAttribute('data-mission','prepare');
  await page.keyboard.press('f');await expect(page.locator('#app')).toHaveAttribute('data-mission','quay');
  await walkTo(page,{x:0,z:6.8});await expect(page.locator('#app')).toHaveAttribute('data-district','ready');await walkTo(page,{x:0,z:17.9});
  await expect(page.locator('#restart-player')).toBeVisible();await page.locator('#restart-player').click();
  await expect(page.locator('#app')).toHaveAttribute('data-mission','quay');await expect(page.locator('#health-value')).toHaveText('100 / 100');await expect(page.locator('#app')).toHaveAttribute('data-weapon','baton');
  await clickSceneTool(page,'#mission-leave');await expect(page.locator('#app')).toHaveAttribute('data-encounter','training');
  const baseline=await page.evaluate(()=>window.__VESPER_DEBUG__!.snapshot());
  const cycles=[];
  for(let i=0;i<3;i++){
    await page.locator('#mission-start').click();await expect(page.locator('#app')).toHaveAttribute('data-mission','quay');
    await clickSceneTool(page,'#mission-leave');await expect(page.locator('#app')).toHaveAttribute('data-encounter','training');
    const snapshot=await page.evaluate(()=>window.__VESPER_DEBUG__!.snapshot());cycles.push(snapshot);
    expect(snapshot.references).toBe(baseline.references);expect(snapshot.resources).toBe(baseline.resources);expect(snapshot.listeners).toBe(baseline.listeners);
  }
  await writeFile('docs/qa/first-mission/lifecycle.json',JSON.stringify({baseline,cycles},null,2));
});
