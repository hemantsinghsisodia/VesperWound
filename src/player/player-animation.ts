import type { PlayerAction } from './player-simulation';
import type { CharacterClip } from '../world/character-definition';
import type { AttackDefinition } from './combat-definitions';
export const PLAYER_CLIPS: Record<PlayerAction, string> = {
  idle: 'Idle_Loop', walk: 'Walk_Loop', run: 'Jog_Fwd_Loop', attack: 'Punch_Jab', heavy: 'Punch_Cross', ward: 'Spell_Simple_Shoot', dodge: 'Roll', hit: 'Hit_Chest', dead: 'Death01',
};
export const PLAYER_CLIP_DESCRIPTORS: CharacterClip[] = Object.entries(PLAYER_CLIPS).map(([action, name]) => ({ name, loop: ['idle', 'walk', 'run'].includes(action) }));
export const PLAYER_CLIP_RATES: Record<PlayerAction, number> = { idle: 1, walk: 1.25, run: 1.65, attack: 1, heavy: 1, ward: 1, dodge: 1.4666667 / 0.72, hit: 0.3333333 / 0.42, dead: 1 };

/** Retimes presentation to the CPU windows; playback never resolves damage. */
export function attackPlaybackRate(attack: AttackDefinition, time: number, clipDuration: number): number {
  if (!attack.clipContact) return clipDuration / attack.duration;
  const [start, end] = attack.clipContact;
  return clipDuration * (time < attack.active[0] ? start / attack.active[0] : time < attack.active[1] ? (end - start) / (attack.active[1] - attack.active[0]) : (1 - end) / (attack.duration - attack.active[1]));
}
