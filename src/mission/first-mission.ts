import type { EncounterSimulation } from '../enemies/encounter-simulation';
import type { PlayerCollision } from '../player/player-simulation';
import type { Position } from '../player/combat-definitions';

export type MissionStage = 'inactive' | 'prepare' | 'quay' | 'passage-fight' | 'regulator' | 'winch-fight' | 'install' | 'powering' | 'board' | 'complete';
export type MissionCue = 'regulator' | 'winch' | 'complete' | 'encounter';
export const MISSION_POINTS = {
  regulator:{x:-5,y:.035,z:22.5}, winch:{x:3,y:.035,z:24.4}, ferry:{x:0,y:.035,z:30},
} satisfies Record<string,Position>;
export const MISSION_WAVES:readonly (readonly Position[])[] = [
  [{x:-.9,y:.035,z:19.5},{x:1.2,y:.035,z:20}],
  [{x:1,y:.035,z:24},{x:1.7,y:.035,z:26.2},{x:-.5,y:.035,z:26.3}],
];
export const MISSION_OBJECTIVES:Record<MissionStage,{title:string;detail:string}> = {
  inactive:{title:'Restart the Ferry Winch',detail:'The ferry is stranded. Find a regulator, restore pressure and open the boarding ramp.'},
  prepare:{title:'Take the steel baton',detail:'The amber marker is beside Medic. F / Pick up to equip. Light → heavy; Q / Ward absorbs one hit.'},
  quay:{title:'Reach Arrival Quay',detail:'Follow the ARRIVAL QUAY sign through Pump Alley. The loading bay is on the west side.'},
  'passage-fight':{title:'Clear the quay approach',detail:'Watch the amber windup. Dodge or Ward, then punish recovery. Heavy hits consume exposed openings.'},
  regulator:{title:'Find the pressure regulator',detail:'The marked case is beneath the west loading canopy. Take a breath here: pressure recovers while you are out of combat.'},
  'winch-fight':{title:'Clear the winch apron',detail:'The regulator is secured. Three dock workers guard the winch. Only one commits to a strike at a time.'},
  install:{title:'Restore the ferry winch',detail:'Fit the regulator to the amber control pedestal beside the harbour crane.'},
  powering:{title:'Pressure returning',detail:'The winch is drawing in the boarding ramp. Stand clear while its mechanism settles.'},
  board:{title:'Board the waiting ferry',detail:'The green boarding light is on. Follow the lowered ramp to the quay edge and use F / Board ferry.'},
  complete:{title:'Evacuation route restored',detail:'The ferry can leave Ash Quay. Mission complete.'},
};

/** Session-owned CPU progression. No meshes, frame-rate dependencies or timers. */
export class FirstMission {
  stage:MissionStage='inactive';
  elapsed=0;
  powerTime=0;
  private cues:MissionCue[]=[];
  constructor(readonly encounter:EncounterSimulation,private readonly collision:PlayerCollision){}
  get active():boolean{return this.stage!=='inactive';}
  get ramp():number{return Math.min(1,this.powerTime/6);}
  get objective(){return MISSION_OBJECTIVES[this.stage];}
  get target():Position|null {
    return this.stage==='regulator'?MISSION_POINTS.regulator:this.stage==='install'?MISSION_POINTS.winch:this.stage==='board'?MISSION_POINTS.ferry:null;
  }
  get interaction():string {
    return this.stage==='regulator'?'Take regulator':this.stage==='install'?'Install regulator':this.stage==='board'?'Board ferry':'';
  }
  canInteract():boolean {
    const p=this.encounter.player.state,t=this.target;
    return !!t&&p.health>0&&['idle','walk','run'].includes(p.action)&&Math.hypot(p.position.x-t.x,p.position.z-t.z)<1.3&&Math.abs(p.position.y-t.y)<.6&&!this.collision.blocked?.({...p.position,y:p.position.y+.6},{...t,y:t.y+.6});
  }
  start():void {
    this.encounter.clearEncounter(true);this.elapsed=0;this.powerTime=0;this.cues=[];
    this.stage=this.encounter.player.state.weapon==='baton'?'quay':'prepare';
  }
  leave():void{this.stage='inactive';this.powerTime=0;this.elapsed=0;this.cues=[];}
  update(dt:number,interact:boolean,quayReady:boolean):void {
    if(!this.active||this.stage==='complete'||dt<=0||this.encounter.player.state.health<=0)return;
    this.elapsed+=dt;
    switch(this.stage){
      case 'prepare':if(this.encounter.player.state.weapon==='baton')this.stage='quay';break;
      case 'quay':if(quayReady&&this.encounter.player.state.position.z>17.3){this.encounter.start(2,MISSION_WAVES[0],false);this.stage='passage-fight';this.cues.push('encounter');}break;
      case 'passage-fight':if(this.encounter.victorious)this.stage='regulator';break;
      case 'regulator':if(interact&&this.canInteract()){this.encounter.start(3,MISSION_WAVES[1],false);this.stage='winch-fight';this.cues.push('regulator');}break;
      case 'winch-fight':if(this.encounter.victorious)this.stage='install';break;
      case 'install':if(interact&&this.canInteract()){this.stage='powering';this.powerTime=0;this.cues.push('winch');}break;
      case 'powering':this.powerTime=Math.min(6,this.powerTime+dt);if(this.powerTime>=6)this.stage='board';break;
      case 'board':if(interact&&this.canInteract()){this.stage='complete';this.encounter.player.clearQueued();this.cues.push('complete');}break;
    }
  }
  drainCues():MissionCue[]{return this.cues.splice(0);}
}
