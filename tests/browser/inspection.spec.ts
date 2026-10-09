import { expect, test } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

for (const backend of ['webgpu-required', 'webgl2']) test(`${backend}: inspection views, pause and repeated disposal`, async ({ page }) => {
  test.setTimeout(240000);
  const errors: string[] = []; const requests: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message)); page.on('request', (request) => requests.push(request.url()));
  await page.goto(`/?backend=${backend}`); await expect(page.locator('#app')).toHaveAttribute('data-state', 'ready');
  await page.getByRole('button', { name: 'ENTER THE WORKS' }).click(); await page.waitForTimeout(700);
  const baseline = await page.evaluate(() => window.__VESPER_DEBUG__!.snapshot());
  expect(requests.some((url) => url.includes('/cinematic/'))).toBe(false);
  const cycles = []; await mkdir('docs/qa/medic/browser', { recursive: true });
  for (let cycle = 0; cycle < 4; cycle++) {
    await page.locator('#inspection-toggle').click(); await expect(page.locator('#app')).toHaveAttribute('data-inspection', 'active');
    const loaded = await page.evaluate(() => window.__VESPER_DEBUG__!.snapshot());
    expect(loaded.references).toBe(7); expect(loaded.variant).toBe('desktop'); expect(loaded.characterTier).toBe('cinematic');
    if (cycle === 0) {
      for (const view of ['full-body', 'portrait', 'equipment']) {
        await page.locator('#inspection-view').selectOption(view); await page.waitForTimeout(400);
        await page.screenshot({ path: `docs/qa/phase4a/regressions/browser/${backend}-${view}.png` });
      }
      await page.locator('#inspection-lighting').selectOption('ash-quay'); await page.waitForTimeout(200);
      await page.screenshot({ path: `docs/qa/phase4a/regressions/browser/${backend}-ash-quay.png` });
      await page.locator('#inspection-view').selectOption('full-body');
      await page.locator('#inspection-lighting').selectOption('neutral');
      await page.locator('#animation-pause').click();
      const still = await page.evaluate(() => window.__VESPER_DEBUG__!.snapshot().rig); await page.waitForTimeout(250);
      expect(await page.evaluate(() => window.__VESPER_DEBUG__!.snapshot().rig)).toEqual(still);
      await page.locator('#animation-pause').click();
      await expect(page.locator('#animation option')).toHaveText(['Static pose', 'Idle_Loop', 'Walk_Loop', 'Jog_Fwd_Loop', 'Punch_Jab', 'Punch_Cross', 'Spell_Simple_Shoot', 'Roll', 'Hit_Chest', 'Death01']);
      expect(await page.evaluate(() => window.__VESPER_DEBUG__!.snapshot().animation)).toBe('Idle_Loop');
      await page.locator('#inspection-view').selectOption('full-body');
      for (const [angle, turns] of [['front', 0], ['three-quarter', 1], ['profile', 1], ['back', 2]] as const) {
        for (let turn = 0; turn < turns; turn++) await page.locator('#turn-character').click();
        await page.waitForTimeout(200); await page.screenshot({ path: `docs/qa/phase4a/regressions/browser/${backend}-${angle}.png` });
      }
      await page.mouse.move(600, 400); await page.mouse.down(); await page.mouse.move(850, 440, { steps: 12 }); await page.mouse.up();
      await page.mouse.wheel(0, -150); await page.waitForTimeout(250);
      await page.screenshot({ path: `docs/qa/phase4a/regressions/browser/${backend}-orbit.png` });
    }
    await page.locator('#inspection-toggle').click(); await expect(page.locator('#app')).toHaveAttribute('data-inspection', 'courtyard');
    await page.waitForTimeout(400); const after = await page.evaluate(() => window.__VESPER_DEBUG__!.snapshot()); cycles.push(after);
    expect(after.references).toBe(4); expect(after.resources).toBe(baseline.resources); expect(after.listeners).toBe(baseline.listeners);
    expect(after.textures).toBeLessThanOrEqual(baseline.textures + 2);
    expect(after.estimatedGpuBytes).toBeLessThanOrEqual(baseline.estimatedGpuBytes * 1.03);
  }
  expect(errors).toEqual([]); await writeFile(`docs/qa/phase4a/regressions/inspection-${backend}.json`, JSON.stringify({ baseline, cycles, errors }, null, 2));
});

test('source PNG and compressed KTX2 material renders have paired inspection evidence', async ({ page }) => {
  test.setTimeout(180000);
  const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?backend=webgpu-required'); await expect(page.locator('#app')).toHaveAttribute('data-state', 'ready');
  await page.getByRole('button', { name: 'ENTER THE WORKS' }).click();
  for (const mode of ['compressed', 'source']) {
    if (mode === 'source') {
      // Serve the uncompressed export to compare the original texture pixels.
      await page.route('**/showcase/cinematic/character.glb', (route) => route.fulfill({ status: 302,
        headers: { location: '/art/source/medic/character.glb' } }));
    }
    await page.locator('#inspection-toggle').click(); await expect(page.locator('#app')).toHaveAttribute('data-inspection', 'active');
    await page.locator('#animation-pause').click();
    for (const view of ['full-body', 'portrait', 'equipment']) {
      await page.locator('#inspection-view').selectOption(view); await page.waitForTimeout(150);
      await page.screenshot({ path: `docs/qa/phase4a/regressions/browser/materials-${mode}-${view}.png` });
    }
    await page.locator('#inspection-toggle').click();
    await expect(page.locator('#app')).toHaveAttribute('data-inspection', 'courtyard');
    expect(await page.evaluate(() => window.__VESPER_DEBUG__!.snapshot().references)).toBe(4);
  }
  expect(errors).toEqual([]);
});

test('mobile landscape uses only mobile assets and supports touch character views', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 915, height: 412 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
  try {
    const page = await context.newPage(); const requests: string[] = []; const errors: string[] = [];
    page.on('request', (request) => requests.push(request.url())); page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/?backend=webgl2'); await expect(page.locator('#app')).toHaveAttribute('data-state', 'ready');
    await page.locator('#start').tap(); await expect(page.locator('#inspection-toggle')).toBeHidden();
    await page.screenshot({ path: 'docs/qa/phase4a/regressions/browser/mobile-landscape.png' });
    await page.getByRole('button', { name: 'Medic', exact: true }).tap(); await page.waitForTimeout(300);
    await page.getByRole('button', { name: 'Turn Medic' }).tap();
    await page.screenshot({ path: 'docs/qa/phase4a/regressions/browser/mobile-character.png' });
    expect(requests.some((url) => /showcase\/(desktop|cinematic)\//.test(url))).toBe(false);
    expect(await page.evaluate(() => window.__VESPER_DEBUG__!.snapshot().variant)).toBe('mobile');
    await expect(page.locator('#animation option')).toHaveText(['Static pose', 'Idle_Loop', 'Walk_Loop', 'Jog_Fwd_Loop', 'Punch_Jab', 'Punch_Cross', 'Spell_Simple_Shoot', 'Roll', 'Hit_Chest', 'Death01']); expect(errors).toEqual([]);
    await writeFile('docs/qa/phase4a/regressions/mobile-requests.json', JSON.stringify({ requests, errors }, null, 2));
  } finally { await context.close(); }
});

test('failed and cancelled inspection retains courtyard; rapid requests and quality swaps recover', async ({ page }) => {
  test.setTimeout(180000);
  const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?backend=webgl2'); await expect(page.locator('#app')).toHaveAttribute('data-state', 'ready');
  await page.getByRole('button', { name: 'ENTER THE WORKS' }).click();
  await page.route('**/cinematic/character.glb', (route) => route.fulfill({ status: 503, body: 'unavailable' }));
  await page.locator('#inspection-toggle').click(); await expect(page.locator('#app')).toHaveAttribute('data-inspection', 'failed');
  await expect(page.locator('#app')).toHaveAttribute('data-state', 'running');
  expect(await page.evaluate(() => window.__VESPER_DEBUG__!.snapshot().references)).toBe(4);
  await page.unroute('**/cinematic/character.glb');
  let release = () => {}; const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/cinematic/character.glb', async (route) => { await gate; await route.continue().catch(() => {}); });
  await page.locator('#inspection-toggle').click(); await expect(page.locator('#app')).toHaveAttribute('data-inspection', 'loading');
  await page.locator('#inspection-toggle').click(); await expect(page.locator('#app')).toHaveAttribute('data-inspection', 'courtyard');
  release(); await page.unroute('**/cinematic/character.glb'); await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__VESPER_DEBUG__!.snapshot().references)).toBe(4);
  await page.locator('#inspection-toggle').click(); await page.locator('#inspection-toggle').click();
  await page.locator('#inspection-toggle').click(); await expect(page.locator('#app')).toHaveAttribute('data-inspection', 'active');
  await page.getByRole('button', { name: 'Open settings' }).click(); await page.locator('#quality').selectOption('Low');
  await expect(page.locator('#quality')).toBeEnabled(); await expect(page.locator('#app')).toHaveAttribute('data-inspection', 'courtyard');
  await expect(page.locator('#inspection-toggle')).toBeHidden();
  expect(await page.evaluate(() => window.__VESPER_DEBUG__!.snapshot().references)).toBe(4);
  await page.locator('#quality').selectOption('High'); await expect(page.locator('#quality')).toBeEnabled();
  await page.getByRole('button', { name: 'RETURN TO THE WORKS' }).click(); await expect(page.locator('#inspection-toggle')).toBeVisible();
  expect(errors).toEqual([]);
});

test('nine licensed clips deform Medic in the studio and transition without binding errors', async ({ page }) => {
  test.setTimeout(120000);
  const errors: string[] = []; const warnings: string[] = [];
  page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'warning') warnings.push(m.text()); });
  await page.goto('/?backend=webgpu-required'); await expect(page.locator('#app')).toHaveAttribute('data-state', 'ready');
  await page.locator('#start').click(); await page.locator('#inspection-toggle').click();
  await expect(page.locator('#app')).toHaveAttribute('data-inspection', 'active');
  const clips = ['Idle_Loop', 'Walk_Loop', 'Jog_Fwd_Loop', 'Punch_Jab', 'Punch_Cross', 'Spell_Simple_Shoot', 'Roll', 'Hit_Chest', 'Death01']; const poses = [];
  for (const name of clips) {
    await page.locator('#animation').selectOption(`clip:${name}`); await page.waitForTimeout(name === 'Hit_Chest' ? 120 : 250);
    await page.locator('#animation-pause').click();
    const pose = await page.evaluate(() => window.__VESPER_DEBUG__!.snapshot()); poses.push(pose);
    expect(pose.animation).toBe(name); expect(pose.rig?.feet.flat().every(Number.isFinite)).toBe(true);
    await page.screenshot({ path: `docs/qa/phase4a/regressions/browser/clip-${name}.png` });
    await page.locator('#animation-pause').click();
  }
  await page.locator('#animation').selectOption('pose'); await expect.poll(() => page.evaluate(() => window.__VESPER_DEBUG__!.snapshot().animation)).toBe('static-pose');
  expect(warnings.filter(w => /PropertyBinding|No target|Vertex attribute/.test(w))).toEqual([]); expect(errors).toEqual([]);
  await writeFile('docs/qa/phase4a/regressions/animation-browser.json', JSON.stringify({ poses, errors, warnings }, null, 2));
});
