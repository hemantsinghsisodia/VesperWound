import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { walkTo } from '../helpers/district-driver';
declare global { interface Window { __DISTRICT_TRACE__?: { frames: number[]; running: boolean; previous: number } } }

test('district loading CPU trace', async ({ page }) => {
  test.skip(process.env.VESPER_TRACE !== '1', 'Opt-in diagnostic; separate from acceptance measurements.');
  await page.goto('/'); await expect(page.locator('#app')).toHaveAttribute('data-state', 'ready'); await page.locator('#start').click();
  await page.locator('#settings-open').click(); await page.locator('#adaptive').uncheck(); await page.locator('#resume').click();
  const session = await page.context().newCDPSession(page);
  const profiling = process.env.VESPER_TRACE_PROFILE !== '0';
  if (profiling) {
    await session.send('Profiler.enable'); await session.send('Profiler.start');
    await session.send('Tracing.start', { categories: 'devtools.timeline,v8,blink.user_timing', transferMode: 'ReturnAsStream' });
  }
  const cycles = [];
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => {
      const m = { frames: [] as number[], running: true, previous: 0 }; window.__DISTRICT_TRACE__ = m;
      const frame = (t: number) => { if (!m.running) return; if (m.previous) m.frames.push(t - m.previous); m.previous = t; requestAnimationFrame(frame); }; requestAnimationFrame(frame);
    });
    await walkTo(page, { x: 0, z: 6.8 }); await expect(page.locator('#app')).toHaveAttribute('data-district', 'ready');
    await walkTo(page, { x: 0, z: 18 }); await walkTo(page, { x: 0, z: 1 });
    cycles.push(await page.evaluate(() => { const m = window.__DISTRICT_TRACE__!; m.running = false; const f = m.frames.sort((a,b) => a-b); return { frames: f.length, p95: f[Math.floor(f.length*.95)], max: f.at(-1), over50: f.filter(v => v > 50).length, over100: f.filter(v => v > 100).length }; }));
  }
  const label = process.env.VESPER_TRACE_LABEL ?? 'baseline';
  await mkdir('.cache/district-traces', { recursive: true });
  await writeFile(`.cache/district-traces/${label}-frames.json`, JSON.stringify(cycles, null, 2));
  if (!profiling) { await session.detach(); return; }
  const { profile } = await session.send('Profiler.stop');
  const complete = new Promise<string>(resolve => session.once('Tracing.tracingComplete', event => resolve(event.stream!)));
  await session.send('Tracing.end'); const handle = await complete;
  let trace = '';
  for (;;) { const part = await session.send('IO.read', { handle }); trace += part.data; if (part.eof) break; }
  await session.send('IO.close', { handle }); await session.detach();
  await writeFile(`.cache/district-traces/${label}.json`, trace);
  await writeFile(`.cache/district-traces/${label}.cpuprofile`, JSON.stringify(profile));
});
