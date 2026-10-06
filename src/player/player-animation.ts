import type { PlayerAction } from './player-simulation';
import type { CharacterClip } from '../world/character-definition';
export const PLAYER_CLIPS: Record<PlayerAction, string> = {
  idle: 'Idle_Loop', walk: 'Walk_Loop', run: 'Jog_Fwd_Loop', attack: 'Punch_Cross', dodge: 'Roll', hit: 'Hit_Chest', dead: 'Death01',
};
export const PLAYER_CLIP_DESCRIPTORS: CharacterClip[] = Object.entries(PLAYER_CLIPS).map(([action, name]) => ({ name, loop: ['idle', 'walk', 'run'].includes(action) }));
export const PLAYER_CLIP_RATES: Record<PlayerAction, number> = { idle: 1, walk: 1.25, run: 1.65, attack: 1 / 0.65, dodge: 1.4666667 / 0.72, hit: 0.3333333 / 0.42, dead: 1 };
