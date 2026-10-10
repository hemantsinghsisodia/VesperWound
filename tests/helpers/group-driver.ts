import type { Page } from '@playwright/test';
import { PerspectiveCamera, Vector3 } from 'three';
import type { ExerciseTotals } from './encounter-driver';

export interface GroupTotals extends ExerciseTotals { multiTargetAttacks: number; defeated: number }
interface ObservedEnemy { id: string; generation: number; x: number; z: number; health: number; action: string; actionTime: number }
/** Production keyboard/pointer inputs only. No development commands or state edits. */
export async function exerciseGroup(page: Page, running: () => boolean, totals: GroupTotals): Promise<void> {
  const keys = new Set<string>();
  let previousHits = 0, attackHits = 0, previousStrike = -1, recordedMulti = false;
  const move = async (wanted: string[]) => {
    for (const key of keys) if (!wanted.includes(key)) { await page.keyboard.up(key); keys.delete(key); }
    for (const key of wanted) if (!keys.has(key)) { await page.keyboard.down(key); keys.add(key); }
  };
  try {
    while (running()) {
      const s = await page.evaluate(() => {
        const c = document.querySelector('canvas')!;
        return { p: c.dataset.playerPosition!.split(',').map(Number), enemies: JSON.parse(c.dataset.enemyRoster!) as ObservedEnemy[], action: c.dataset.playerAction!,
          health: document.querySelector<HTMLProgressElement>('#health')!.value, pressure: document.querySelector<HTMLProgressElement>('#pressure')!.value,
          hits: Number(c.dataset.combatHits), criticals: Number(c.dataset.combatCriticals), blocks: Number(c.dataset.combatBlocks), strikes: Number(c.dataset.combatStrikes) };
      });
      if (s.strikes !== previousStrike) { attackHits = 0; recordedMulti = false; previousStrike = s.strikes; }
      attackHits += Math.max(0, s.hits - previousHits); previousHits = s.hits;
      if (attackHits > 1 && !recordedMulti) { totals.multiTargetAttacks++; recordedMulti = true; }
      const living = s.enemies.filter(enemy => enemy.health > 0);
      if (!living.length || s.health === 0) {
        await move([]); totals.encounters++; totals.victories += Number(!living.length); totals.defeated += s.enemies.length - living.length;
        totals.hits += s.hits; totals.criticals += s.criticals; totals.blocks += s.blocks; totals.strikes += s.strikes;
        previousHits = 0; previousStrike = -1;
        await page.waitForTimeout(300); if (running()) await page.locator('#encounter-restart').click();
        continue;
      }
      const distance = (enemy: ObservedEnemy) => Math.hypot(enemy.x - s.p[0]!, enemy.z - s.p[2]!);
      const enemy = [...living].sort((a, b) => Number(b.action === 'stagger') - Number(a.action === 'stagger') || distance(a) - distance(b))[0]!;
      const free = ['idle', 'walk', 'run'].includes(s.action);
      const threat = living.some(e => e.action === 'windup' && distance(e) < 1.3);
      if (free && threat && s.pressure >= 25) { await move([]); await page.keyboard.press('q'); }
      else if (free && distance(enemy) > .8) {
        const dx = enemy.x - s.p[0]!, dz = enemy.z - s.p[2]!, x = dx - dz, y = dx + dz, threshold = Math.max(Math.abs(x), Math.abs(y)) * .35;
        await move([...(Math.abs(x) > threshold ? [x > 0 ? 'd' : 'a'] : []), ...(Math.abs(y) > threshold ? [y > 0 ? 's' : 'w'] : [])]);
      } else {
        await move([]);
        if (free && !living.some(e => e.action === 'active' && distance(e) < 1.3)) {
          const viewport = page.viewportSize()!, camera = new PerspectiveCamera(38, viewport.width / viewport.height, .1, 100);
          camera.position.set(s.p[0]! + 9.5, s.p[1]! + .85 + 15, s.p[2]! + 9.5); camera.lookAt(s.p[0]!, s.p[1]! + .85, s.p[2]!); camera.updateMatrixWorld();
          const neighbour=[...living].filter(e=>e!==enemy&&distance(e)<1.2).sort((a,b)=>distance(a)-distance(b))[0];
          const light=!!neighbour&&enemy.action!=='stagger'&&s.strikes%4!==3;
          const point=light?{x:(enemy.x+neighbour!.x)/2,z:(enemy.z+neighbour!.z)/2}:enemy;
          const projected = new Vector3(point.x, s.p[1]!, point.z).project(camera);
          await page.mouse.click((projected.x + 1) * viewport.width / 2, (1 - projected.y) * viewport.height / 2, { button: light?'left':'right' });
        }
      }
      await page.waitForTimeout(70);
    }
  } finally { await move([]); }
}
