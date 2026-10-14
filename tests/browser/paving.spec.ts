import {test,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {walkTo} from '../helpers/district-driver';

const diagnostic=process.env.VESPER_PAVING_PROBE==='1';
for(const mode of diagnostic?['baseline','no-shadows','no-base']:['corrected'])test(`paving ${mode}`,async({page,browser},info)=>{
  const mobile=info.project.name.endsWith('mobile'),backend=info.project.name.endsWith('webgpu')?'webgpu-required':'webgl2';
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  if(mode==='no-shadows')await page.route('**/src/world/visual-showcase.ts',async route=>{
    const response=await route.fetch(),body=await response.text();
    expect(body).toContain('this.key.castShadow = true');
    await route.fulfill({response,body:body.replace('this.key.castShadow = true','this.key.castShadow = false')});
  });
  if(mode==='no-base')await page.route('**/src/world/environment-mesh.ts',async route=>{
    const response=await route.fetch(),body=await response.text();
    expect(body).toContain('mesh.castShadow = !paving');
    await route.fulfill({response,body:body.replace('mesh.castShadow = !paving','mesh.visible = !materials.some(m => m.name.includes("basalt base")); mesh.castShadow = !paving')});
  });
  const folder='docs/qa/first-mission/paving';await mkdir(folder,{recursive:true});
  await page.goto(`/?backend=${backend}`);await expect(page.locator('#app')).toHaveAttribute('data-state','ready');await page.locator('#start').click();
  await page.waitForTimeout(300);await page.screenshot({path:`${folder}/${info.project.name}-${mode}-court.png`});
  await walkTo(page,{x:0,z:6.8},mobile);await expect(page.locator('#app')).toHaveAttribute('data-district','ready');
  await walkTo(page,{x:0,z:13},mobile);await page.waitForTimeout(300);await page.screenshot({path:`${folder}/${info.project.name}-${mode}-lane.png`});
  await walkTo(page,{x:0,z:25},mobile);await page.waitForTimeout(300);await page.screenshot({path:`${folder}/${info.project.name}-${mode}-quay.png`});
  expect(errors).toEqual([]);
  await writeFile(`${folder}/${info.project.name}-${mode}.json`,JSON.stringify({browser:browser.version(),mode,snapshot:await page.evaluate(()=>window.__VESPER_DEBUG__!.snapshot()),errors},null,2));
});
