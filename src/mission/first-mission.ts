import type { EncounterSimulation } from '../enemies/encounter-simulation';
import type { PlayerCollision } from '../player/player-simulation';
import type { Position } from '../player/combat-definitions';

export type MissionStage = 'inactive' | 'introduction' | 'prepare' | 'quay' | 'passage-fight' | 'regulator' | 'winch-approach' | 'winch-fight' | 'install' | 'powering' | 'board' | 'departure' | 'complete';
export type MissionCue = 'regulator' | 'winch' | 'release' | 'departure' | 'complete' | 'encounter';
export interface MissionSnapshot {
  readonly stage: MissionStage;
  readonly progress: number;
  readonly objective: {title:string;detail:string};
  readonly interaction: string;
  readonly canInteract: boolean;
  readonly gameplayEnabled: boolean;
  readonly cinematic: boolean;
  readonly hidePlayer: boolean;
  readonly fade: number;
  readonly hint: string;
  readonly activeSeconds: number;
  readonly cinematicSeconds: number;
}
export const MISSION_POINTS = {
  regulator:{x:-5,y:.035,z:22.5}, winch:{x:3,y:.035,z:24.4}, ferry:{x:0,y:.035,z:30},
} satisfies Record<string,Position>;
export const MISSION_WAVES:readonly (readonly Position[])[] = [
  [{x:-.9,y:.035,z:19.5},{x:-4.8,y:.035,z:21.5}],
  [{x:1,y:.035,z:24},{x:1.7,y:.035,z:26.2},{x:-.5,y:.035,z:26.3}],
];
export const MISSION_OBJECTIVES:Record<MissionStage,{title:string;detail:string}> = {
  inactive:{title:'Restart the Ferry Winch',detail:'Recover a regulator. Restore pressure. Leave Ash Quay.'},
  introduction:{title:'The ferry is stranded',detail:'The ferry cannot leave. Recover a regulator and restore the winch.'},
  prepare:{title:'Take the steel baton',detail:'Pressure Court · beside the amber marker.'},
  quay:{title:'Reach Arrival Quay',detail:'Follow the quay sign through Pump Alley.'},
  'passage-fight':{title:'Clear the quay approach',detail:'Two dock workers block the loading bay.'},
  regulator:{title:'Recover the regulator',detail:'West loading bay · the open service case. Safe to catch your breath.'},
  'winch-approach':{title:'Reach the ferry winch',detail:'East apron · three guards stand between you and the socket.'},
  'winch-fight':{title:'Clear the winch apron',detail:'Keep space to defend. The winch is just beyond the guards.'},
  install:{title:'Install the regulator',detail:'East apron · amber socket beside the crane.'},
  powering:{title:'Pressure returning',detail:'Socket → pressure → winch → boarding ramp.'},
  board:{title:'Board the ferry',detail:'Quay edge · the green boarding signal.'},
  departure:{title:'Leaving Ash Quay',detail:'The pressure holds. The route is open.'},
  complete:{title:'Route restored',detail:'The ferry has left Ash Quay.'},
};

/** Session-owned CPU progression. Presentation and active-play clocks are separate. */
export class FirstMission {
  stage:MissionStage='inactive';
  elapsed=0;
  cinematicTime=0;
  phaseTime=0;
  powerTime=0;
  private introduced=false;
  private hintTime=0;
  private hint='';
  private readonly seenHints=new Set<string>();
  private cues:MissionCue[]=[];
  constructor(readonly encounter:EncounterSimulation,private readonly collision:PlayerCollision){}
  get active():boolean{return this.stage!=='inactive';}
  get cinematic():boolean{return this.stage==='introduction'||this.stage==='departure';}
  get gameplayEnabled():boolean{return !this.cinematic&&this.stage!=='complete';}
  get departureProgress():number{return this.stage==='complete'?1:this.stage==='departure'?Math.min(1,this.phaseTime/6):0;}
  get ramp():number{
    if(this.stage==='departure'||this.stage==='complete')return Math.max(0,1-this.departureProgress*3);
    return Math.max(0,Math.min(1,(this.powerTime-3)/3));
  }
  get objective(){return MISSION_OBJECTIVES[this.stage];}
  get target():Position|null {
    return this.stage==='regulator'?MISSION_POINTS.regulator:['winch-approach','install'].includes(this.stage)?MISSION_POINTS.winch:this.stage==='board'?MISSION_POINTS.ferry:null;
  }
  get interaction():string {
    return this.stage==='regulator'?'Take regulator':this.stage==='install'?'Install regulator':this.stage==='board'?'Board ferry':'';
  }
  get snapshot():MissionSnapshot {
    const progress=this.stage==='introduction'?Math.min(1,this.phaseTime/4):this.stage==='powering'?this.powerTime/6:this.departureProgress;
    const departure=this.stage==='departure';
    return {stage:this.stage,progress,objective:this.objective,interaction:this.interaction,canInteract:this.canInteract(),gameplayEnabled:this.gameplayEnabled,cinematic:this.cinematic,
      hidePlayer:this.stage==='complete'||(departure&&this.phaseTime>=.25),fade:departure?Math.max(0,1-Math.abs(this.phaseTime-.25)/.25):0,
      hint:this.hintTime>0?this.hint:'',activeSeconds:this.elapsed,cinematicSeconds:this.cinematicTime};
  }
  canInteract():boolean {
    const p=this.encounter.player.state,t=this.target;
    return !!this.interaction&&!!t&&p.health>0&&['idle','walk','run'].includes(p.action)&&Math.hypot(p.position.x-t.x,p.position.z-t.z)<1.3&&Math.abs(p.position.y-t.y)<.6&&!this.collision.blocked?.({...p.position,y:p.position.y+.6},{...t,y:t.y+.6});
  }
  private enter(stage:MissionStage):void {
    this.stage=stage;this.phaseTime=0;this.hintTime=0;this.encounter.clearQueued();
    const hint=stage==='prepare'?'F / Pick up — equip the steel baton.':stage==='passage-fight'?'Amber windup: Space / Dodge or Q / Ward, then counter.':stage==='install'?'F / Install regulator — use the amber socket.':'';
    if(hint&&!this.seenHints.has(stage)){this.seenHints.add(stage);this.hint=hint;this.hintTime=7;}
  }
  start(introduction=true):void {
    this.encounter.clearEncounter(true);this.elapsed=0;this.cinematicTime=0;this.powerTime=0;this.cues=[];this.hintTime=0;
    const show=introduction&&!this.introduced;this.introduced=true;
    this.enter(show?'introduction':this.encounter.player.state.weapon==='baton'?'quay':'prepare');
  }
  leave():void{this.enter('inactive');this.powerTime=0;this.elapsed=0;this.cinematicTime=0;this.hintTime=0;this.cues=[];}
  skip():void {
    if(this.stage==='introduction')this.enter(this.encounter.player.state.weapon==='baton'?'quay':'prepare');
    else if(this.stage==='departure'){this.enter('complete');this.cues.push('complete');}
  }
  update(dt:number,interact:boolean,quayReady:boolean):void {
    if(!this.active||this.stage==='complete'||dt<=0||this.encounter.player.state.health<=0)return;
    this.phaseTime+=dt;
    if(this.cinematic){this.cinematicTime+=dt;if(this.phaseTime+1e-8>=(this.stage==='introduction'?4:6))this.skip();return;}
    this.elapsed+=dt;this.hintTime=Math.max(0,this.hintTime-dt);
    switch(this.stage){
      case 'prepare':if(this.encounter.player.state.weapon==='baton')this.enter('quay');break;
      case 'quay':if(quayReady&&this.encounter.player.state.position.z>17.3){this.encounter.start(2,MISSION_WAVES[0],false);this.enter('passage-fight');this.cues.push('encounter');}break;
      case 'passage-fight':if(this.encounter.victorious)this.enter('regulator');break;
      case 'regulator':if(interact&&this.canInteract()){this.encounter.start(3,MISSION_WAVES[1],false,true);this.enter('winch-approach');this.cues.push('regulator');}break;
      case 'winch-approach':{
        const p=this.encounter.player.state.position;
        if(!this.encounter.awaitingActivation||(p.x>=-1.8&&p.z>=23)){this.encounter.activate();this.enter('winch-fight');this.cues.push('encounter');}break;
      }
      case 'winch-fight':if(this.encounter.victorious)this.enter('install');break;
      case 'install':if(interact&&this.canInteract()){this.enter('powering');this.powerTime=0;this.cues.push('winch');}break;
      case 'powering':{
        const before=this.powerTime;this.powerTime=Math.min(6,this.powerTime+dt);
        if(before<2&&this.powerTime>=2)this.cues.push('release');
        if(Math.floor(before)!==Math.floor(this.powerTime)&&this.powerTime<6)this.cues.push('winch');
        if(this.powerTime+1e-8>=6){this.powerTime=6;this.enter('board');}break;
      }
      case 'board':if(interact&&this.canInteract()){this.enter('departure');this.cues.push('departure');}break;
    }
  }
  drainCues():MissionCue[]{return this.cues.splice(0);}
}
