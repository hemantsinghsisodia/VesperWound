import { CHECKPOINTS, ENCOUNTERS, SECTORS, type CheckpointId, type EncounterId, type SectorId } from './definition';
export interface ChapterProgress {
  version:1; chapter:'last-departure'; checkpoint:CheckpointId; baton:boolean; upgrade:boolean;
  cleared:EncounterId[]; discovered:SectorId[]; shortcuts:('warehouse'|'pump')[];
  hoist:0|1|2; leakClosed:boolean; supplyOpen:boolean; pressureRestored:boolean;
  regulator:boolean; installed:boolean; complete:boolean; activeSeconds:number;
}
export function freshProgress():ChapterProgress {return {version:1,chapter:'last-departure',checkpoint:'court',baton:false,upgrade:false,cleared:[],discovered:['court'],shortcuts:[],hoist:0,leakClosed:false,supplyOpen:false,pressureRestored:false,regulator:false,installed:false,complete:false,activeSeconds:0};}
const uniqueList=(v:unknown,allowed:readonly string[]):boolean=>Array.isArray(v)&&v.every(x=>typeof x==='string'&&allowed.includes(x))&&new Set(v).size===v.length;
/** Treat local storage as untrusted input; reject incompatible or partial records. */
export function parseProgress(value:unknown):ChapterProgress|null {
  if(!value||typeof value!=='object')return null;
  const p=value as Record<string,unknown>;
  if(p.version!==1||p.chapter!=='last-departure'||typeof p.checkpoint!=='string'||!Object.hasOwn(CHECKPOINTS,p.checkpoint))return null;
  if(!['baton','upgrade','leakClosed','supplyOpen','pressureRestored','regulator','installed','complete'].every(k=>typeof p[k]==='boolean'))return null;
  if(!uniqueList(p.cleared,ENCOUNTERS.map(e=>e.id))||!uniqueList(p.discovered,SECTORS.map(s=>s.id))||!uniqueList(p.shortcuts,['warehouse','pump']))return null;
  if(![0,1,2].includes(p.hoist as number)||typeof p.activeSeconds!=='number'||!Number.isFinite(p.activeSeconds)||p.activeSeconds<0)return null;
  if(p.installed&&(!p.regulator||!p.pressureRestored)||p.complete&&!p.installed)return null;
  return structuredClone(p) as unknown as ChapterProgress;
}
