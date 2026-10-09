import { expect, test } from '@playwright/test';
import { exerciseEncounter, type ExerciseTotals } from '../helpers/encounter-driver';

test('production ignores development flags and excludes diagnostics', async ({ page }) => {
  const errors: string[] = [];
  const requests: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => requests.push(request.url()));
  await page.addInitScript(() => { Object.defineProperty(navigator, 'gpu', { value: undefined, configurable: true }); });
  await page.goto('/?backend=webgpu-required&fixture=missing&scene=foundation');
  await expect(page.locator('#app')).toHaveAttribute('data-state', 'ready');
  await page.getByRole('button', { name: 'ENTER THE WORKS' }).click();
  await expect(page.locator('#app')).toHaveAttribute('data-state', 'running');
  await page.keyboard.press('F3');
  expect(await page.evaluate(() => window.__VESPER_DEBUG__)).toBeUndefined();
  await expect(page.locator('.debug-panel, .debug-toggle')).toHaveCount(0);
  expect(requests.some((url) => url.includes('debug-tools'))).toBe(false);
  expect(requests.some((url) => url.endsWith('/assets/showcase/desktop/character.glb'))).toBe(true);
  expect(requests.some((url) => url.includes('/assets/fixtures/'))).toBe(false);
  await expect(page.getByRole('region', { name: 'Visual showcase' })).toBeVisible();
  expect(errors).toEqual([]);
});
test('production loads the enemy only on selection and completes a real encounter',async({page})=>{
  const requests:string[]=[],errors:string[]=[];page.on('request',r=>requests.push(r.url()));page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');await expect(page.locator('#app')).toHaveAttribute('data-state','ready');await page.locator('#start').click();
  expect(requests.some(r=>r.includes('/encounter/'))).toBe(false);
  await page.locator('#encounter-start').click();await expect(page.locator('#app')).toHaveAttribute('data-encounter','active');
  expect(requests.some(r=>r.includes('/encounter/desktop/zombie7.glb'))).toBe(true);expect(requests.some(r=>r.includes('/encounter/mobile/'))).toBe(false);
  const totals:ExerciseTotals={encounters:0,victories:0,hits:0,criticals:0,blocks:0,strikes:0};let running=true;
  const driver=exerciseEncounter(page,()=>running,totals);await expect.poll(()=>totals.victories,{timeout:60000,intervals:[100]}).toBeGreaterThan(0);running=false;await driver;
  await page.locator('#encounter-return').click();await expect(page.locator('#app')).toHaveAttribute('data-encounter','training');expect(await page.evaluate(()=>typeof window.__VESPER_DEBUG__)).toBe('undefined');expect(errors).toEqual([]);
});

test('production requests armed clips only on pickup and retains the baton through encounter and inspection',async({page})=>{
  const requests:string[]=[],errors:string[]=[];page.on('request',r=>requests.push(r.url()));page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');await expect(page.locator('#app')).toHaveAttribute('data-state','ready');await page.locator('#start').click();expect(requests.some(r=>r.includes('/weapons/baton/animations.glb'))).toBe(false);
  await page.keyboard.press('f');await expect(page.locator('#app')).toHaveAttribute('data-weapon','baton');expect(requests.some(r=>r.includes('/weapons/baton/animations.glb'))).toBe(true);
  await page.locator('#inspection-toggle').click();await expect(page.locator('#app')).toHaveAttribute('data-inspection','active');await expect(page.locator('#animation')).toHaveValue('clip:Baton_Idle');await page.locator('#inspection-toggle').click();
  await page.locator('#encounter-start').click();await expect(page.locator('#app')).toHaveAttribute('data-encounter','active');await page.locator('#encounter-restart').click();await expect(page.locator('#app')).toHaveAttribute('data-weapon','baton');await page.locator('#encounter-return').click();await expect(page.locator('#app')).toHaveAttribute('data-weapon','baton');expect(errors).toEqual([]);expect(await page.evaluate(()=>typeof window.__VESPER_DEBUG__)).toBe('undefined');
});
