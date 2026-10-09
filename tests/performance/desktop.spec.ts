import { mkdir, writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { exerciseEncounter, type ExerciseTotals } from '../helpers/encounter-driver';
interface FrameMeasurement { started: number; previous: number; frames: number[]; stopped: boolean }
declare global { interface Window { __PERFORMANCE_MEASUREMENT__?: FrameMeasurement } }
for (const mode of ['encounter', 'cinematic']) test(`production sustained five-minute ${mode} WebGPU measurement`, async ({ page, browser }) => {
  test.skip(process.env.VESPER_PERFORMANCE !== '1', 'Opt in with VESPER_PERFORMANCE=1; five-minute hardware measurement.');
  const errors: string[] = [], warnings: string[] = [];
  page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'warning') warnings.push(m.text()); });
  await page.goto('/'); await expect(page.locator('#app')).toHaveAttribute('data-state', 'ready'); await page.locator('#start').click();
  await page.locator('#settings-open').click(); await page.locator('#quality').selectOption('High'); await page.locator('#adaptive').uncheck();
  await page.locator('#resume').click(); await expect(page.locator('#app')).toHaveAttribute('data-state', 'running');
  if (mode === 'cinematic') { await page.locator('#inspection-toggle').click(); await expect(page.locator('#app')).toHaveAttribute('data-inspection', 'active'); }
  else { await page.locator('#encounter-start').click(); await expect(page.locator('#app')).toHaveAttribute('data-encounter', 'active'); }
  expect(await page.evaluate(() => typeof window.__VESPER_DEBUG__)).toBe('undefined');
  const totals: ExerciseTotals = { encounters: 0, victories: 0, hits: 0, criticals: 0, blocks: 0, strikes: 0 };
  let running = true;
  const driver = mode === 'encounter' ? exerciseEncounter(page, () => running, totals) : Promise.resolve();
  await page.waitForTimeout(30000);
  const hardware = await page.evaluate(async () => {
    const c = document.querySelector('canvas')!, adapter = await navigator.gpu?.requestAdapter({ powerPreference: 'high-performance' });
    return { webgpu: c.getContext('webgpu') !== null, renderResolution: { width: c.width, height: c.height },
      rendererAllocation: { estimatedBytes: Number(c.dataset.rendererBytes), textures: Number(c.dataset.rendererTextures) },
      adapter: adapter ? { vendor: adapter.info.vendor, architecture: adapter.info.architecture, device: adapter.info.device, description: adapter.info.description } : null };
  });
  expect(hardware.webgpu).toBe(true); expect(hardware.adapter).not.toBeNull(); expect(hardware.renderResolution).toEqual({ width: 1440, height: 900 });
  await page.evaluate(() => {
    const m: FrameMeasurement = { started: performance.now(), previous: 0, frames: [], stopped: false }; window.__PERFORMANCE_MEASUREMENT__ = m;
    const observe = (t: number) => { if (m.stopped) return; if (m.previous) m.frames.push(t - m.previous); m.previous = t; requestAnimationFrame(observe); }; requestAnimationFrame(observe);
  });
  const samples = [];
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(30000);
    const sample = await page.evaluate(() => {
      const m = window.__PERFORMANCE_MEASUREMENT__!, frames = m.frames.slice(-1800).sort((a,b) => a-b), c = document.querySelector('canvas')!;
      return { elapsedSeconds: (performance.now()-m.started)/1000, frames: m.frames.length, fps: 1000*frames.length/frames.reduce((s,v)=>s+v,0),
        p95FrameMs: frames[Math.floor((frames.length-1)*.95)]!, visible: document.visibilityState, estimatedRendererBytes: Number(c.dataset.rendererBytes), rendererTextures: Number(c.dataset.rendererTextures) };
    });
    samples.push({ ...sample, exercise: { ...totals } }); console.log(`Measured ${sample.elapsedSeconds.toFixed(0)}s: ${sample.fps.toFixed(1)} FPS, p95 ${sample.p95FrameMs.toFixed(1)} ms; ${totals.victories} victories`);
    expect(sample.visible).toBe('visible'); await expect(page.locator('#app')).toHaveAttribute('data-state', 'running');
  }
  running = false; await driver;
  const metrics = await page.evaluate(() => {
    const m = window.__PERFORMANCE_MEASUREMENT__!; m.stopped=true; const f=m.frames.sort((a,b)=>a-b);
    return { durationSeconds:(performance.now()-m.started)/1000, frameCount:f.length, fps:1000*f.length/f.reduce((s,v)=>s+v,0), p95FrameMs:f[Math.floor((f.length-1)*.95)]!,maxFrameMs:f.at(-1)!,intervalsOver50Ms:f.filter(v=>v>50).length,intervalsOver100Ms:f.filter(v=>v>100).length };
  });
  await mkdir('docs/qa/phase4a',{recursive:true});
  await writeFile(`docs/qa/phase4a/${mode}-performance.json`,JSON.stringify({ date:new Date().toISOString(),browser:browser.version(),backend:'WebGPU',build:'production',mode,
    method:'External requestAnimationFrame intervals, Chrome --disable-frame-rate-limit --disable-gpu-vsync, no application limiter. CPU submission and scheduling included; not isolated GPU timestamp queries.',
    renderingUncapped:true,viewport:{width:1440,height:900},quality:'High',adaptiveResolution:false,warmupSeconds:30,exercise:mode==='encounter'?'Real-input pursuit, heavy strikes, Ward, stagger, criticals, defeat and restart':'Looped idle skeletal animation',totals,hardware,samples,metrics,errors,warnings },null,2));
  expect(errors).toEqual([]);expect(warnings.filter(m=>m.includes('Vertex attribute'))).toEqual([]); expect(metrics.durationSeconds).toBeGreaterThanOrEqual(300);expect(metrics.durationSeconds).toBeLessThan(330);
  expect(metrics.p95FrameMs).toBeLessThanOrEqual(mode==='cinematic'?35:18.5);
  if(mode==='encounter'){expect(totals.victories).toBeGreaterThan(10);expect(totals.criticals).toBeGreaterThan(10);expect(totals.blocks).toBeGreaterThan(10);}
});
