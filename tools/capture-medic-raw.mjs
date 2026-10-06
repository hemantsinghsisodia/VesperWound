import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const directory = process.argv.includes('--export') ? 'docs/qa/medic/browser' : 'docs/qa/medic/raw';
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', args: [] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = []; page.on('pageerror', (error) => errors.push(error.message));
  if (!process.argv.includes('--export')) await page.route('**/showcase/*/character.glb', (route) => route.fulfill({ status: 302, headers: { location: '/art/imports/medic/scifi_medic_rigged.glb' } }));
  await page.goto('http://127.0.0.1:5173/?backend=webgl2');
  await page.locator('#app[data-state="ready"]').waitFor({ timeout: 90000 });
  await page.locator('#start').click(); await page.locator('#inspection-toggle').click();
  await page.locator('#app[data-inspection="active"]').waitFor({ timeout: 90000 });
  for (const [angle, turns] of [['front', 0], ['three-quarter', 1], ['profile', 1], ['back', 2]]) {
    for (let i = 0; i < turns; i++) await page.locator('#turn-character').click();
    await page.waitForTimeout(200); await page.screenshot({ path: `${directory}/${angle}.png` });
  }
  await writeFile(`${directory}/browser.json`, JSON.stringify({ errors, stats: await page.evaluate(() => globalThis.__VESPER_DEBUG__.snapshot()) }, null, 2));
  if (errors.length) throw new Error(errors.join('\n'));
} finally { await browser.close(); }
