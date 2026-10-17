import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

/** Fresh browser context per run; never overwrites historical milestone evidence. */
for (let run = 1; run <= 3; run++) test(`cold mission loading ${run}`, async ({ page, browser }) => {
  test.skip(process.env.VESPER_PERFORMANCE !== '1', 'Opt-in uncapped production measurement.');
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/'); await expect(page.locator('#app')).toHaveAttribute('data-state', 'ready'); await page.locator('#start').click();
  await page.locator('#settings-open').click(); await page.locator('#quality').selectOption('High'); await page.locator('#adaptive').uncheck(); await page.locator('#resume').click();
  await expect(page.locator('#app')).toHaveAttribute('data-state', 'running');
  // CPU sampling is optional and kept separate from the comparable frame runs.
  const cdp = await page.context().newCDPSession(page);
  const profile = process.env.VESPER_LOADING_PROFILE === '1';
  if (profile) { await cdp.send('Profiler.enable'); await cdp.send('Profiler.start'); }
  await page.evaluate(() => {
    const m = { start: performance.now(), last: 0, frames: [] as number[], done: false }; window.__MISSION_LOAD__ = m;
    const frame = (t: number) => { if (m.done) return; if (m.last) m.frames.push(t - m.last); m.last = t; requestAnimationFrame(frame); }; requestAnimationFrame(frame);
  });
  await page.locator('#mission-start').click(); await expect(page.locator('#app')).toHaveAttribute('data-mission', 'introduction');
  const loading = await page.evaluate(() => {
    const m = window.__MISSION_LOAD__!; m.done = true; const f = m.frames.sort((a, b) => a - b), canvas = document.querySelector('canvas')!;
    return { seconds: (performance.now() - m.start) / 1000, frames: f.length, p95: f[Math.floor((f.length - 1) * .95)], max: f.at(-1), over50: f.filter(v => v > 50).length, over100: f.filter(v => v > 100).length, backend: canvas.dataset.backend, resolution: [canvas.width, canvas.height] };
  });
  const directory = process.env.VESPER_MISSION_QA ?? 'docs/qa/mission-reliability'; await mkdir(directory, { recursive: true });
  if (profile) await writeFile(`${directory}/loading-${run}.cpuprofile`, JSON.stringify((await cdp.send('Profiler.stop')).profile));
  await cdp.detach();
  await writeFile(`${directory}/loading-${run}.json`, JSON.stringify({ date: new Date().toISOString(), browser: browser.version(), quality: 'High', adaptive: false, uncapped: true, profile, method: 'External requestAnimationFrame intervals from clicking Start mission to committed introduction, fresh browser context; includes scheduling and CPU.', loading, errors }, null, 2));
  expect(errors).toEqual([]); expect(loading.backend).toBe('WebGPU'); expect(loading.resolution).toEqual([1440, 900]);
});
