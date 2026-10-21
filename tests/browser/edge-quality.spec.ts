import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { clickSceneTool, projectGround } from '../helpers/scene-menu';

test('edge smoothing persists, preserves resolution and releases render targets', async ({ page }, info) => {
  const mobile = info.project.name.endsWith('mobile');
  const backend = info.project.name.endsWith('webgpu') ? 'WebGPU' : 'WebGL2';
  if (backend === 'WebGL2') await page.addInitScript(() => Object.defineProperty(navigator, 'gpu', { value: undefined, configurable: true }));
  const errors: string[] = [], requests: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => requests.push(request.url()));
  await page.goto('/'); await expect(page.locator('#app')).toHaveAttribute('data-state', 'ready');
  await page.locator('#start').click();
  await page.locator('#settings-open').click();
  await expect(page.locator('#smooth-edges')).toBeChecked();
  await page.locator('#quality').selectOption(mobile ? 'Mobile' : 'High');
  await page.locator('#adaptive').uncheck(); await page.locator('#reduced-motion').check();
  if (mobile) { await page.locator('#left-handed').check(); await page.locator('#ui-scale').fill('1.4'); }
  await page.locator('#resume').click();
  const folder = `docs/qa/edge-quality/${info.project.name}`;
  await mkdir(folder, { recursive: true });
  const samples = [];
  for (let cycle = 0; cycle < 3; cycle++) for (const enabled of [false, true]) {
    await page.locator('#settings-open').click(); await page.locator('#smooth-edges').setChecked(enabled); await page.locator('#resume').click();
    await page.waitForTimeout(1500);
    const sample = await page.evaluate(() => {
      const c = document.querySelector('canvas')!;
      return { backend: c.dataset.backend, width: c.width, height: c.height, textures: Number(c.dataset.rendererTextures), bytes: Number(c.dataset.rendererBytes) };
    });
    expect(sample.backend).toBe(backend); expect(sample.width).toBe(mobile ? 915 : 1440); expect(sample.height).toBe(mobile ? 412 : 900);
    samples.push({ cycle, enabled, ...sample });
    if (cycle === 0) await page.screenshot({ path: `${folder}/court-${enabled ? 'smooth' : 'off'}.png` });
    const first = samples.find(value => value.enabled === enabled)!;
    expect(sample.textures).toBeLessThanOrEqual(first.textures);
    expect(sample.bytes).toBeLessThanOrEqual(first.bytes * 1.01);
  }
  if (!mobile) {
    for (let cycle = 0; cycle < 2; cycle++) {
      await clickSceneTool(page, '#inspection-toggle'); await expect(page.locator('#app')).toHaveAttribute('data-inspection', 'active');
      await page.locator('#inspection-view').selectOption('portrait'); await page.waitForTimeout(500);
      if (cycle === 0) await page.screenshot({ path: `${folder}/portrait-smooth.png` });
      await page.locator('#settings-open').click(); await page.locator('#smooth-edges').uncheck(); await page.locator('#resume').click();
      await page.waitForTimeout(500);
      if (cycle === 0) await page.screenshot({ path: `${folder}/portrait-off.png` });
      await page.locator('#settings-open').click(); await page.locator('#smooth-edges').check(); await page.locator('#resume').click();
      await clickSceneTool(page, '#inspection-toggle'); await expect(page.locator('#app')).toHaveAttribute('data-inspection', 'courtyard');
    }
    for (const quality of ['Low', 'Ultra', 'High']) {
      await page.locator('#settings-open').click(); await page.locator('#quality').selectOption(quality); await page.locator('#resume').click();
      await expect(page.locator('#app')).toHaveAttribute('data-state', 'running'); await page.waitForTimeout(1500);
    }
    const last = await page.evaluate(() => { const c = document.querySelector('canvas')!; return { textures: Number(c.dataset.rendererTextures), bytes: Number(c.dataset.rendererBytes) }; });
    expect(last.textures).toBeLessThanOrEqual(samples[1]!.textures + 2);
    expect(last.bytes).toBeLessThanOrEqual(samples[1]!.bytes * 1.03);
  } else {
    expect(requests.some(url => url.includes('/cinematic/'))).toBe(false);
    await page.setViewportSize({ width: 412, height: 915 });
    await expect(page.locator('#app')).toHaveAttribute('data-state', 'paused');
    await page.setViewportSize({ width: 915, height: 412 });
  }
  await page.locator('#settings-open').click(); await page.locator('#smooth-edges').uncheck(); await page.reload();
  await expect(page.locator('#app')).toHaveAttribute('data-state', 'ready'); await page.locator('#start').click();
  await page.locator('#settings-open').click(); await expect(page.locator('#smooth-edges')).not.toBeChecked();
  expect(errors).toEqual([]);
  await writeFile(`${folder}/lifecycle.json`, JSON.stringify({ samples, errors }, null, 2));
});

test('floating labels remain screen-resolution UI and release with their scene', async ({ page }, info) => {
  const mobile = info.project.name.endsWith('mobile');
  if (!info.project.name.endsWith('webgpu')) await page.addInitScript(() => Object.defineProperty(navigator, 'gpu', { value: undefined, configurable: true }));
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/'); await expect(page.locator('#app')).toHaveAttribute('data-state', 'ready'); await page.locator('#start').click();
  if (mobile) { await page.locator('#settings-open').click(); await page.locator('#left-handed').check(); await page.locator('#ui-scale').fill('1.4'); await page.locator('#resume').click(); }
  await expect(page.locator('.world-label-layer')).toHaveCount(1);
  await expect(page.locator('.world-label')).toHaveCount(4);
  // A stable HUD must not replace its text nodes on every render frame.
  await expect(page.locator('#mission-title')).not.toBeEmpty();
  const stableTextWrites = await page.evaluate(() => new Promise<number>(resolve => {
    let writes = 0, frames = 0;
    const observer = new MutationObserver(records => { writes += records.length; });
    for (const selector of ['#health-value', '#pressure-value', '#equipped-weapon', '#mission-title']) observer.observe(document.querySelector(selector)!, { childList: true, characterData: true, subtree: true });
    const tick = () => { if (++frames < 30) requestAnimationFrame(tick); else { observer.disconnect(); resolve(writes); } };
    requestAnimationFrame(tick);
  }));
  expect(stableTextWrites).toBe(0);
  const folder = `docs/qa/edge-quality/labels-${info.project.name}`; await mkdir(folder, { recursive: true });
  const observations = [];
  for (let cycle = 0; cycle < 2; cycle++) {
    await clickSceneTool(page, '#encounter-start'); await expect(page.locator('#app')).toHaveAttribute('data-encounter', 'active');
    const label = page.locator('.world-label[data-kind=enemy]:visible');
    await expect(label).toHaveCount(1); await expect(label.locator('.world-label-detail')).toHaveText('HP 120/120 · POSTURE 0');
    await expect(page.locator('.world-label[data-kind=training]:visible')).toHaveCount(0);
    await expect(page.locator('.world-label')).toHaveCount(7);
    for (const enabled of cycle === 0 ? [false, true] : [true]) {
      await page.locator('#settings-open').click(); await page.locator('#smooth-edges').setChecked(enabled); await page.locator('#resume').click();
      await page.waitForTimeout(100);
      const appearance = await label.evaluate(element => {
        const css = getComputedStyle(element), detail = getComputedStyle(element.querySelector('.world-label-detail')!);
        const bounds = element.getBoundingClientRect();
        return { width: bounds.width, fontSize: detail.fontSize, pointerEvents: css.pointerEvents, text: element.textContent };
      });
      observations.push({ enabled, ...appearance });
      expect(appearance.width).toBeCloseTo(mobile ? 266 : 190, 0);
      expect(parseFloat(appearance.fontSize)).toBeCloseTo(mobile ? 15.4 : 11, 1);
      expect(appearance.pointerEvents).toBe('none');
      if (cycle === 0) { await page.screenshot({ path: `${folder}/encounter-${enabled ? 'smooth' : 'off'}.png` }); await label.screenshot({ path: `${folder}/text-${enabled ? 'smooth' : 'off'}.png` }); }
    }
    // Freeze motion before separate observations of camera, enemy and DOM bounds.
    // Otherwise the enemy can move between Playwright round trips.
    await page.locator('#settings-open').click();
    await expect(page.locator('#app')).toHaveAttribute('data-state', 'paused');
    const position = await page.evaluate(() => { const roster = JSON.parse(document.querySelector('canvas')!.dataset.enemyRoster!) as {x: number; z: number}[]; return roster[0]!; });
    const projected = await projectGround(page, { x: position.x, y: 2.585, z: position.z });
    const bounds = (await label.boundingBox())!;
    expect(Math.abs(bounds.x + bounds.width / 2 - projected.x)).toBeLessThan(10);
    expect(Math.abs(bounds.y + bounds.height - projected.y)).toBeLessThan(10);
    await page.locator('#resume').click();
    if (!mobile && cycle === 0) {
      await clickSceneTool(page, '#inspection-toggle'); await expect(page.locator('#app')).toHaveAttribute('data-inspection', 'active');
      await expect(page.locator('.world-label:visible')).toHaveCount(0);
      await clickSceneTool(page, '#inspection-toggle'); await expect(page.locator('#app')).toHaveAttribute('data-inspection', 'courtyard');
      await page.locator('#settings-open').click(); await page.locator('#quality').selectOption('Low'); await expect(page.locator('#quality')).toBeEnabled(); await page.locator('#resume').click();
      await expect(page.locator('.world-label-layer')).toHaveCount(1); await expect(page.locator('.world-label')).toHaveCount(7);
      expect(await label.evaluate(element => getComputedStyle(element.querySelector('.world-label-detail')!).fontSize)).toBe('11px');
    }
    await clickSceneTool(page, '#encounter-return'); await expect(page.locator('#app')).toHaveAttribute('data-encounter', 'training');
    await expect(page.locator('.world-label')).toHaveCount(4); await expect(page.locator('.world-label[data-kind=enemy]')).toHaveCount(0);
  }
  expect(errors).toEqual([]); await writeFile(`${folder}/observations.json`, JSON.stringify({ observations, errors }, null, 2));
});
