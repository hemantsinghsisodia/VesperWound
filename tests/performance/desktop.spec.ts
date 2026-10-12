import { clickSceneTool } from '../helpers/scene-menu';
import { mkdir, writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { exerciseGroup, type GroupTotals } from '../helpers/group-driver';
import { walkTo } from '../helpers/district-driver';
interface FrameMeasurement { started: number; previous: number; frames: number[]; stopped: boolean }
declare global { interface Window { __PERFORMANCE_MEASUREMENT__?: FrameMeasurement } }
for (const mode of ['group', 'cinematic', 'traversal']) test(`production sustained five-minute armed ${mode} WebGPU measurement`, async ({ page, browser }) => {
  test.skip(process.env.VESPER_PERFORMANCE !== '1', 'Opt in with VESPER_PERFORMANCE=1; five-minute hardware measurement.');
  const errors: string[] = [], warnings: string[] = [];
  page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'warning') warnings.push(m.text()); });
  await page.goto('/'); await expect(page.locator('#app')).toHaveAttribute('data-state', 'ready'); await page.locator('#start').click();
  await page.locator('#settings-open').click(); await page.locator('#quality').selectOption('High'); await page.locator('#adaptive').uncheck();
  await page.locator('#resume').click(); await expect(page.locator('#app')).toHaveAttribute('data-state', 'running');
  await page.keyboard.press('f'); await expect(page.locator('#app')).toHaveAttribute('data-weapon', 'baton');
  if (mode === 'cinematic') { await clickSceneTool(page, '#inspection-toggle'); await expect(page.locator('#app')).toHaveAttribute('data-inspection', 'active'); }
  else if (mode === 'group') { await clickSceneTool(page, '#encounter-group'); await expect(page.locator('#app')).toHaveAttribute('data-encounter', 'active'); }
  expect(await page.evaluate(() => typeof window.__VESPER_DEBUG__)).toBe('undefined');
  const totals: GroupTotals = { encounters: 0, victories: 0, hits: 0, criticals: 0, blocks: 0, strikes: 0, multiTargetAttacks:0, defeated:0 };
  let running = true;
  let traversals = 0;
  const traverse = async () => {
    while (running) {
      await walkTo(page, { x: 0, z: 6.8 }); await expect(page.locator('#app')).toHaveAttribute('data-district', 'ready');
      await walkTo(page, { x: 0, z: 25.5 }); await walkTo(page, { x: -5, z: 23 });
      await walkTo(page, { x: 0, z: 23 }); await walkTo(page, { x: 0, z: 1 });
      await expect(page.locator('#app')).toHaveAttribute('data-district', 'closed'); traversals++;
    }
  };
  const driver = mode === 'group' ? exerciseGroup(page, () => running, totals) : mode === 'traversal' ? traverse() : Promise.resolve();
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
    samples.push({ ...sample, exercise: { ...totals }, traversals }); console.log(`Measured ${sample.elapsedSeconds.toFixed(0)}s: ${sample.fps.toFixed(1)} FPS, p95 ${sample.p95FrameMs.toFixed(1)} ms; ${totals.victories} victories; ${traversals} traversals`);
    expect(sample.visible).toBe('visible'); await expect(page.locator('#app')).toHaveAttribute('data-state', 'running');
  }
  running = false;
  const metrics = await page.evaluate(() => {
    const m = window.__PERFORMANCE_MEASUREMENT__!; m.stopped=true; const f=m.frames.sort((a,b)=>a-b);
    return { durationSeconds:(performance.now()-m.started)/1000, frameCount:f.length, fps:1000*f.length/f.reduce((s,v)=>s+v,0), p95FrameMs:f[Math.floor((f.length-1)*.95)]!,maxFrameMs:f.at(-1)!,intervalsOver50Ms:f.filter(v=>v>50).length,intervalsOver100Ms:f.filter(v=>v>100).length };
  });
  await driver;
  await mkdir('docs/qa/ash-quay-checkpoint-b',{recursive:true});
  await writeFile(`docs/qa/ash-quay-checkpoint-b/${mode}-performance.json`,JSON.stringify({ date:new Date().toISOString(),browser:browser.version(),backend:'WebGPU',build:'production',mode,
    method:'External requestAnimationFrame intervals, Chrome --disable-frame-rate-limit --disable-gpu-vsync, no application limiter. CPU submission and scheduling included; not isolated GPU timestamp queries.',
    renderingUncapped:true,viewport:{width:1440,height:900},quality:'High',adaptiveResolution:false,warmupSeconds:30,exercise:mode==='group'?'Real-input three-zombie equipped baton pursuit, targeting, light/heavy sweeps, Ward, stagger, criticals, group victory and restart':mode==='traversal'?'Repeated real-input court, alley, quay and loading canopy traversal with section release/reload':'Looped equipped Baton_Idle skeletal animation',totals,traversals,hardware,samples,metrics,errors,warnings },null,2));
  expect(errors).toEqual([]);expect(warnings.filter(m=>m.includes('Vertex attribute'))).toEqual([]); expect(metrics.durationSeconds).toBeGreaterThanOrEqual(300);expect(metrics.durationSeconds).toBeLessThan(330);
  expect(metrics.p95FrameMs).toBeLessThanOrEqual(mode==='cinematic'?35:18.5);
  if(mode==='group'){expect(totals.victories).toBeGreaterThanOrEqual(5);expect(totals.criticals).toBeGreaterThanOrEqual(5);expect(totals.blocks).toBeGreaterThanOrEqual(5);expect(totals.defeated).toBeGreaterThanOrEqual(15);expect(totals.multiTargetAttacks).toBeGreaterThan(0);}
  if(mode==='traversal') expect(traversals).toBeGreaterThanOrEqual(5);
});
