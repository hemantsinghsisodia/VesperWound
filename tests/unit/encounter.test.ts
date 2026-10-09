import { describe, expect, it } from 'vitest';
import { EncounterSimulation } from '../../src/enemies/encounter-simulation';
import { GroundNavigation } from '../../src/enemies/navigation';
import { ATTACKS, attackTouches, type Position } from '../../src/player/combat-definitions';
import type { InputAction, InputFrame } from '../../src/core/input-frame';
import type { PlayerCollision } from '../../src/player/player-simulation';
const frame=(pressed:InputAction[]=[]):InputFrame=>({movement:{x:0,y:0},aim:{x:0,y:0},pressed:new Set(pressed),held:new Set()});
class Ground implements PlayerCollision {
  obstruction=false;
  raised=false;
  move(p:Position,d:Position){return {position:{x:p.x+d.x,y:this.raised?1:.035,z:p.z+d.z},grounded:true};}
  moveTarget(_id:string,p:Position,d:Position){return {x:p.x+d.x,y:p.y,z:p.z+d.z};}
  blocked(){return this.obstruction;}reset(){}dispose(){}
}
const create=()=>new EncounterSimulation(new Ground(),[]);
function tick(e:EncounterSimulation,seconds:number){for(let i=0;i<Math.ceil(seconds*60);i++)e.update(1/60,frame());}
describe('first enemy encounter',()=>{
  it('detects with line of sight and follows at its authored simulation speed',()=>{
    const g=new Ground(),e=new EncounterSimulation(g,[]);e.start();g.obstruction=true;tick(e,1);expect(e.enemies[0]!.action).toBe('idle');g.obstruction=false;
    const before=e.enemies[0]!.position.x;tick(e,.5);expect(before-e.enemies[0]!.position.x).toBeCloseTo(.75,1);expect(e.player.state.ventWarning).toBe(false);
  });
  it('telegraphs, locks facing, hits once, then recovers; Ward blocks the strike',()=>{
    const e=create();e.start();const enemy=e.enemies[0]!;e.player.state.position={x:enemy.position.x-.75,y:.035,z:enemy.position.z};tick(e,.45);
    expect(enemy.action).toBe('windup');const facing=enemy.facing;e.player.state.position.z+=.1;tick(e,.1);expect(enemy.facing).toBe(facing);
    e.update(1/60,frame(['ward']));tick(e,.4);expect(e.player.state.health).toBe(100);expect(e.player.state.blocks).toBe(1);expect(e.player.state.pressure).toBe(75);
    tick(e,.5);expect(enemy.action).toBe('recovery');expect(e.player.state.blocks).toBe(1);
    const block=e.drainEvents().find(v=>v.type==='block');expect(block?.source.id).toBe(enemy.id);expect(block?.recipient?.id).toBe('medic');expect(block?.attackInstance).toBe(enemy.attackInstance);
  });
  it('dodges the active strike and prevents obstruction hits',()=>{
    const e=create();e.start();const enemy=e.enemies[0]!;e.player.state.position={x:enemy.position.x-.75,y:.035,z:enemy.position.z};tick(e,.6);e.update(1/60,frame(['dodge']));tick(e,.3);expect(e.player.state.health).toBe(100);
    const g=new Ground(),blocked=new EncounterSimulation(g,[]);blocked.start();const t=blocked.enemies[0]!;t.action='active';t.attackRecipient=blocked.player.handle;t.facing=-Math.PI/2;blocked.player.state.position={x:t.position.x-.75,y:.035,z:t.position.z};g.obstruction=true;blocked.update(1/60,frame());expect(blocked.player.state.health).toBe(100);
  });
  it('permits simultaneous lethal contacts collected at the start of resolution',()=>{
    const e=create();e.start();const enemy=e.enemies[0]!;e.player.state.position={x:enemy.position.x-.75,y:.035,z:enemy.position.z};e.player.state.facing=Math.PI/2;
    e.player.state.action='heavy';e.player.state.attack='heavy';e.player.state.actionTime=.43;enemy.health=30;enemy.action='active';enemy.attackRecipient=e.player.handle;enemy.facing=-Math.PI/2;
    e.update(1/60,frame());expect(enemy.health).toBe(0);expect(enemy.action).toBe('dead');expect(e.player.state.health).toBe(80);expect(e.victorious).toBe(true);tick(e,5);expect(enemy.health).toBe(0);
  });
  it('stagger cancels windup and critical consumes exactly one opening',()=>{
    const e=create();e.start();const enemy=e.enemies[0]!;enemy.posture=50;enemy.action='windup';enemy.actionTime=.2;
    e.player.state.position={x:enemy.position.x-.75,y:.035,z:enemy.position.z};e.player.state.facing=Math.PI/2;e.player.state.action='heavy';e.player.state.attack='heavy';e.player.state.actionTime=.43;
    e.update(1/60,frame());expect(enemy.action).toBe('stagger');expect(enemy.health).toBe(90);tick(e,.92);
    e.player.state.position={x:enemy.position.x-.75,y:.035,z:enemy.position.z};e.update(1/60,frame(['heavy']),enemy.position);tick(e,.5);expect(enemy.health).toBe(30);expect(e.player.state.criticals).toBe(1);expect(enemy.exposedUntil).toBe(0);
  });
  it('recovers posture after two seconds and returns when unreachable without healing',()=>{
    const g=new Ground(),e=new EncounterSimulation(g,[]);e.start();const enemy=e.enemies[0]!;enemy.health=70;enemy.posture=100;enemy.exposedUntil=e.player.time+2;enemy.action='stagger';tick(e,2.05);expect(enemy.posture).toBe(0);
    g.raised=true;for(let i=0;i<150;i++)e.update(1/60,frame());expect(['return','idle']).toContain(enemy.action);expect(enemy.health).toBe(70);
  });
  it('releases attack slots on death/stagger, separates three pooled instances and clears stale generations',()=>{
    const e=create();e.start(3);for(const enemy of e.enemies)enemy.position.x=e.player.state.position.x+.75;
    e.update(1/60,frame());expect(e.enemies.filter(v=>v.action==='windup')).toHaveLength(1);const first=e.enemies.find(v=>v.action==='windup')!;first.health=0;e.update(1/60,frame());e.update(1/60,frame());expect(e.enemies.some(v=>v.health>0&&v.action==='windup')).toBe(true);
    const old=e.enemies[0]!.generation;e.restart();expect(e.enemies).toHaveLength(3);expect(e.enemies[0]!.generation).toBeGreaterThan(old);expect(e.player.state.health).toBe(100);expect(e.drainEvents()).toEqual([]);
    e.player.state.action='attack';e.player.state.attack='jab';e.clearQueued();e.training();expect(e.player.targets).toHaveLength(3);expect(e.player.training).toBe(true);expect(e.player.state.action).toBe('idle');
  });
  it('bounds manual fist reach and rejects side/vertical misses',()=>{
    const origin={x:0,y:.035,z:0};expect(attackTouches(ATTACKS.jab,origin,0,{x:0,y:.035,z:.8})).toBe(true);
    expect(attackTouches(ATTACKS.jab,origin,0,{x:0,y:.035,z:1.1})).toBe(false);expect(attackTouches(ATTACKS.jab,origin,0,{x:.65,y:.035,z:.6})).toBe(false);expect(attackTouches(ATTACKS.jab,origin,0,{x:0,y:1,z:.8})).toBe(false);
  });
  it('returns inside its spawn leash without teleporting or healing',()=>{
    const e=create();e.start();const enemy=e.enemies[0]!;enemy.health=55;enemy.position.x=-6.7;e.player.state.position.x=-7;
    tick(e,.1);expect(enemy.action).toBe('return');expect(enemy.position.x).toBeGreaterThan(-6.7);expect(enemy.position.x).toBeLessThan(-6.4);expect(enemy.health).toBe(55);
    tick(e,6);expect(enemy.action).toBe('idle');expect(Math.abs(enemy.position.x-enemy.spawn.x)).toBeLessThan(.15);expect(enemy.health).toBe(55);
  });
  it('rejects a contact addressed to the previous player generation',()=>{
    const e=create();e.start();const old=e.player.handle;e.restart();const enemy=e.enemies[0]!;
    enemy.action='active';enemy.attackRecipient=old;enemy.facing=-Math.PI/2;e.player.state.position={x:enemy.position.x-.75,y:.035,z:enemy.position.z};
    e.update(1/60,frame());expect(e.player.state.health).toBe(100);expect(enemy.hitPlayer).toBe(false);
  });
  it.each(['unarmed','baton'] as const)('uses the same %s state sequence regardless of presentation quality',weapon=>{
    const high=create(),low=create();if(weapon==='baton'){high.player.equipBaton();low.player.equipBaton();}high.start();low.start();for(let i=0;i<600;i++){const input=frame(i%60===0?['heavy']:i%97===0?['ward']:[]);high.update(1/60,input);low.update(1/60,input);}expect(high.enemies).toEqual(low.enemies);expect(high.player.state).toEqual(low.player.state);
  });
});
describe('courtyard navigation',()=>{
  it('routes around solids without cutting diagonal corners and rejects raised ground',()=>{
    const nav=new GroundNavigation([{position:{x:0,y:1,z:0},half:{x:.4,y:1,z:1}}]);const goal={x:2,y:.035,z:0};nav.plan(goal,0);
    let p={x:-2,y:.035,z:0};expect(nav.reachable(p)).toBe(true);
    for(let i=0;i<300;i++){const d=nav.direction(p,goal)!;p={x:p.x+d.x*.025,y:p.y,z:p.z+d.z*.025};expect(Math.abs(p.x)<.7&&Math.abs(p.z)<1.25).toBe(false);}
    expect(p.x).toBeGreaterThan(1.5);nav.plan({...goal,y:1},1);expect(nav.reachable(p)).toBe(false);
  });
});
