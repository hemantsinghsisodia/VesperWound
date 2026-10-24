import type { EncounterSimulation } from '../enemies/encounter-simulation';
import type { PlayerCollision } from '../player/player-simulation';
import { CHECKPOINTS, CHAPTER_BOXES, ENCOUNTERS, POINTS, PORTALS, SECTORS, chapterGround, hoistCargo, point, sectorAt, type CheckpointId, type EncounterId, type SectorId } from './definition';
import { freshProgress, type ChapterProgress } from './progress';
import type { Position } from '../player/combat-definitions';
export interface ChapterInteraction { id:string; label:string; position:Position; available:boolean }
export class ChapterSimulation {
  progress:ChapterProgress=freshProgress();
  sector:SectorId='court';
  active=false;
  revision=0;
  feedback='';
  encounterId:EncounterId|null=null;
  hoistPosition=0;
  private observedWeapon=false;
  constructor(readonly encounter:EncounterSimulation,private readonly collision:PlayerCollision){}
  get fighting():boolean{return this.encounter.enemies.some(e=>e.health>0);}
  get canAct():boolean {const p=this.encounter.player.state;return p.health>0&&['idle','walk','run'].includes(p.action);}
  commit():void{this.revision++;}
  start(progress=freshProgress()):void {this.progress=structuredClone(progress);this.active=true;this.hoistPosition=this.progress.hoist;this.observedWeapon=this.progress.baton;this.restore();this.commit();}
  restore():void {
    this.encounter.clearEncounter(true);const player=this.encounter.player,p=CHECKPOINTS[this.progress.checkpoint].position;
    player.state.weapon=this.progress.baton?'baton':'unarmed';player.maximumPressure=this.progress.upgrade?125:100;player.state.pressure=player.maximumPressure;
    player.state.position={...p};player.state.previous={...p};this.collision.reset(p);
    this.sector=CHECKPOINTS[this.progress.checkpoint].sector;this.encounterId=null;this.feedback='Checkpoint restored';
  }
  leave():void{this.active=false;this.encounterId=null;this.encounter.clearEncounter();this.encounter.player.maximumPressure=100;}
  update(dt:number,interact:boolean):void {
    if(!this.active||this.encounter.player.state.health<=0)return;
    const p=this.encounter.player.state;
    if(!this.progress.complete)this.progress.activeSeconds+=dt;
    this.sector=sectorAt(p.position,this.sector);
    if(!this.progress.discovered.includes(this.sector)){this.progress.discovered.push(this.sector);this.commit();}
    if(p.weapon==='baton'&&!this.observedWeapon){this.observedWeapon=true;this.progress.baton=true;this.commit();}
    const step=Math.sign(this.progress.hoist-this.hoistPosition)*Math.min(Math.abs(this.progress.hoist-this.hoistPosition),dt*.65);
    const next=hoistCargo(this.hoistPosition+step);
    if(Math.abs(p.position.x-next.position.x)>next.half.x+.5||Math.abs(p.position.z-next.position.z)>next.half.z+.5)this.hoistPosition+=step;
    else if(step)this.feedback='Move clear of the marked cargo rail';
    if(this.encounterId&&this.encounter.victorious){this.progress.cleared.push(this.encounterId);this.encounterId=null;this.feedback='Area cleared';this.commit();}
    if(!this.progress.pressureRestored&&this.progress.leakClosed&&this.progress.supplyOpen&&this.progress.cleared.includes('pump-workers')&&this.progress.cleared.includes('pump-mixed')){this.progress.pressureRestored=true;this.feedback='Pressure stable · ferry line supplied';this.commit();}
    if(this.encounterId&&!this.fighting)this.encounterId=null;
    if(!this.encounterId&&!this.progress.complete){
      const e=ENCOUNTERS.find(e=>e.sector===this.sector&&!this.progress.cleared.includes(e.id)&&Math.hypot(p.position.x-e.positions[0]!.x,p.position.z-e.positions[0]!.z)<5&&(e.id!=='guardian-site'||this.progress.installed));
      if(e){this.encounter.configureNavigation([...CHAPTER_BOXES,hoistCargo(this.hoistPosition)],SECTORS.find(s=>s.id===e.sector)!.bounds,chapterGround);this.encounter.start(e.positions.length,e.positions,false);this.encounterId=e.id;this.feedback=e.title;}
    }
    if(interact&&this.canAct){const action=this.interaction;if(action?.available)this.interact(action.id);}
  }
  get interactions():ChapterInteraction[]{
    const p=this.progress,safe=!this.fighting;
    return [
      ...Object.entries(CHECKPOINTS).map(([id,c])=>({id:`checkpoint:${id}`,label:`Rest · ${c.name}`,position:c.position,available:safe})),
      {id:'hoist',label:`Cargo hoist · position ${p.hoist+1}/3 → next`,position:POINTS.hoist,available:safe&&!p.regulator},
      {id:'regulator',label:'Take ferry regulator',position:POINTS.regulator,available:safe&&!p.regulator&&Math.abs(this.hoistPosition-2)<.01&&['intake','workers','sentry-site','freight'].every(id=>p.cleared.includes(id as EncounterId))},
      {id:'leak',label:p.leakClosed?'Open leaking branch':'Isolate leaking branch',position:POINTS.leak,available:safe&&!p.pressureRestored},
      {id:'supply',label:p.supplyOpen?'Close ferry supply':'Open marked ferry supply',position:POINTS.supply,available:safe&&!p.pressureRestored},
      ...PORTALS.filter(q=>q.shortcut).map(q=>({id:`gate:${q.shortcut}`,label:'Open service shortcut',position:point(q.position.x+(q.axis==='x'?1:0),q.position.z+(q.axis==='z'?1:0)),available:safe&&this.sector===q.shortcut&&!p.shortcuts.includes(q.shortcut!)})),
      {id:'upgrade',label:'Take pressure accumulator · capacity 125',position:POINTS.upgrade,available:safe&&!p.upgrade&&p.cleared.includes('side-room')},
      {id:'winch',label:'Install regulator',position:POINTS.winch,available:safe&&p.regulator&&p.pressureRestored&&!p.installed},
      {id:'board',label:'Finish navigation route',position:POINTS.board,available:safe&&p.installed&&p.cleared.includes('guardian-site')&&!p.complete},
    ];
  }
  get interaction():ChapterInteraction|undefined {const p=this.encounter.player.state.position;return this.interactions.filter(a=>a.available&&Math.hypot(a.position.x-p.x,a.position.z-p.z)<1.6&&!this.collision.blocked?.({...p,y:1},{...a.position,y:1})).sort((a,b)=>Math.hypot(a.position.x-p.x,a.position.z-p.z)-Math.hypot(b.position.x-p.x,b.position.z-p.z))[0];}
  private interact(id:string):void {
    const p=this.progress;
    if(id.startsWith('checkpoint:')){p.checkpoint=id.slice(11) as CheckpointId;this.encounter.player.state.health=100;this.encounter.player.state.pressure=this.encounter.player.maximumPressure;this.feedback='Checkpoint activated · health and pressure restored';}
    else if(id.startsWith('gate:')){p.shortcuts.push(id.slice(5) as 'warehouse'|'pump');this.feedback='Shortcut opened';}
    else if(id==='hoist'){p.hoist=((p.hoist+1)%3) as 0|1|2;this.feedback='Rail III clears the regulator access';}
    else if(id==='regulator'){p.regulator=true;this.feedback='Regulator recovered · trace the ferry supply pipe';}
    else if(id==='leak'||id==='supply'){if(id==='leak')p.leakClosed=!p.leakClosed;else p.supplyOpen=!p.supplyOpen;this.feedback=p.leakClosed&&p.supplyOpen?'Valves aligned · clear the remaining pump workers':p.supplyOpen?'Pressure falling · isolate the leaking branch':'Ferry supply closed';}
    else if(id==='upgrade'){p.upgrade=true;this.encounter.player.maximumPressure=125;this.encounter.player.state.pressure=125;this.feedback='Pressure capacity increased to 125';}
    else if(id==='winch'){p.installed=true;this.feedback='Regulator installed · clear the final encounter site';}
    else if(id==='board'){p.complete=true;this.feedback='Navigation route complete. Guardian and ferry finale arrive in later milestones.';}
    this.commit();
  }
  get objective():{title:string;clue:string;position:Position}{
    const p=this.progress;
    if(p.complete)return {title:'Route explored',clue:'Milestone B complete · review navigation and save reliability',position:POINTS.board};
    if(!p.baton)return {title:'Take the steel baton',clue:'Pressure Court · amber pickup',position:point(-1.6,4.5)};
    if(this.fighting)return {title:'Clear the route',clue:this.feedback,position:this.encounter.enemies.find(e=>e.health>0)!.position};
    const required=ENCOUNTERS.find(e=>!e.optional&&!p.cleared.includes(e.id)&&(p.regulator?e.sector==='pump':['court','street','warehouse'].includes(e.sector)));
    if(required)return {title:'Secure the route',clue:`${SECTORS.find(s=>s.id===required.sector)!.name} · ${required.title}`,position:required.positions[0]!};
    if(!p.regulator)return {title:'Recover the ferry regulator',clue:'Bonded Warehouse · move the cargo hoist to rail III',position:this.hoistPosition===2?POINTS.regulator:POINTS.hoist};
    if(!p.pressureRestored)return {title:'Restore district pressure',clue:'Pump Works · isolate the leak, open the ferry supply',position:p.leakClosed?POINTS.supply:POINTS.leak};
    if(!p.installed)return {title:'Install the regulator',clue:'Ferry Apron · return through either shortcut',position:POINTS.winch};
    if(!p.cleared.includes('guardian-site'))return {title:'Clear the final encounter site',clue:'Temporary worker stands in for the future guardian',position:point(32,48)};
    return {title:'Reach the boarding point',clue:'Green signal at the seaward end of the apron',position:POINTS.board};
  }
}
