import motion from './enemy-attack-motion.json' with { type: 'json' };
import samples from './enemy-hand-contact.json' with { type: 'json' };
import type { ContactPose } from '../player/combat-definitions';

export const ENEMY_MOTION = Object.freeze({ ...motion, mapping: Object.freeze(motion.mapping.map(row => Object.freeze(row))) });
export const ENEMY_CONTACT: readonly ContactPose[] = Object.freeze(samples.map(row => Object.freeze({ ...row, base: Object.freeze(row.base), tip: Object.freeze(row.tip) })));
/** Shared with the offline exporter; presentation never advances combat time. */
export function enemyClipTime(elapsed: number): number {
  const t = Math.max(0, Math.min(ENEMY_MOTION.duration, elapsed));
  const rows = ENEMY_MOTION.mapping;
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i - 1]!, b = rows[i]!;
    if (t <= b[0]!) return a[1]! + (b[1]! - a[1]!) * (t - a[0]!) / (b[0]! - a[0]!);
  }
  return ENEMY_MOTION.clipDuration;
}
