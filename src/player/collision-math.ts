import type { Position } from './combat-definitions';
export interface CollisionBox { position: Position; half: Position }
/** Slab intersection against authored solids; hurt volumes are handled separately. */
export function segmentBlocked(from: Position, to: Position, boxes: readonly CollisionBox[]): boolean {
  return boxes.some(({ position: p, half: h }) => {
    let near = 0; let far = 1;
    for (const axis of ['x', 'y', 'z'] as const) {
      const d = to[axis] - from[axis]; const low = p[axis] - h[axis]; const high = p[axis] + h[axis];
      if (Math.abs(d) < 1e-8) { if (from[axis] < low || from[axis] > high) return false; }
      else { const a = (low - from[axis]) / d; const b = (high - from[axis]) / d; near = Math.max(near, Math.min(a, b)); far = Math.min(far, Math.max(a, b)); if (near > far) return false; }
    }
    return true;
  });
}
export function discBlocked(p: Position, boxes: readonly CollisionBox[]): boolean {
  return boxes.some(({ position: c, half: h }) => {
    if (c.y + h.y < p.y + .2 || c.y - h.y > p.y + 1.7) return false;
    const x = Math.max(c.x - h.x, Math.min(c.x + h.x, p.x)); const z = Math.max(c.z - h.z, Math.min(c.z + h.z, p.z));
    return Math.hypot(p.x - x, p.z - z) < .3;
  });
}
