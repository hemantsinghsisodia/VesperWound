import type { Page } from '@playwright/test';
import { PerspectiveCamera, Vector3 } from 'three';
export interface ExerciseTotals { encounters: number; victories: number; hits: number; criticals: number; blocks: number; strikes: number }
/** Drives real production controls; reads only UI state, never mutates simulation. */
export async function exerciseEncounter(page: Page, running: () => boolean, totals: ExerciseTotals): Promise<void> {
  const keys = new Set<string>();
  const move = async (wanted: string[]) => {
    for (const key of keys) if (!wanted.includes(key)) { await page.keyboard.up(key); keys.delete(key); }
    for (const key of wanted) if (!keys.has(key)) { await page.keyboard.down(key); keys.add(key); }
  };
  try {
    while (running()) {
      const s = await page.evaluate(() => {
        const c = document.querySelector('canvas')!;
        return { p: c.dataset.playerPosition!.split(',').map(Number), e: c.dataset.enemyPosition!.split(',').map(Number),
          action: c.dataset.playerAction!, enemy: c.dataset.enemyState!, enemyHealth: Number(c.dataset.enemyHealth),
          health: document.querySelector<HTMLProgressElement>('#health')!.value, pressure: document.querySelector<HTMLProgressElement>('#pressure')!.value,
          hits: Number(c.dataset.combatHits), criticals: Number(c.dataset.combatCriticals), blocks: Number(c.dataset.combatBlocks), strikes: Number(c.dataset.combatStrikes) };
      });
      if (s.enemyHealth === 0 || s.health === 0) {
        await move([]); totals.encounters++; totals.victories += Number(s.enemyHealth === 0);
        totals.hits += s.hits; totals.criticals += s.criticals; totals.blocks += s.blocks; totals.strikes += s.strikes;
        await page.waitForTimeout(300); if (running()) await page.locator('#encounter-restart').click();
        continue;
      }
      const free = ['idle', 'walk', 'run'].includes(s.action);
      const dx = s.e[0]! - s.p[0]!, dz = s.e[1]! - s.p[2]!, distance = Math.hypot(dx, dz);
      if (free && s.enemy === 'windup' && s.pressure >= 25) { await move([]); await page.keyboard.press('q'); }
      else if (free && distance > .8) {
        const x = dx - dz, y = dx + dz, threshold = Math.max(Math.abs(x), Math.abs(y)) * .35;
        await move([...(Math.abs(x) > threshold ? [x > 0 ? 'd' : 'a'] : []), ...(Math.abs(y) > threshold ? [y > 0 ? 's' : 'w'] : [])]);
      } else {
        await move([]);
        if (free && ['recovery', 'stagger', 'approach'].includes(s.enemy)) {
          const v = page.viewportSize()!, camera = new PerspectiveCamera(38, v.width / v.height, .1, 100);
          camera.position.set(s.p[0]! + 9.5, s.p[1]! + .85 + 15, s.p[2]! + 9.5); camera.lookAt(s.p[0]!, s.p[1]! + .85, s.p[2]!); camera.updateMatrixWorld();
          const projected = new Vector3(s.e[0]!, s.p[1]!, s.e[1]!).project(camera);
          await page.mouse.click((projected.x + 1) * v.width / 2, (1 - projected.y) * v.height / 2, { button: 'right' });
        }
      }
      await page.waitForTimeout(70);
    }
  } finally { await move([]); }
}
