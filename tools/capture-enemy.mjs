import { chromium } from '@playwright/test';
import { mkdir,writeFile } from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',args:[]});
const report=[];
await mkdir('docs/qa/phase4a/comparison',{recursive:true});
try {
  for(const backend of ['webgpu','webgl2'])for(const variant of ['source','desktop','mobile']) {
    const page=await browser.newPage({viewport:{width:1440,height:900}});const errors=[],warnings=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='warning')warnings.push(m.text());});
    await page.goto(`http://127.0.0.1:5174/docs/qa/phase4a/studio.html?backend=${backend}&variant=${variant}`);
    await page.locator('#status').filter({hasText:'neutral source comparison'}).waitFor({timeout:90000});
    const dir=`docs/qa/phase4a/comparison/${backend}/${variant}`;await mkdir(dir,{recursive:true});
    for(const [angle,turns]of [['front',0],['three-quarter',1],['profile',1],['back',2]]){for(let i=0;i<turns;i++)await page.locator('#turn').click();await page.waitForTimeout(180);await page.screenshot({path:`${dir}/${angle}.png`});}
    await page.locator('#turn').click();await page.locator('#turn').click();await page.locator('#turn').click();await page.locator('#turn').click();
    await page.locator('#view').selectOption('portrait');await page.screenshot({path:`${dir}/face.png`});
    for(const view of ['hands','feet']){await page.locator('#view').selectOption(view);await page.screenshot({path:`${dir}/${view}.png`});}
    await page.locator('#view').selectOption('full-body');
    for(const [clip,fraction,name]of [['Attack','0.25','attack-windup'],['Attack','0.43','attack-contact'],['Walk','0.5','walk'],['Scream','0.4','stagger'],['Death','0.96','death']]){await page.locator('#clip').selectOption(clip);await page.locator('#time').fill(fraction);await page.screenshot({path:`${dir}/${name}.png`});}
    report.push({backend,variant,bounds:await page.locator('canvas').getAttribute('data-bounds'),errors,warnings});
    if(errors.length)throw new Error(errors.join('\n'));await page.close();
  }
}finally{await browser.close();await writeFile('docs/qa/phase4a/comparison/browser.json',JSON.stringify(report,null,2));}
