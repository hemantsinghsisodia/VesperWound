export interface Position { x: number; y: number; z: number }
export type AttackId = 'jab' | 'cross' | 'finisher' | 'heavy';
export interface AttackDefinition { id: AttackId; clip: string; duration: number; active: readonly [number, number]; clipContact?: readonly [number, number]; damage: number; posture: number; knockback: number; reach: number; radius: number }
export const ATTACKS: Record<AttackId, AttackDefinition> = {
  jab: { id: 'jab', clip: 'Punch_Jab', duration: .6, active: [.22, .32], damage: 10, posture: 10, knockback: .08, reach: 1.1, radius: .3 },
  cross: { id: 'cross', clip: 'Punch_Cross', duration: .65, active: [.25, .36], damage: 14, posture: 15, knockback: .1, reach: 1.15, radius: .35 },
  finisher: { id: 'finisher', clip: 'Punch_Jab', duration: .72, active: [.24, .36], damage: 20, posture: 25, knockback: .18, reach: 1.15, radius: .35 },
  heavy: { id: 'heavy', clip: 'Punch_Cross', duration: .9, active: [.42, .56], clipContact: [.3, .55], damage: 30, posture: 50, knockback: .5, reach: 1.2, radius: .4 },
};
export interface CombatStyleDefinition { id: string; light: readonly AttackId[]; heavy: AttackId; buffer: number; chainTimeout: number }
export const UNARMED: CombatStyleDefinition = { id: 'unarmed', light: ['jab', 'cross', 'finisher'], heavy: 'heavy', buffer: .12, chainTimeout: .6 };
export const TRAINING_TARGETS = [
  { id: 'isolated', label: 'COMBO TARGET', position: { x: 1.5, y: .035, z: 3.4 }, maxHealth: 100, mass: 1 },
  { id: 'heavy', label: 'HEAVY TARGET', position: { x: 3.8, y: .035, z: 1.8 }, maxHealth: 160, mass: 2 },
  { id: 'grouped', label: 'GROUP TARGET', position: { x: 4.5, y: .035, z: 1.9 }, maxHealth: 100, mass: 1 },
] as const;
export interface CombatantState { id: string; label: string; position: Position; previous: Position; spawn: Position; health: number; maxHealth: number; posture: number; exposedUntil: number; defeatedUntil: number; mass: number; velocity: { x: number; z: number }; hits: number }
export type CombatEvent =
  | { type: 'swing'; attack: AttackId; instance: number; position: Position }
  | { type: 'hit'; attack: AttackId; target: string; instance: number; damage: number; posture: number; critical: boolean; position: Position }
  | { type: 'stagger' | 'critical' | 'defeat' | 'reset'; target: string; position: Position }
  | { type: 'block' | 'damage' | 'ward' | 'vent-warning' | 'vent-pulse'; position: Position };
export function attackTouches(attack: AttackDefinition, origin: Position, facing: number, target: Position): boolean {
  if (Math.abs(origin.y - target.y) > .65) return false;
  const x = target.x - origin.x; const z = target.z - origin.z;
  const forward = x * Math.sin(facing) + z * Math.cos(facing); const side = x * Math.cos(facing) - z * Math.sin(facing);
  const nearest = Math.max(.3, Math.min(attack.reach, forward));
  return forward > 0 && Math.hypot(forward - nearest, side) <= attack.radius + .3;
}
