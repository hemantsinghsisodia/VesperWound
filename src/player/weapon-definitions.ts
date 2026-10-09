import paths from './baton-contact.json';
import type { AttackDefinition, AttackId, CombatStyleDefinition, WeaponId } from './combat-definitions';
export const BATON_PICKUP = { x: -1.6, y: .035, z: 4.5 };
const values = [
  ['baton-light1','Baton_Light1',14,15,.6,.22,.34,.08],
  ['baton-light2','Baton_Light2',18,20,.65,.24,.37,.1],
  ['baton-light3','Baton_Light3',24,30,.75,.28,.42,.18],
  ['baton-heavy','Baton_Heavy',32,50,.95,.44,.59,.5],
] as const;
const attacks: Partial<Record<AttackId, AttackDefinition>> = {};
for (const [id,clip,damage,posture,duration,start,end,knockback] of values) attacks[id] = Object.freeze({ id,kind:id==='baton-heavy'?'heavy':'light',clip,damage,posture,duration,active:[start,end] as const,knockback,reach:1.05,radius:.055,contact:Object.freeze(paths[clip].map(p=>Object.freeze({...p,base:Object.freeze(p.base),tip:Object.freeze(p.tip)}))) });
export const BATON: CombatStyleDefinition = Object.freeze({ id:'baton',light:['baton-light1','baton-light2','baton-light3'] as const,heavy:'baton-heavy',buffer:.12,chainTimeout:.6,attacks:Object.freeze(attacks),animations:{idle:'Baton_Idle',walk:'Baton_Walk',run:'Baton_Run',dodge:'Baton_Dodge',ward:'Baton_Ward',hit:'Baton_Hit',dead:'Baton_Death'} });
export interface WeaponDefinition { id: WeaponId; displayName: string; style: CombatStyleDefinition; gripBone: string }
export const STEEL_BATON: WeaponDefinition = { id:'baton',displayName:'Steel baton',style:BATON,gripBone:'RightHand' };
