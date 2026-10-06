import { mkdir, writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

interface FrameMeasurement {
  started: number;
  previous: number;
  frames: number[];
  stopped: boolean;
}

declare global {
  interface Window { __PERFORMANCE_MEASUREMENT__?: FrameMeasurement }
}

for (const mode of ['gameplay', 'cinematic']) test(`production sustained ten-minute ${mode} WebGPU measurement`, async ({ page, browser }) => {
  test.skip(process.env.VESPER_PERFORMANCE !== '1', 'Opt in with VESPER_PERFORMANCE=1; ten-minute hardware measurement.');
  const errors: string[] = [];
  const warnings: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'warning') warnings.push(message.text()); });
  await page.goto('/');
  await expect(page.locator('#app')).toHaveAttribute('data-state', 'ready');
  await page.getByRole('button', { name: 'ENTER THE WORKS' }).click();
  await page.getByRole('button', { name: 'Open settings' }).click();
  await page.locator('#quality').selectOption('High');
  await page.locator('#adaptive').uncheck();
  await page.getByRole('button', { name: 'RETURN TO THE WORKS' }).click();
  await expect(page.locator('#app')).toHaveAttribute('data-state', 'running');
  if (mode === 'cinematic') {
    await page.locator('#inspection-toggle').click(); await expect(page.locator('#app')).toHaveAttribute('data-inspection', 'active');
  }
  expect(await page.evaluate(() => typeof window.__VESPER_DEBUG__)).toBe('undefined');
  await page.waitForTimeout(30000);
  const hardware = await page.evaluate(async () => {
    const canvas = document.querySelector('canvas');
    const webgpu = canvas !== null && canvas.getContext('webgpu') !== null;
    const adapter = await navigator.gpu?.requestAdapter({ powerPreference: 'high-performance' });
    return { webgpu, renderResolution: { width: canvas?.width, height: canvas?.height },
      rendererAllocation: { estimatedBytes: Number(canvas?.dataset.rendererBytes), textures: Number(canvas?.dataset.rendererTextures) },
      adapter: adapter ? { vendor: adapter.info.vendor, architecture: adapter.info.architecture,
      device: adapter.info.device, description: adapter.info.description } : null };
  });
  expect(hardware.webgpu).toBe(true);
  expect(hardware.adapter).not.toBeNull();
  expect(hardware.renderResolution).toEqual({ width: 1440, height: 900 });
  // An external observer measures presented rAF intervals without enabling any
  // application diagnostics or changing the production render loop.
  await page.evaluate(() => {
    const measurement: FrameMeasurement = { started: performance.now(), previous: 0, frames: [], stopped: false };
    window.__PERFORMANCE_MEASUREMENT__ = measurement;
    const observe = (timestamp: number) => {
      if (measurement.stopped) return;
      if (measurement.previous) measurement.frames.push(timestamp - measurement.previous);
      measurement.previous = timestamp;
      requestAnimationFrame(observe);
    };
    requestAnimationFrame(observe);
  });
  const samples = [];
  let exercise = true;
  const movement = mode === 'gameplay' ? (async () => {
    while (exercise) {
      // Repeated run cycles in the clear forecourt exercise fixed simulation,
      // collision, rig updates and camera follow without development commands.
      for (const keys of [['d', 's'], ['a', 'w']]) {
        if (!exercise) break;
        await page.keyboard.down('Shift'); for (const key of keys) await page.keyboard.down(key);
        await page.waitForTimeout(450);
        for (const key of keys) await page.keyboard.up(key); await page.keyboard.up('Shift');
        await page.waitForTimeout(100);
      }
    }
  })() : Promise.resolve();
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(30000);
    const sample = await page.evaluate(() => {
      const measurement = window.__PERFORMANCE_MEASUREMENT__!;
      const recent = measurement.frames.slice(-1800).sort((a, b) => a - b);
      return { elapsedSeconds: (performance.now() - measurement.started) / 1000, frames: measurement.frames.length,
        fps: 1000 * recent.length / recent.reduce((sum, value) => sum + value, 0),
        p95FrameMs: recent[Math.floor((recent.length - 1) * 0.95)]!, visible: document.visibilityState,
        estimatedRendererBytes: Number(document.querySelector('canvas')?.dataset.rendererBytes) };
    });
    samples.push(sample);
    console.log(`Measured ${sample.elapsedSeconds.toFixed(0)}s: ${sample.fps.toFixed(1)} FPS, p95 ${sample.p95FrameMs.toFixed(1)} ms`);
    await expect(page.locator('#app')).toHaveAttribute('data-state', 'running');
    expect(sample.visible).toBe('visible');
  }
  exercise = false; await movement;
  const metrics = await page.evaluate(() => {
    const measurement = window.__PERFORMANCE_MEASUREMENT__!; measurement.stopped = true;
    const frames = measurement.frames.sort((a, b) => a - b);
    return { durationSeconds: (performance.now() - measurement.started) / 1000, frameCount: frames.length,
      fps: 1000 * frames.length / frames.reduce((sum, value) => sum + value, 0),
      p95FrameMs: frames[Math.floor((frames.length - 1) * 0.95)]!, maxFrameMs: frames.at(-1)!,
      intervalsOver50Ms: frames.filter((value) => value > 50).length, intervalsOver100Ms: frames.filter((value) => value > 100).length };
  });
  const evidence = { date: new Date().toISOString(), browser: browser.version(), backend: 'WebGPU', build: 'production',
    mode, method: 'External requestAnimationFrame intervals with Chrome --disable-frame-rate-limit and --disable-gpu-vsync; application has no frame limiter. Includes CPU submission and scheduling, not isolated GPU timestamp queries.',
    renderingUncapped: true, gameplayExercise: mode === 'gameplay' ? 'Alternating 450 ms run cycles, fixed simulation and follow camera' : 'Looped idle skeletal animation', browserFlags: ['--disable-frame-rate-limit', '--disable-gpu-vsync'],
    viewport: { width: 1440, height: 900 }, quality: 'High', adaptiveResolution: false, warmupSeconds: 30,
    hardware, samples, metrics, errors, warnings };
  await mkdir('docs/qa', { recursive: true });
  await writeFile(`docs/qa/phase2/${mode}-performance.json`, JSON.stringify(evidence, null, 2));
  expect(errors).toEqual([]);
  expect(warnings.filter((message) => message.includes('Vertex attribute'))).toEqual([]);
  expect(metrics.durationSeconds).toBeGreaterThanOrEqual(600);
  expect(metrics.durationSeconds).toBeLessThan(630);
  expect(metrics.p95FrameMs).toBeLessThanOrEqual(mode === 'cinematic' ? 35 : 18.5);
});
