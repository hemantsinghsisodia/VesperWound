import type { InputFrame } from '../core/input-frame';
import { PlayerSimulation, type PlayerCollision } from '../player/player-simulation';
import { TRAINING_TARGETS, attackTouches, type CombatEvent, type CombatantState, type EntityHandle, type Position } from '../player/combat-definitions';
import { courtyardSolids, type CollisionBox } from '../player/collision-math';
import { GroundNavigation } from './navigation';
import { ZOMBIE7, type EnemyDefinition, type EnemyAction } from './enemy-definition';
export interface EnemyState extends CombatantState {
  action: EnemyAction; actionTime: number; facing: number; sequence: number; attackInstance: number;
  hitPlayer: boolean; attackRecipient: EntityHandle | null; unreachable: number;
}
const distance=(a:Position,b:Position)=>Math.hypot(a.x-b.x,a.z-b.z);
/** Owns combat ordering, AI, navigation and entity lifetimes across art reloads. */
export class EncounterSimulation {
  readonly player: PlayerSimulation;
  readonly enemies: EnemyState[] = [];
  mode: 'training'|'encounter' = 'training';
  private readonly navigation: GroundNavigation;
  private readonly homeNavigation: GroundNavigation[];
  private generation = 0;
  private events: CombatEvent[] = [];
  private slot: string|null = null;
  constructor(private readonly collision: PlayerCollision, boxes: readonly CollisionBox[], readonly definition: EnemyDefinition = ZOMBIE7) {
    this.player=new PlayerSimulation(collision);this.navigation=new GroundNavigation(courtyardSolids(boxes));
    this.homeNavigation=Array.from({length:3},()=>new GroundNavigation(courtyardSolids(boxes)));
  }
  get victorious(): boolean {return this.mode==='encounter'&&this.enemies.length>0&&this.enemies.every(e=>e.health===0);}
  start(count=1): void {
    if(count<1||count>3||!Number.isInteger(count)) throw new Error('Encounter capacity is three');
    this.generation++;this.mode='encounter';this.player.training=false;this.enemies.length=0;
    for(let i=0;i<count;i++) {
      const spawn={...this.definition.spawn,x:this.definition.spawn.x+i*.8};
      this.enemies.push({id:`zombie7-${i}`,generation:this.generation,label:this.definition.displayName,spawn,position:{...spawn},previous:{...spawn},health:this.definition.maxHealth,maxHealth:this.definition.maxHealth,posture:0,exposedUntil:0,defeatedUntil:0,mass:1,velocity:{x:0,z:0},hits:0,action:'idle',actionTime:0,facing:-Math.PI/2,sequence:0,attackInstance:0,hitPlayer:false,attackRecipient:null,unreachable:0});
    }
    this.player.targets.splice(0,this.player.targets.length,...this.enemies);this.player.reset();this.slot=null;this.events=[];
  }
  training(): void {
    this.mode='training';this.enemies.length=0;this.slot=null;this.player.training=true;
    this.player.targets.splice(0,this.player.targets.length,...TRAINING_TARGETS.map(t=>({...t,generation:++this.generation,position:{...t.position},previous:{...t.position},spawn:{...t.position},health:t.maxHealth,posture:0,exposedUntil:0,defeatedUntil:0,velocity:{x:0,z:0},hits:0})));
    this.player.reset();this.events=[];
  }
  restart(): void {if(this.mode==='encounter')this.start(this.enemies.length||1);else this.player.reset();}
  clearQueued(): void {this.player.clearQueued();}
  update(dt:number,input:InputFrame,aim?:{x:number;z:number}):void {
    if(dt<=0)return;
    if(this.mode==='training'){this.player.update(dt,input,aim);this.events.push(...this.player.drainEvents());return;}
    const time=this.player.time+dt;
    this.navigation.plan(this.player.state.position,time);
    const previous=this.enemies.map(e=>({...e.position}));
    for(const e of this.enemies) this.advance(e,dt,time);
    this.collision.syncTargets?.(this.enemies);
    this.player.update(dt,input,aim,true);
    this.enemies.forEach((e,i)=>{e.previous=previous[i]!;});
    // Collect enemy contacts before applying Medic's hits. A lethal/stagger hit
    // does not retroactively erase a strike already active on this same tick.
    const contacts=this.enemies.filter(e=>e.health>0&&e.action==='active'&&!e.hitPlayer&&e.attackRecipient?.generation===this.player.generation&&this.player.state.action!=='dead'&&attackTouches(this.definition.attack,e.position,e.facing,this.player.state.position,.28)&&!this.obstructed(e.position,this.player.state.position)).map(e=>({enemy:e,source:{id:e.id,generation:e.generation}}));
    this.player.resolveAttack();
    this.events.push(...this.player.drainEvents());
    for(const {enemy,source} of contacts){enemy.hitPlayer=true;if(this.player.damage(this.definition.attack.damage,source,enemy.attackInstance))this.events.push({type:'hit',attack:'enemy-strike',target:'medic',instance:enemy.attackInstance,damage:this.definition.attack.damage,posture:0,critical:false,position:{...this.player.state.position},source,recipient:this.player.handle,attackInstance:enemy.attackInstance});}
    this.events.push(...this.player.drainEvents());
    for(const e of this.enemies){
      if(e.health===0&&e.action!=='dead')this.action(e,'dead');
      else if(e.exposedUntil>time&&e.action!=='stagger'&&e.health>0)this.action(e,'stagger');
    }
    this.collision.syncTargets?.(this.enemies);
  }
  private obstructed(a:Position,b:Position):boolean{return this.collision.blocked?.({...a,y:a.y+1},{...b,y:b.y+1})??false;}
  private action(e:EnemyState,action:EnemyAction):void {
    if(e.action===action)return;
    if(['recovery','stagger','dead','return','idle'].includes(action)&&this.slot===e.id)this.slot=null;
    e.action=action;e.actionTime=0;e.sequence++;
  }
  private advance(e:EnemyState,dt:number,time:number):void {
    e.actionTime+=dt;
    if(e.action==='dead')return;
    if(this.player.state.action==='dead'){this.action(e,'idle');return;}
    if(e.action==='stagger'){if(e.exposedUntil<=time){e.exposedUntil=0;e.posture=0;this.action(e,'approach');}else return;}
    const d=distance(e.position,this.player.state.position),home=distance(e.position,e.spawn);
    if(home>this.definition.leash&&!['dead','stagger'].includes(e.action))this.action(e,'return');
    if(e.action==='return') {
      if(home<.15){this.action(e,'idle');e.unreachable=0;return;}
      const index=this.enemies.indexOf(e);const nav=this.homeNavigation[index]!;nav.plan(e.spawn,time);
      this.move(e,nav.direction(e.position,e.spawn),dt);return;
    }
    if(e.action==='windup') {
      if(e.actionTime<.4)e.facing=Math.atan2(this.player.state.position.x-e.position.x,this.player.state.position.z-e.position.z);
      if(e.actionTime>=this.definition.attack.active[0]){this.action(e,'active');this.events.push({type:'swing',attack:'enemy-strike',instance:e.attackInstance,position:{...e.position},source:{id:e.id,generation:e.generation},recipient:e.attackRecipient,attackInstance:e.attackInstance});}return;
    }
    if(e.action==='active'){if(e.actionTime>=this.definition.attack.active[1]-this.definition.attack.active[0])this.action(e,'recovery');return;}
    if(e.action==='recovery'){if(e.actionTime>=this.definition.attack.duration-this.definition.attack.active[1])this.action(e,'approach');return;}
    if(e.action==='idle'){if(d<=this.definition.detection&&this.navigation.reachable(e.position)&&!this.obstructed(e.position,this.player.state.position))this.action(e,'approach');else return;}
    if(!this.navigation.reachable(e.position)){e.unreachable+=dt;if(e.unreachable>=2)this.action(e,'return');return;}e.unreachable=0;
    const aim=Math.atan2(this.player.state.position.x-e.position.x,this.player.state.position.z-e.position.z);e.facing=aim;
    if(d<1.05&&!this.obstructed(e.position,this.player.state.position)&&this.slot===null) {
      this.slot=e.id;e.hitPlayer=false;e.attackInstance++;e.attackRecipient=this.player.handle;this.action(e,'windup');
      this.events.push({type:'enemy-warning',position:{...e.position},source:{id:e.id,generation:e.generation},recipient:this.player.handle,attackInstance:e.attackInstance});return;
    }
    if(d<.7)return;
    this.move(e,this.navigation.direction(e.position,this.player.state.position),dt);
  }
  private move(e:EnemyState,direction:{x:number;z:number}|null,dt:number):void {
    if(!direction)return;
    let x=direction.x,z=direction.z;
    for(const other of this.enemies)if(other!==e&&other.health>0){const d=distance(e.position,other.position);if(d<.9&&d>.001){x+=(e.position.x-other.position.x)/d*(.9-d)*2;z+=(e.position.z-other.position.z)/d*(.9-d)*2;}}
    const magnitude=Math.max(1,Math.hypot(x,z));x/=magnitude;z/=magnitude;e.facing=Math.atan2(x,z);
    const displacement={x:x*this.definition.speed*dt,y:0,z:z*this.definition.speed*dt};
    const next=this.collision.moveTarget?.(e.id,e.position,displacement)??{x:e.position.x+displacement.x,y:e.position.y,z:e.position.z+displacement.z};
    if(Math.abs(next.x)<=7.5&&Math.abs(next.z)<=7.5)e.position=next;
  }
  drainEvents():CombatEvent[]{return this.events.splice(0);}
  dispose():void{this.events=[];this.enemies.length=0;this.player.dispose();}
}
