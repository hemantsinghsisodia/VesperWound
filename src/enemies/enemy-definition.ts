import type { AttackDefinition, Position } from '../player/combat-definitions';
import { ENEMY_CONTACT, ENEMY_MOTION } from './enemy-attack';
export interface EnemyDefinition {
  id: string; displayName: string; maxHealth: number; speed: number; walkCycleSpeed: number; detection: number; leash: number;
  attack: AttackDefinition; clips: { idle: string; walk: string; attack: string; stagger: string; death: string };
  spawn: Position;
}
export const ZOMBIE7: EnemyDefinition = {
  id: 'zombie7', displayName: 'Zombie 7', maxHealth: 120, speed: 1.5, walkCycleSpeed: .405, detection: 6, leash: 8,
  spawn: { x: 1.5, y: .035, z: 3.4 },
  attack: { id: 'enemy-strike', kind: 'enemy', clip: 'Attack', duration: ENEMY_MOTION.duration, active: [ENEMY_MOTION.active[0]!, ENEMY_MOTION.active[1]!], contact: ENEMY_CONTACT, damage: 20, posture: 0, knockback: 0, reach: .8, radius: ENEMY_MOTION.radius },
  clips: { idle: 'Idle', walk: 'Walk', attack: 'Attack', stagger: 'Scream', death: 'Death' },
};
export type EnemyAction = 'idle' | 'approach' | 'windup' | 'active' | 'recovery' | 'stagger' | 'return' | 'dead';
