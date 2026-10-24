import {test,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {seedChapter,continueChapter,districtCircuit} from '../helpers/chapter-driver';
import {freshProgress} from '../../src/chapter/progress';
import {ENCOUNTERS} from '../../src/chapter/definition';
import {clickSceneTool} from '../helpers/scene-menu';
for(const scenario of ['traversal','inspection'] as const)test(`five-minute chapter ${scenario}`,async({page,browser})=>{
  test.skip(process.env.VESPER_PERFORMANCE!=='1');const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');await expect(page.locator('#app')).toHaveAttribute('data-state','ready');
  const progress=freshProgress();progress.baton=true;progress.cleared=ENCOUNTERS.map(e=>e.id);progress.shortcuts=['warehouse','pump'];await seedChapter(page,progress);const chapterLoadMs=await continueChapter(page);
  await page.locator('#settings-open').click();await page.locator('#quality').selectOption('High');await page.locator('#adaptive').uncheck();await page.locator('#resume').click();
  if(scenario==='inspection'){await clickSceneTool(page,'#inspection-toggle');await expect(page.locator('#app')).toHaveAttribute('data-inspection','active');}
  expect(await page.evaluate(()=>typeof window.__VESPER_DEBUG__)).toBe('undefined');
  let running=true,circuits=0,driverError='';const driver=scenario==='traversal'?(async()=>{while(running){await districtCircuit(page);circuits++;}})().catch(e=>{driverError=String(e);}):Promise.resolve();
  await page.waitForTimeout(30000);
  const hardware=await page.evaluate(async()=>{const c=document.querySelector('canvas')!,a=await navigator.gpu?.requestAdapter({powerPreference:'high-performance'});return {backend:c.dataset.backend,resolution:[c.width,c.height],adapter:a?{vendor:a.info.vendor,architecture:a.info.architecture,device:a.info.device,description:a.info.description}:null};});
  expect(hardware.backend).toBe('WebGPU');expect(hardware.resolution).toEqual([1440,900]);
  await page.evaluate(()=>{const m={started:performance.now(),previous:0,frames:[] as number[],stopped:false};window.__PERFORMANCE_MEASUREMENT__=m;const observe=(t:number)=>{if(m.stopped)return;if(m.previous)m.frames.push(t-m.previous);m.previous=t;requestAnimationFrame(observe);};requestAnimationFrame(observe);});
  const samples=[];
  for(let i=0;i<10;i++){
    await page.waitForTimeout(30000);const sample=await page.evaluate(()=>{const m=window.__PERFORMANCE_MEASUREMENT__!,f=m.frames.slice(-1800).sort((a,b)=>a-b),c=document.querySelector('canvas')!;return {elapsed:(performance.now()-m.started)/1000,p95:f[Math.floor((f.length-1)*.95)],bytes:Number(c.dataset.rendererBytes),textures:Number(c.dataset.rendererTextures),area:document.querySelector<HTMLElement>('#app')!.dataset.chapter,sectors:Number(document.querySelector<HTMLElement>('#app')!.dataset.chapterSectors),visible:document.visibilityState};});
    samples.push(sample);console.log(`${scenario}: ${sample.elapsed.toFixed(0)}s p95 ${sample.p95?.toFixed(1)}ms, ${sample.area}, ${circuits} circuits`);expect(sample.sectors).toBeLessThanOrEqual(2);expect(sample.visible).toBe('visible');
  }
  running=false;const metrics=await page.evaluate(()=>{const m=window.__PERFORMANCE_MEASUREMENT__!;m.stopped=true;const f=m.frames.sort((a,b)=>a-b);return {duration:(performance.now()-m.started)/1000,frames:f.length,fps:1000*f.length/f.reduce((s,v)=>s+v,0),p95:f[Math.floor((f.length-1)*.95)]!,max:f.at(-1),over50:f.filter(v=>v>50).length,over100:f.filter(v=>v>100).length};});await driver;
  await mkdir('docs/qa/chapter-district/performance',{recursive:true});await writeFile(`docs/qa/chapter-district/performance/${scenario}.json`,JSON.stringify({date:new Date().toISOString(),browser:browser.version(),hardware,scenario,chapterLoadMs,powerState:process.env.VESPER_POWER_NOTE??'Verify power separately; not sampled by browser',uncapped:true,adaptive:false,quality:'High',warmup:30,method:'External requestAnimationFrame intervals; frame limiter and GPU vsync disabled; includes CPU and scheduling. Traversal uses a saved cleared-encounter fixture.',samples,metrics,circuits,driverError,errors},null,2));
  expect(driverError).toBe('');expect(errors).toEqual([]);expect(metrics.duration).toBeGreaterThanOrEqual(300);expect(metrics.p95).toBeLessThanOrEqual(scenario==='traversal'?18.5:35);if(scenario==='traversal')expect(circuits).toBeGreaterThan(2);
});
