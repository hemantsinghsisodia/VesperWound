import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { walkTo } from '../helpers/district-driver';
const baseline=process.env.VESPER_DODGE_BASELINE==='1';
const visual=process.env.VESPER_DODGE_VISUAL==='1';
test.use({video:{mode:'on',size:{width:1440,height:900}}});
test('baton attacks cancel promptly into dodge through real controls',async({page,browser},info)=>{
  const mobile=info.project.name.endsWith('mobile'), backend=info.project.name.endsWith('webgpu')?'webgpu-required':'webgl2';
  const folder=`docs/qa/baton-dodge-cancel/${visual?'visual':baseline?'before':'after'}/${info.project.name}`;
  await mkdir(folder,{recursive:true});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`/?backend=${backend}`);await expect(page.locator('#app')).toHaveAttribute('data-state','ready');await page.locator('#start').click();
  if(mobile){await page.locator('#settings-open').tap();await page.locator('#left-handed').check();await page.locator('#ui-scale').fill('1.4');await page.locator('#resume').tap();await page.locator('#pickup').tap();}
  else await page.keyboard.press('f');
  await expect(page.locator('#app')).toHaveAttribute('data-weapon','baton');
  const attack=async(heavy=false)=>{if(mobile)await page.locator(heavy?'#heavy':'#pulse').tap();else await page.mouse.click(850,570,{button:heavy?'right':'left'});};
  const traces=[];
  for(const [name,count,delay] of [['Light1',1,40],['Light2',2,190],['Light3',3,230],['Heavy',1,50],['Heavy',1,400],['Heavy',1,580]] as const){
    await page.waitForTimeout(1400);
    if(visual)await walkTo(page,{x:-1.6,z:4.5},mobile);
    await attack(name==='Heavy');
    for(let i=1;i<count;i++){await page.waitForTimeout(40);await attack();await page.waitForFunction(n=>window.__VESPER_DEBUG__!.snapshot().player?.attack===`baton-light${n}`,i+1);}
    await page.waitForTimeout(delay);
    const before=await page.evaluate(()=>window.__VESPER_DEBUG__!.snapshot());
    expect(before.player?.attack).toBe(`baton-${name.toLowerCase()}`);
    const started=Date.now();if(mobile)await page.locator('#dodge').tap();else await page.keyboard.press('Space');
    if(!baseline){await page.waitForFunction(()=>window.__VESPER_DEBUG__!.snapshot().player?.action==='dodge',{},{timeout:1000});}
    const after=await page.evaluate(()=>window.__VESPER_DEBUG__!.snapshot());
    traces.push({name,delay,observedWallMs:Date.now()-started,before:before.player,after:after.player,animation:after.animation,contactTime:after.weaponContact?.time});
    if(!baseline){expect(after.player?.attack).toBeNull();expect(after.player?.pendingAttack).toBeNull();expect(after.animation).toBe('Baton_Dodge');expect(after.weaponContact?.time).toBeNull();}
    await page.screenshot({path:`${folder}/${name}-${delay}.png`});
  }
  if(mobile){await page.evaluate(()=>{const stick=document.querySelector<HTMLElement>('#movement-stick')!;stick.setPointerCapture=()=>{};const b=stick.getBoundingClientRect();stick.dispatchEvent(new PointerEvent('pointerdown',{pointerId:208,pointerType:'touch',clientX:b.x+b.width,clientY:b.y+b.height/2,bubbles:true}));});await attack(true);await page.locator('#dodge').tap();await page.evaluate(()=>window.dispatchEvent(new PointerEvent('pointercancel',{pointerId:208,pointerType:'touch'})));await page.waitForTimeout(1000);await expect(page.locator('#world')).toHaveAttribute('data-player-action','idle');}
  expect(errors).toEqual([]);await writeFile(`${folder}/cancellation.json`,JSON.stringify({browser:browser.version(),backend,traces,errors},null,2));
  const video=page.video();await page.context().close();await video?.saveAs(`${folder}/cancellation.webm`);
});
