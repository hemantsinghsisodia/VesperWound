import {test,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {playMissionRoute} from '../helpers/mission-driver';
import {clickSceneTool} from '../helpers/scene-menu';

declare global {interface Window {__MISSION_COMBAT_FRAMES__?:number[]}}

for(const scenario of ['mission','inspection'] as const)test(`five-minute production ${scenario}`,async({page,browser})=>{
  test.skip(process.env.VESPER_PERFORMANCE!=='1','Opt-in five-minute production measurement.');
  const errors:string[]=[],warnings:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='warning')warnings.push(m.text());});
  await page.goto('/');await expect(page.locator('#app')).toHaveAttribute('data-state','ready');await page.locator('#start').click();
  await page.locator('#settings-open').click();await page.locator('#quality').selectOption('High');await page.locator('#adaptive').uncheck();await page.locator('#resume').click();await expect(page.locator('#app')).toHaveAttribute('data-state','running');
  await page.locator('#mission-start').click();await expect(page.locator('#app')).toHaveAttribute('data-mission','prepare');await page.keyboard.press('f');await expect(page.locator('#app')).toHaveAttribute('data-mission','quay');
  if(scenario==='inspection'){await clickSceneTool(page,'#inspection-toggle');await expect(page.locator('#app')).toHaveAttribute('data-inspection','active');}
  expect(await page.evaluate(()=>typeof window.__VESPER_DEBUG__)).toBe('undefined');
  let running=true,completions=0,driverError='';
  const driver=scenario==='mission'?(async()=>{while(running){await playMissionRoute(page);completions++;if(running){await page.locator('#mission-replay').click();await expect(page.locator('#app')).toHaveAttribute('data-mission','quay');}}})().catch((error:unknown)=>{driverError=String(error);}):Promise.resolve();
  await page.waitForTimeout(30000);
  const hardware=await page.evaluate(async()=>{const c=document.querySelector('canvas')!,a=await navigator.gpu?.requestAdapter();return {backend:c.dataset.backend,resolution:[c.width,c.height],adapter:a?{vendor:a.info.vendor,architecture:a.info.architecture,device:a.info.device,description:a.info.description}:null};});
  expect(hardware.backend).toBe('WebGPU');expect(hardware.resolution).toEqual([1440,900]);
  await page.evaluate(()=>{const m={started:performance.now(),previous:0,frames:[] as number[],stopped:false};window.__PERFORMANCE_MEASUREMENT__=m;window.__MISSION_COMBAT_FRAMES__=[];const observe=(t:number)=>{if(m.stopped)return;if(m.previous){const dt=t-m.previous;m.frames.push(dt);if(document.querySelector<HTMLElement>('#app')!.dataset.mission?.endsWith('-fight'))window.__MISSION_COMBAT_FRAMES__!.push(dt);}m.previous=t;requestAnimationFrame(observe);};requestAnimationFrame(observe);});
  const samples=[];
  for(let i=0;i<10;i++){
    await page.waitForTimeout(30000);
    const sample=await page.evaluate(()=>{const c=document.querySelector('canvas')!,m=window.__PERFORMANCE_MEASUREMENT__!;return {elapsed:(performance.now()-m.started)/1000,bytes:Number(c.dataset.rendererBytes),textures:Number(c.dataset.rendererTextures),stage:document.querySelector<HTMLElement>('#app')!.dataset.mission,visible:document.visibilityState};});
    samples.push({...sample,completions});console.log(`${scenario} ${sample.elapsed.toFixed(0)}s, ${completions} completed missions, ${sample.stage}`);expect(sample.visible).toBe('visible');
  }
  running=false;
  const metrics=await page.evaluate(()=>{const m=window.__PERFORMANCE_MEASUREMENT__!;m.stopped=true;const f=m.frames.sort((a,b)=>a-b),c=window.__MISSION_COMBAT_FRAMES__!.sort((a,b)=>a-b);return {seconds:(performance.now()-m.started)/1000,frames:f.length,p95:f[Math.floor((f.length-1)*.95)]!,max:f.at(-1),over50:f.filter(v=>v>50).length,over100:f.filter(v=>v>100).length,combatFrames:c.length,combatP95:c.length?c[Math.floor((c.length-1)*.95)]:null};});
  await driver;await mkdir('docs/qa/first-mission',{recursive:true});
  await writeFile(`docs/qa/first-mission/${scenario}-performance.json`,JSON.stringify({date:new Date().toISOString(),browser:browser.version(),scenario,hardware,quality:'High',adaptive:false,uncapped:true,warmupSeconds:30,method:'External requestAnimationFrame intervals; Chrome frame limiter and GPU vsync disabled; includes scheduling and CPU, not isolated GPU timestamps.',metrics,samples,completions,driverError,errors,warnings},null,2));
  expect(driverError).toBe('');expect(errors).toEqual([]);expect(metrics.seconds).toBeGreaterThanOrEqual(300);expect(metrics.p95).toBeLessThanOrEqual(scenario==='mission'?18.5:35);if(scenario==='mission'){expect(completions).toBeGreaterThanOrEqual(2);expect(metrics.combatFrames).toBeGreaterThan(0);expect(metrics.combatP95).toBeLessThanOrEqual(18.5);}
});
