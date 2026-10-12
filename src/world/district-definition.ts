import court from '../player/courtyard-collision.json';
import layout from './district-layout.json';
import type { CollisionBox } from '../player/collision-math';
import type { Position } from '../player/combat-definitions';

export const DISTRICT_GATE: CollisionBox = { position: { x: 0, y: 1, z: 8.05 }, half: { x: 2.5, y: 1, z: .12 } };
export const DISTRICT_BOUNDS = { minX: -7.5, maxX: 7.5, minZ: -7.5, maxZ: 30.5 };
export const DISTRICT_BOXES: readonly CollisionBox[] = [
  ...court.filter(b => b.position.z !== 8.1),
  ...[-5.3, 5.3].map(x => ({ position: { x, y: 1, z: 8.1 }, half: { x: 2.8, y: 1, z: .1 } })),
  ...layout.filter(b => b.kind !== 'cutaway').map(({ position, half }) => ({ position, half })),
];
export function districtGround(p: Position): boolean {
  return Math.abs(p.x) <= 7.7 && p.z >= -7.7 && p.z <= 7.9 ||
    Math.abs(p.x) <= 2.2 && p.z >= 7.5 && p.z <= 17.3 ||
    Math.abs(p.x) <= 7.7 && p.z >= 17.2 && p.z <= 30.8;
}
export function districtArea(z: number): string { return z < 8 ? 'Pressure Court' : z < 17 ? 'Pump Alley' : 'Arrival Quay'; }
