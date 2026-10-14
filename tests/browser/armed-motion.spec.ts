import {test,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {clickSceneTool} from '../helpers/scene-menu';
import {walkTo} from '../helpers/district-driver';

const baseline=process.env.VESPER_ARMED_BASELINE==='1';
test('armed feet keep cycling and the full body supports weapon actions',async({page,browser},info)=>{
  const mobile=info.project.name.endsWith('mobile'),backend=info.project.name.endsWith('webgpu')?'webgpu-required':'webgl2';
  const folder=`docs/qa/armed-animation-fix/${baseline?'before':'after'}/${info.project.name}`;
  await mkdir(folder,{recursive:true});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`/?backend=${backend}`);await expect(page.locator('#app')).toHaveAttribute('data-state','ready');await page.locator('#start').click();
  if(mobile)await page.locator('#pickup').tap();else await page.keyboard.press('f');
  await expect(page.locator('#app')).toHaveAttribute('data-weapon','baton');
  const moving=walkTo(page,{x:0,z:5},mobile),feet:number[][][]=[];
  for(let i=0;i<15;i++){
    await page.waitForTimeout(70);const s=await page.evaluate(()=>window.__VESPER_DEBUG__!.snapshot());
    if(s.player&&s.rig)feet.push(s.rig.feet.map(f=>[f[0]!-s.player!.position.x,f[1]!-s.player!.position.y,f[2]!-s.player!.position.z]));
  }
  await moving;await page.screenshot({path:`${folder}/gameplay.png`});
  const separations=feet.slice(4).map(f=>Math.hypot(...f[0]!.map((v,k)=>v-f[1]![k]!)));
  const gaitExcursion=Math.max(...separations)-Math.min(...separations);
  if(!baseline)expect(gaitExcursion,'Equipped feet must cycle during real movement').toBeGreaterThan(.15);
  const cycles:Record<string,number[]>={};
  if(!mobile){
    await clickSceneTool(page,'#inspection-toggle');await expect(page.locator('#app')).toHaveAttribute('data-inspection','active');
    for(const name of ['Walk','Run']){
      await page.locator('#animation').selectOption(`clip:Baton_${name}`);await page.waitForTimeout(300);
      const samples:number[][][]=[];
      for(let i=0;i<20;i++){await page.waitForTimeout(80);samples.push((await page.evaluate(()=>window.__VESPER_DEBUG__!.snapshot())).rig!.feet);if(i===3||i===8)await page.screenshot({path:`${folder}/${name}-${i}.png`});}
      cycles[name]=[0,1].map(foot=>Math.max(...samples.map(s=>s[foot]![2]!))-Math.min(...samples.map(s=>s[foot]![2]!)));
      if(!baseline)for(const excursion of cycles[name]!)expect(excursion,`${name} foot must move through the whole cycle`).toBeGreaterThan(.15);
    }
    for(const name of ['Light1','Light2','Light3','Heavy','Dodge','Ward','Hit','Death']){
      await page.locator('#animation').selectOption(`clip:Baton_${name}`);await page.waitForTimeout(name==='Heavy'?500:300);await page.screenshot({path:`${folder}/${name}.png`});await page.waitForTimeout(name==='Death'?2500:900);
    }
    await page.locator('#animation').selectOption('clip:Baton_Idle');await page.waitForTimeout(250);await page.locator('#inspection-view').selectOption('equipment');await page.screenshot({path:`${folder}/grip.png`});
    await clickSceneTool(page,'#inspection-toggle');await expect(page.locator('#app')).toHaveAttribute('data-weapon','baton');
  }
  expect(errors).toEqual([]);await writeFile(`${folder}/results.json`,JSON.stringify({browser:browser.version(),backend,cycles,gaitExcursion,feet,errors,snapshot:await page.evaluate(()=>window.__VESPER_DEBUG__!.snapshot())},null,2));
});
