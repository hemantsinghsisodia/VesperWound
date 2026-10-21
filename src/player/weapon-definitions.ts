import paths from './baton-contact.json' with { type: 'json' };
import type { AttackDefinition, AttackId, CombatStyleDefinition, WeaponId } from './combat-definitions';
export const BATON_PICKUP = { x: -1.6, y: .035, z: 4.5 };
const values = [
  ['baton-light1','Baton_Light1',21,15,27/60,9/60,15/60,.08],
  ['baton-light2','Baton_Light2',27,20,30/60,10/60,17/60,.1],
  ['baton-light3','Baton_Light3',36,30,36/60,12/60,20/60,.18],
  ['baton-heavy','Baton_Heavy',48,50,48/60,21/60,30/60,.5],
] as const;
const attacks: Partial<Record<AttackId, AttackDefinition>> = {};
for (const [id,clip,damage,posture,duration,start,end,knockback] of values) attacks[id] = Object.freeze({ id,kind:id==='baton-heavy'?'heavy':'light',clip,damage,posture,duration,active:[start,end] as const,knockback,reach:1.05,radius:.055,contact:Object.freeze(paths[clip].map(p=>Object.freeze({...p,base:Object.freeze(p.base),tip:Object.freeze(p.tip)}))) });
export const BATON: CombatStyleDefinition = Object.freeze({ id:'baton',light:['baton-light1','baton-light2','baton-light3'] as const,heavy:'baton-heavy',buffer:.12,chainTimeout:.6,followUp:'single',attacks:Object.freeze(attacks),animations:{idle:'Baton_Idle',walk:'Baton_Walk',run:'Baton_Run',dodge:'Baton_Dodge',ward:'Baton_Ward',hit:'Baton_Hit',dead:'Baton_Death'} });
export interface WeaponDefinition { id: WeaponId; displayName: string; style: CombatStyleDefinition; gripBone: string }
export const STEEL_BATON: WeaponDefinition = { id:'baton',displayName:'Steel baton',style:BATON,gripBone:'RightHand' };
