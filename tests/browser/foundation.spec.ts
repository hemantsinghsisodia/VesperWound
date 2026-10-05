import { expect, test } from '@playwright/test';

for (const positioning of ['legacy', 'unavailable'] as const) {
  test(`entry stays playable with ${positioning} spatial audio positioning`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript((mode) => {
      // Reproduce browsers without AudioListener AudioParams, independently of the GPU backend.
      const calls: number[][] = [];
      Object.assign(window, { __LEGACY_AUDIO_POSITIONS__: calls });
      for (const prototype of [AudioListener.prototype, PannerNode.prototype]) {
        for (const name of ['positionX', 'positionY', 'positionZ']) {
          Object.defineProperty(prototype, name, { configurable: true, get: () => undefined });
        }
        const original = prototype.setPosition;
        Object.defineProperty(prototype, 'setPosition', { configurable: true, value: mode === 'legacy' ? function (this: AudioListener | PannerNode, x: number, y: number, z: number) {
          calls.push([x, y, z]); original.call(this, x, y, z);
        } : undefined });
      }
    }, positioning);
    await page.goto('/?backend=webgl2');
    await expect(page.locator('#app')).toHaveAttribute('data-state', 'ready');
    await page.getByRole('button', { name: 'ENTER THE WORKS' }).click();
    await expect.poll(async () => page.evaluate(() => window.__VESPER_DEBUG__?.snapshot().audioState)).toBe('running');
    await expect.poll(async () => page.evaluate(() => window.__VESPER_DEBUG__?.snapshot().voices)).toBe(3);
    if (positioning === 'legacy') {
      for (const expected of [[0, 2, -3], [0, 0, 5]]) {
        await expect.poll(async () => page.evaluate(() => (window as Window & { __LEGACY_AUDIO_POSITIONS__?: number[][] }).__LEGACY_AUDIO_POSITIONS__ ?? [])).toContainEqual(expected);
      }
    }
    await page.waitForTimeout(250);
    await expect(page.locator('#app')).toHaveAttribute('data-state', 'running');
    expect(errors).toEqual([]);
  });
}

test('courtyard initializes on WebGL2 with compressed assets and renders', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?backend=webgl2');
  await expect(page.locator('#app')).toHaveAttribute('data-state', 'ready');
  await page.getByRole('button', { name: 'ENTER THE WORKS' }).click();
  await expect(page.locator('#app')).toHaveAttribute('data-state', 'running');
  await expect.poll(async () => page.evaluate(() => window.__VESPER_DEBUG__?.snapshot().triangles ?? 0)).toBeGreaterThan(1000);
  const stats = await page.evaluate(() => window.__VESPER_DEBUG__?.snapshot());
  expect(stats?.backend).toBe('WebGL2'); expect(stats?.references).toBe(3); expect(stats?.textures).toBeGreaterThan(2);
  expect(errors).toEqual([]);
  await page.screenshot({ path: `test-results/courtyard-${test.info().project.name}.png` });
});

test('settings pause, persist, and resume without duplicating audio', async ({ page }) => {
  await page.goto('/?backend=webgl2');
  await expect(page.locator('#app')).toHaveAttribute('data-state', 'ready');
  await page.getByRole('button', { name: 'ENTER THE WORKS' }).click();
  await page.getByRole('button', { name: 'Open settings' }).click();
  await expect(page.locator('#app')).toHaveAttribute('data-state', 'paused');
  await page.locator('#quality').selectOption('Low');
  await page.locator('#reduced-motion').check();
  await page.getByRole('button', { name: 'RETURN TO THE WORKS' }).click();
  await expect(page.locator('#app')).toHaveAttribute('data-state', 'running');
  const voices = await page.evaluate(() => window.__VESPER_DEBUG__?.snapshot().voices);
  expect(voices).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Open settings' }).click();
  await page.getByRole('button', { name: 'RETURN TO THE WORKS' }).click();
  expect(await page.evaluate(() => window.__VESPER_DEBUG__?.snapshot().voices)).toBe(voices);
  await page.reload();
  await expect(page.locator('#app')).toHaveAttribute('data-state', 'ready');
  await expect(page.locator('#quality')).toHaveValue('Low'); await expect(page.locator('#reduced-motion')).toBeChecked();
});

test('ten fixture cycles keep asset references and owned resources stable', async ({ page }) => {
  test.skip(test.info().project.name !== 'desktop', 'Run lifecycle soak once.');
  await page.goto('/?backend=webgl2');
  await expect(page.locator('#app')).toHaveAttribute('data-state', 'ready');
  const before = await page.evaluate(() => window.__VESPER_DEBUG__?.snapshot());
  const snapshots = await page.evaluate(async () => {
    const debug = window.__VESPER_DEBUG__;
    if (!debug) throw new Error('Development diagnostics are unavailable.');
    const values = [];
    for (let i = 0; i < 10; i++) { await debug.reloadFixture(); values.push(debug.snapshot()); }
    return values;
  });
  for (const stats of snapshots) {
    expect(stats.references).toBe(3); expect(stats.resources).toBe(before?.resources);
    expect(stats.listeners).toBe(before?.listeners);
    expect(stats.textures).toBeLessThanOrEqual((before?.textures ?? 0) + 2);
  }
  expect(snapshots.at(-1)?.fixtureLoads).toBe(11);
});

test('movement cancels on blur and resumes after closing settings', async ({ page }) => {
  test.skip(test.info().project.name !== 'desktop', 'Keyboard case.');
  await page.goto('/?backend=webgl2');
  await expect(page.locator('#app')).toHaveAttribute('data-state', 'ready');
  await page.getByRole('button', { name: 'ENTER THE WORKS' }).click();
  const initial = await page.evaluate(() => window.__VESPER_DEBUG__?.snapshot().markerX ?? 0);
  await page.keyboard.down('d');
  await expect.poll(async () => page.evaluate(() => window.__VESPER_DEBUG__?.snapshot().markerX ?? 0)).toBeGreaterThan(initial + 0.1);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await page.keyboard.up('d');
  const stopped = await page.evaluate(() => window.__VESPER_DEBUG__?.snapshot().markerX ?? 0);
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => window.__VESPER_DEBUG__?.snapshot().markerX)).toBeCloseTo(stopped);
  await page.getByRole('button', { name: 'Open settings' }).click();
  await page.getByRole('button', { name: 'RETURN TO THE WORKS' }).click();
  await expect(page.locator('#app')).toHaveAttribute('data-state', 'running');
  await expect(page.locator('#world')).toBeFocused();
  await page.keyboard.down('a');
  await expect.poll(async () => page.evaluate(() => window.__VESPER_DEBUG__?.snapshot().markerX ?? 0)).toBeLessThan(stopped - 0.1);
  await page.keyboard.up('a');
});

test('simultaneous touch inputs release on pointer cancellation', async ({ page }) => {
  test.skip(test.info().project.name !== 'mobile', 'Touch-input case.');
  await page.goto('/?backend=webgl2');
  await expect(page.locator('#app')).toHaveAttribute('data-state', 'ready');
  await page.getByRole('button', { name: 'ENTER THE WORKS' }).click();
  await page.evaluate(() => {
    const stick = document.querySelector<HTMLElement>('#movement-stick');
    const pulse = document.querySelector<HTMLButtonElement>('#pulse');
    if (!stick || !pulse) throw new Error('Touch controls missing');
    // Synthetic test pointers do not acquire browser pointer capture.
    stick.setPointerCapture = () => {}; pulse.setPointerCapture = () => {};
    const bounds = stick.getBoundingClientRect();
    stick.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 101, pointerType: 'touch', clientX: bounds.x + bounds.width, clientY: bounds.y + bounds.height / 2, bubbles: true }));
    pulse.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 102, pointerType: 'touch', bubbles: true }));
  });
  await expect.poll(async () => page.evaluate(() => window.__VESPER_DEBUG__?.snapshot().markerX ?? 0)).toBeGreaterThan(0.1);
  await page.evaluate(() => {
    window.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 101, pointerType: 'touch' }));
    window.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 102, pointerType: 'touch' }));
  });
  const stopped = await page.evaluate(() => window.__VESPER_DEBUG__?.snapshot().markerX);
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => window.__VESPER_DEBUG__?.snapshot().markerX)).toBeCloseTo(stopped ?? 0);
  expect(await page.locator('#movement-stick').evaluate((element) => (element as HTMLElement).style.getPropertyValue('--stick-x'))).toBe('0px');
});

test('missing content displays an actionable error', async ({ page }) => {
  await page.route('**/assets/fixtures/vessel.glb', (route) => route.fulfill({ status: 404, body: 'not found' }));
  await page.goto('/?backend=webgl2');
  await expect(page.locator('#app')).toHaveAttribute('data-state', 'error');
  await expect(page.locator('#error-detail')).toContainText('vessel');
  await expect(page.locator('#error-detail')).toContainText('404');
  await expect(page.getByRole('button', { name: 'TRY AGAIN' })).toBeVisible();
  await page.unroute('**/assets/fixtures/vessel.glb');
  await page.getByRole('button', { name: 'TRY AGAIN' }).click();
  await expect(page.locator('#app')).toHaveAttribute('data-state', 'ready');
});

test('all quality presets render without changing the fixture', async ({ page }) => {
  test.skip(test.info().project.name !== 'desktop', 'Shared graphics settings case.');
  await page.goto('/?backend=webgl2');
  await expect(page.locator('#app')).toHaveAttribute('data-state', 'ready');
  await page.getByRole('button', { name: 'ENTER THE WORKS' }).click();
  await page.getByRole('button', { name: 'Open settings' }).click();
  for (const quality of ['Mobile', 'Low', 'Medium', 'High', 'Ultra']) {
    await page.locator('#quality').selectOption(quality);
    await expect.poll(async () => page.evaluate(() => window.__VESPER_DEBUG__?.snapshot().triangles ?? 0)).toBeGreaterThan(1000);
    const stats = await page.evaluate(() => window.__VESPER_DEBUG__?.snapshot());
    expect(stats?.quality).toBe(quality); expect(stats?.references).toBe(3);
  }
});

test('unavailable device storage does not prevent entering the courtyard', async ({ page }) => {
  test.skip(test.info().project.name !== 'desktop', 'Shared storage case.');
  await page.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('Storage disabled'); } }); });
  await page.goto('/?backend=webgl2');
  await expect(page.locator('#app')).toHaveAttribute('data-state', 'ready');
  await page.getByRole('button', { name: 'ENTER THE WORKS' }).click();
  await page.getByRole('button', { name: 'Open settings' }).click();
  await expect(page.locator('#storage-status')).toContainText('unavailable');
});

test('required WebGPU cannot silently accept fallback', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(navigator, 'gpu', { value: undefined, configurable: true }); });
  await page.goto('/?backend=webgpu-required');
  await expect(page.locator('#app')).toHaveAttribute('data-state', 'error');
  await expect(page.locator('#error-detail')).toContainText('WebGPU was required');
  await page.getByRole('button', { name: 'Use compatibility graphics' }).click();
  await expect(page.locator('#app')).toHaveAttribute('data-state', 'ready');
  expect(await page.evaluate(() => window.__VESPER_DEBUG__?.snapshot().backend)).toBe('WebGL2');
});

test('phone portrait pauses and landscape restores the viewport', async ({ page }) => {
  test.skip(test.info().project.name !== 'mobile', 'Touch-layout case.');
  await page.goto('/?backend=webgl2');
  await expect(page.locator('#app')).toHaveAttribute('data-state', 'ready');
  await page.getByRole('button', { name: 'ENTER THE WORKS' }).click();
  await expect(page.locator('#movement-stick')).toBeVisible();
  await page.setViewportSize({ width: 412, height: 915 });
  await expect(page.locator('#rotate')).toBeVisible();
  await expect(page.locator('#app')).toHaveAttribute('data-state', 'paused');
  await page.setViewportSize({ width: 915, height: 412 });
  await expect(page.locator('#rotate')).toBeHidden();
  await expect(page.locator('#app')).toHaveAttribute('data-state', 'running');
});
