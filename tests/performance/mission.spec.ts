import {test,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {playMissionRoute} from '../helpers/mission-driver';
import {clickSceneTool} from '../helpers/scene-menu';
const folder=process.env.VESPER_MISSION_QA??'docs/qa/first-mission-polish';

declare global {interface Window {__MISSION_COMBAT_FRAMES__?:number[];__MISSION_PHASE_FRAMES__?:Record<string,number[]>;__MISSION_LOAD__?:{start:number;last:number;frames:number[];done:boolean};__MISSION_ADAPTER_REQUESTS__?:{powerPreference:string;vendor:string;architecture:string;description:string}[]}}

for(const scenario of ['mission','inspection'] as const)test(`five-minute production ${scenario}`,async({page,browser})=>{
  test.skip(process.env.VESPER_PERFORMANCE!=='1','Opt-in five-minute production measurement.');
  const errors:string[]=[],warnings:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='warning')warnings.push(m.text());});
  await page.goto('/');await expect(page.locator('#app')).toHaveAttribute('data-state','ready');await page.locator('#start').click();
  await page.locator('#settings-open').click();await page.locator('#quality').selectOption('High');await page.locator('#adaptive').uncheck();await page.locator('#resume').click();await expect(page.locator('#app')).toHaveAttribute('data-state','running');
  await page.evaluate(()=>{const m={start:performance.now(),last:0,frames:[] as number[],done:false};window.__MISSION_LOAD__=m;const frame=(t:number)=>{if(m.done)return;if(m.last)m.frames.push(t-m.last);m.last=t;requestAnimationFrame(frame);};requestAnimationFrame(frame);});
  await page.locator('#mission-start').click();await expect(page.locator('#app')).toHaveAttribute('data-mission','introduction');
  const loading=await page.evaluate(()=>{const m=window.__MISSION_LOAD__!;m.done=true;const f=m.frames.sort((a,b)=>a-b);return {seconds:(performance.now()-m.start)/1000,frames:f.length,p95:f[Math.floor((f.length-1)*.95)],max:f.at(-1),over50:f.filter(v=>v>50).length};});
  await expect(page.locator('#app')).toHaveAttribute('data-mission','prepare');await page.keyboard.press('f');await expect(page.locator('#app')).toHaveAttribute('data-mission','quay');
  if(scenario==='inspection'){await clickSceneTool(page,'#inspection-toggle');await expect(page.locator('#app')).toHaveAttribute('data-inspection','active');}
  expect(await page.evaluate(()=>typeof window.__VESPER_DEBUG__)).toBe('undefined');
  let running=true,completions=0,driverError='';
  const driver=scenario==='mission'?(async()=>{while(running){await playMissionRoute(page);completions++;if(running){await page.locator('#mission-replay').click();await expect(page.locator('#app')).toHaveAttribute('data-mission','quay');}}})().catch((error:unknown)=>{driverError=String(error);console.log(`Mission driver stopped: ${driverError.slice(0,200)}`);}):Promise.resolve();
  await page.waitForTimeout(30000);
  const hardware=await page.evaluate(async()=>{const c=document.querySelector('canvas')!,a=await navigator.gpu?.requestAdapter();return {backend:c.dataset.backend,resolution:[c.width,c.height],adapter:a?{vendor:a.info.vendor,architecture:a.info.architecture,device:a.info.device,description:a.info.description}:null};});
  expect(hardware.backend).toBe('WebGPU');expect(hardware.resolution).toEqual([1440,900]);
  await page.evaluate(()=>{const m={started:performance.now(),previous:0,frames:[] as number[],stopped:false};window.__PERFORMANCE_MEASUREMENT__=m;window.__MISSION_COMBAT_FRAMES__=[];window.__MISSION_PHASE_FRAMES__={};const observe=(t:number)=>{if(m.stopped)return;if(m.previous){const dt=t-m.previous;m.frames.push(dt);const stage=document.querySelector<HTMLElement>('#app')!.dataset.mission??'inactive';(window.__MISSION_PHASE_FRAMES__![stage]??=[]).push(dt);if(document.querySelector<HTMLElement>('#app')!.dataset.mission?.endsWith('-fight'))window.__MISSION_COMBAT_FRAMES__!.push(dt);}m.previous=t;requestAnimationFrame(observe);};requestAnimationFrame(observe);});
  const samples=[];
  for(let i=0;i<10;i++){
    await page.waitForTimeout(30000);
    const sample=await page.evaluate(()=>{const c=document.querySelector('canvas')!,m=window.__PERFORMANCE_MEASUREMENT__!;return {elapsed:(performance.now()-m.started)/1000,bytes:Number(c.dataset.rendererBytes),textures:Number(c.dataset.rendererTextures),stage:document.querySelector<HTMLElement>('#app')!.dataset.mission,visible:document.visibilityState};});
    samples.push({...sample,completions});console.log(`${scenario} ${sample.elapsed.toFixed(0)}s, ${completions} completed missions, ${sample.stage}`);expect(sample.visible).toBe('visible');
  }
  running=false;
  const metrics=await page.evaluate(()=>{const m=window.__PERFORMANCE_MEASUREMENT__!;m.stopped=true;const f=m.frames.sort((a,b)=>a-b),c=window.__MISSION_COMBAT_FRAMES__!.sort((a,b)=>a-b);return {seconds:(performance.now()-m.started)/1000,frames:f.length,p95:f[Math.floor((f.length-1)*.95)]!,max:f.at(-1),over50:f.filter(v=>v>50).length,over100:f.filter(v=>v>100).length,combatFrames:c.length,combatP95:c.length?c[Math.floor((c.length-1)*.95)]:null,phases:Object.fromEntries(Object.entries(window.__MISSION_PHASE_FRAMES__!).map(([stage,frames])=>{frames.sort((a,b)=>a-b);return [stage,{frames:frames.length,p95:frames[Math.floor((frames.length-1)*.95)],max:frames.at(-1),over50:frames.filter(v=>v>50).length}];}))};});
  await driver;await mkdir(folder,{recursive:true});
  await writeFile(`${folder}/${scenario}-performance.json`,JSON.stringify({date:new Date().toISOString(),browser:browser.version(),scenario,hardware,quality:'High',adaptive:false,uncapped:true,warmupSeconds:30,method:'External requestAnimationFrame intervals; Chrome frame limiter and GPU vsync disabled; includes scheduling and CPU, not isolated GPU timestamps.',metrics,loading,samples,completions,driverError,errors,warnings},null,2));
  expect(driverError).toBe('');expect(errors).toEqual([]);expect(metrics.seconds).toBeGreaterThanOrEqual(300);expect(metrics.p95).toBeLessThanOrEqual(scenario==='mission'?18.5:35);if(scenario==='mission'){expect(completions).toBeGreaterThanOrEqual(2);expect(metrics.combatFrames).toBeGreaterThan(0);expect(metrics.combatP95).toBeLessThanOrEqual(18.5);}
});

test('production opening transition timing',async({page,browser})=>{
  test.skip(process.env.VESPER_PERFORMANCE!=='1','Opt-in production transition measurement.');
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{
    const gpu=navigator.gpu;if(!gpu)return;
    const request=gpu.requestAdapter.bind(gpu);window.__MISSION_ADAPTER_REQUESTS__=[];
    gpu.requestAdapter=async options=>{const adapter=await request(options);if(adapter)window.__MISSION_ADAPTER_REQUESTS__!.push({powerPreference:options?.powerPreference??'default',vendor:adapter.info.vendor,architecture:adapter.info.architecture,description:adapter.info.description});return adapter;};
  });
  await page.goto('/');await expect(page.locator('#app')).toHaveAttribute('data-state','ready');await page.locator('#start').click();
  await page.locator('#settings-open').click();await page.locator('#quality').selectOption('High');await page.locator('#adaptive').uncheck();await page.locator('#resume').click();await expect(page.locator('#app')).toHaveAttribute('data-state','running');
  await page.evaluate(()=>{
    const m={started:performance.now(),previous:0,frames:[] as number[],stopped:false};window.__PERFORMANCE_MEASUREMENT__=m;window.__MISSION_PHASE_FRAMES__={};
    const frame=(t:number)=>{if(m.stopped)return;if(m.previous){const phase=document.querySelector<HTMLElement>('#app')!.dataset.mission??'inactive';(window.__MISSION_PHASE_FRAMES__![phase]??=[]).push(t-m.previous);}m.previous=t;requestAnimationFrame(frame);};requestAnimationFrame(frame);
  });
  await page.locator('#mission-start').click();await expect(page.locator('#app')).toHaveAttribute('data-mission','introduction');await expect(page.locator('#app')).toHaveAttribute('data-mission','prepare');await page.waitForTimeout(1000);
  const result=await page.evaluate(()=>{
    window.__PERFORMANCE_MEASUREMENT__!.stopped=true;const canvas=document.querySelector('canvas')!;
    return {backend:canvas.dataset.backend,resolution:[canvas.width,canvas.height],adapterRequests:window.__MISSION_ADAPTER_REQUESTS__,phases:Object.fromEntries(Object.entries(window.__MISSION_PHASE_FRAMES__!).map(([phase,frames])=>{frames.sort((a,b)=>a-b);return [phase,{frames:frames.length,p95:frames[Math.floor((frames.length-1)*.95)],max:frames.at(-1),over50:frames.filter(v=>v>50).length}];}))};
  });
  await mkdir(folder,{recursive:true});await writeFile(`${folder}/opening-performance.json`,JSON.stringify({date:new Date().toISOString(),browser:browser.version(),quality:'High',adaptive:false,uncapped:true,method:'External requestAnimationFrame intervals during cold mission loading, introduction and first resumed control; no warm-up.',...result,errors},null,2));
  expect(errors).toEqual([]);expect(result.backend).toBe('WebGPU');expect(result.resolution).toEqual([1440,900]);expect(result.phases.introduction?.frames).toBeGreaterThan(10);
});
