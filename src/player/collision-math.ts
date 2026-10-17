import type { Position } from './combat-definitions';
export interface CollisionBox { position: Position; half: Position }
export function courtyardSolids(boxes: readonly CollisionBox[]): readonly CollisionBox[] {
  return boxes.filter(b => !(b.position.x === 1.5 && b.position.z === 3.4 && b.half.x === .24));
}
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

/** Exact horizontal sweep of the same 0.3 m disc used by enemy collision. */
export function discPathBlocked(from: Position, to: Position, boxes: readonly CollisionBox[]): boolean {
  const dx = to.x - from.x, dz = to.z - from.z, lengthSquared = dx * dx + dz * dz;
  return boxes.some(({ position: p, half: h }) => {
    if (p.y + h.y < from.y + .2 || p.y - h.y > from.y + 1.7) return false;
    // Tangency is legal, matching discBlocked's strict radius comparison.
    if (crossesRectangle(from.x - p.x, from.z - p.z, dx, dz, h.x + .3 - 1e-8, h.z) ||
        crossesRectangle(from.x - p.x, from.z - p.z, dx, dz, h.x, h.z + .3 - 1e-8)) return true;
    for (const x of [p.x - h.x, p.x + h.x]) for (const z of [p.z - h.z, p.z + h.z]) {
      const t = lengthSquared ? Math.max(0, Math.min(1, ((x - from.x) * dx + (z - from.z) * dz) / lengthSquared)) : 0;
      if ((from.x + t * dx - x) ** 2 + (from.z + t * dz - z) ** 2 < .09) return true;
    }
    return false;
  });
}

function crossesRectangle(x: number, z: number, dx: number, dz: number, hx: number, hz: number): boolean {
  let near = 0, far = 1;
  if (Math.abs(dx) < 1e-8) { if (Math.abs(x) > hx) return false; }
  else { const a = (-hx - x) / dx, b = (hx - x) / dx; near = Math.max(near, Math.min(a, b)); far = Math.min(far, Math.max(a, b)); }
  if (Math.abs(dz) < 1e-8) { if (Math.abs(z) > hz) return false; }
  else { const a = (-hz - z) / dz, b = (hz - z) / dz; near = Math.max(near, Math.min(a, b)); far = Math.min(far, Math.max(a, b)); }
  return near <= far;
}
