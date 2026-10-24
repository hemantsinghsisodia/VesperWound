import type { Position } from '../player/combat-definitions';
import type { CollisionBox } from '../player/collision-math';
export type SectorId = 'court' | 'street' | 'warehouse' | 'pump' | 'apron';
export type CheckpointId = 'court' | 'office' | 'pump-exit';
export type EncounterId = 'intake' | 'workers' | 'sentry-site' | 'freight' | 'pump-workers' | 'pump-mixed' | 'guardian-site' | 'side-room';
export interface Rect { minX:number; maxX:number; minZ:number; maxZ:number }
export interface SectorDefinition { id:SectorId; name:string; bounds:Rect; color:number }
export const SECTORS:readonly SectorDefinition[] = [
  {id:'court',name:'Pressure Court',bounds:{minX:-8,maxX:8,minZ:-8,maxZ:8},color:0x59605a},
  {id:'street',name:'Dockside Street',bounds:{minX:-8,maxX:32,minZ:8,maxZ:20},color:0x4c5653},
  {id:'warehouse',name:'Bonded Warehouse',bounds:{minX:20,maxX:48,minZ:20,maxZ:42},color:0x675b49},
  {id:'pump',name:'Pump Works',bounds:{minX:48,maxX:70,minZ:20,maxZ:54},color:0x405958},
  {id:'apron',name:'Ferry Apron',bounds:{minX:-8,maxX:48,minZ:42,maxZ:54},color:0x58616a},
];
export const point=(x:number,z:number):Position=>({x,y:.035,z});
export const box=(x:number,y:number,z:number,hx:number,hy:number,hz:number):CollisionBox=>({position:{x,y,z},half:{x:hx,y:hy,z:hz}});
export interface Portal { id:string; a:SectorId; b:SectorId; position:Position; axis:'x'|'z'; width:number; shortcut?:'warehouse'|'pump' }
export const PORTALS:readonly Portal[]=[
  {id:'court-street',a:'court',b:'street',position:point(0,8),axis:'z',width:4},
  {id:'freight-entry',a:'street',b:'warehouse',position:point(28,20),axis:'z',width:4},
  {id:'warehouse-service',a:'street',b:'warehouse',position:point(22,20),axis:'z',width:2.5,shortcut:'warehouse'},
  {id:'pump-entry',a:'warehouse',b:'pump',position:point(48,31),axis:'x',width:4},
  {id:'quay-return',a:'warehouse',b:'apron',position:point(30,42),axis:'z',width:4},
  {id:'pump-maintenance',a:'pump',b:'apron',position:point(48,47),axis:'x',width:3,shortcut:'pump'},
];
export function portalBox(p:Portal):CollisionBox {return box(p.position.x,1.2,p.position.z,p.axis==='x'?.12:p.width/2,1.2,p.axis==='z'?.12:p.width/2);}
export const CHECKPOINTS:Record<CheckpointId,{name:string;sector:SectorId;position:Position}>={
  court:{name:'Court refuge',sector:'court',position:point(-4,3)},
  office:{name:'Warehouse office',sector:'warehouse',position:point(23,38)},
  'pump-exit':{name:'Pump exit refuge',sector:'pump',position:point(51,48)},
};
export interface ChapterEncounter { id:EncounterId; sector:SectorId; positions:readonly Position[]; title:string; optional?:boolean }
export const ENCOUNTERS:readonly ChapterEncounter[]=[
  {id:'intake',sector:'court',positions:[point(3,4)],title:'Intake worker'},
  {id:'workers',sector:'street',positions:[point(12,14),point(15,13)],title:'Street workers'},
  {id:'sentry-site',sector:'warehouse',positions:[point(30,25)],title:'Sentry site · temporary worker'},
  {id:'freight',sector:'warehouse',positions:[point(32,36),point(35,36)],title:'Freight workers'},
  {id:'pump-workers',sector:'pump',positions:[point(54,29),point(58,29)],title:'Pump workers'},
  {id:'pump-mixed',sector:'pump',positions:[point(62,43),point(65,43)],title:'Mixed encounter site · temporary workers'},
  {id:'guardian-site',sector:'apron',positions:[point(32,48)],title:'Guardian site · temporary worker'},
  {id:'side-room',sector:'warehouse',positions:[point(44,24)],title:'Accumulator room',optional:true},
];
export const POINTS={hoist:point(37,29),regulator:point(40,35),leak:point(60,36),supply:point(64,36),winch:point(37,48),board:point(41,51),upgrade:point(44,27)};
export function sectorAt(p:Position,previous:SectorId='court'):SectorId {
  const contains=(s:SectorDefinition)=>p.x>=s.bounds.minX&&p.x<=s.bounds.maxX&&p.z>=s.bounds.minZ&&p.z<=s.bounds.maxZ;
  return SECTORS.find(s=>s.id===previous&&contains(s))?.id??SECTORS.find(contains)?.id??previous;
}
export function chapterGround(p:Position):boolean {return SECTORS.some(s=>p.x>=s.bounds.minX+.05&&p.x<=s.bounds.maxX-.05&&p.z>=s.bounds.minZ+.05&&p.z<=s.bounds.maxZ-.05)||PORTALS.some(q=>Math.hypot(p.x-q.position.x,p.z-q.position.z)<q.width/2);}
/** Editable blockout solids, shared by rendering, collision and navigation. */
export function sectorBoxes(id:SectorId):CollisionBox[] {
  const s=SECTORS.find(s=>s.id===id)!,b=s.bounds,result:CollisionBox[]=[box((b.minX+b.maxX)/2,-.2,(b.minZ+b.maxZ)/2,(b.maxX-b.minX)/2,.2,(b.maxZ-b.minZ)/2)];
  for(const axis of ['x','z'] as const)for(const side of ['min','max'] as const){
    const coordinate=axis==='x'?(side==='min'?b.minX:b.maxX):(side==='min'?b.minZ:b.maxZ);
    const start=axis==='x'?b.minZ:b.minX,end=axis==='x'?b.maxZ:b.maxX;
    const openings=PORTALS.filter(p=>(p.a===id||p.b===id)&&p.axis===axis&&p.position[axis]===coordinate).map(p=>({lo:p.position[axis==='x'?'z':'x']-p.width/2,hi:p.position[axis==='x'?'z':'x']+p.width/2})).sort((a,c)=>a.lo-c.lo);
    let cursor=start;
    for(const opening of [...openings,{lo:end,hi:end}]){const length=opening.lo-cursor;if(length>.01)result.push(axis==='x'?box(coordinate,1.2,(cursor+opening.lo)/2,.15,1.2,length/2):box((cursor+opening.lo)/2,1.2,coordinate,length/2,1.2,.15));cursor=opening.hi;}
  }
  const props:Partial<Record<SectorId,CollisionBox[]>>={court:[box(0,1.4,-2,1.3,1.4,1.3)],street:[box(7,.6,11,1.4,.6,.8),box(18,.8,17,1.8,.8,1)],warehouse:[box(27,.9,29,1,.9,3),box(34,.9,32,1,.9,2),box(43,.8,39,2,.8,1)],pump:[box(56,1.8,37,1.5,1.8,2),box(65,1.3,27,1.4,1.3,1.4)],apron:[box(20,.8,45,2,.8,1),box(38,1,46,1,1,.6)]};
  return [...result,...props[id]??[]];
}
export const CHAPTER_BOXES=SECTORS.flatMap(s=>sectorBoxes(s.id));
export function hoistCargo(position:number):CollisionBox {return box(40,1,35-position*2,1.4,1,.7);}
