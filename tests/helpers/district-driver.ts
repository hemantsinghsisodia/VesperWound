import { expect, type Page } from '@playwright/test';
export async function observedPosition(page: Page): Promise<{ x: number; y: number; z: number }> {
  const values = (await page.locator('canvas').getAttribute('data-player-position'))!.split(',').map(Number);
  return { x: values[0]!, y: values[1]!, z: values[2]! };
}
/** Follow authored ground using actual keyboard or browser touch events. */
export async function walkTo(page: Page, goal: { x: number; z: number }, touch = false): Promise<void> {
  const keys = new Set<string>(), session = touch ? await page.context().newCDPSession(page) : null;
  const box = touch ? (await page.locator('#movement-stick').boundingBox())! : null;
  const center = box ? { x: box.x + box.width / 2, y: box.y + box.height / 2 } : null;
  if (session && center) await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...center, id: 0 }] });
  if (!touch) await page.keyboard.down('Shift');
  let arrived = false;
  try {
    for (let i = 0; i < 250; i++) {
      const p = await observedPosition(page), dx = goal.x - p.x, dz = goal.z - p.z;
      if (Math.hypot(dx, dz) < .35) { arrived = true; break; }
      const x = dx - dz, y = dx + dz, length = Math.hypot(x, y), threshold = Math.max(Math.abs(x), Math.abs(y)) * .35;
      if (session && center && box) await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: center.x + x / length * box.width * .4, y: center.y + y / length * box.height * .4, id: 0 }] });
      else {
        const wanted = [...(Math.abs(x) > threshold ? [x > 0 ? 'd' : 'a'] : []), ...(Math.abs(y) > threshold ? [y > 0 ? 's' : 'w'] : [])];
        for (const key of keys) if (!wanted.includes(key)) { await page.keyboard.up(key); keys.delete(key); }
        for (const key of wanted) if (!keys.has(key)) { await page.keyboard.down(key); keys.add(key); }
      }
      await page.waitForTimeout(80);
    }
  } finally {
    for (const key of keys) await page.keyboard.up(key);
    await page.keyboard.up('Shift');
    if (session) { await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await session.detach(); }
  }
  expect(arrived, `Could not walk to ${goal.x}, ${goal.z}; ended at ${JSON.stringify(await observedPosition(page))}`).toBe(true);
}
