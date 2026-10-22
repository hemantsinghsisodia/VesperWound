import { describe, it, expect } from 'vitest';
import { PlayerSimulation, type PlayerCollision, type Position } from '../../src/player/player-simulation';
import { BATON } from '../../src/player/weapon-definitions';
import type { InputAction, InputFrame } from '../../src/core/input-frame';
class Ground implements PlayerCollision {
  move(p:Position,d:Position){return {position:{x:p.x+d.x,y:.035,z:p.z+d.z},grounded:true};}
  reset(){} dispose(){}
}
const frame=(...pressed:InputAction[]):InputFrame=>({movement:{x:0,y:0},aim:{x:0,y:0},pressed:new Set(pressed),held:new Set()});
const tick=(p:PlayerSimulation,n:number)=>{for(let i=0;i<n;i++)p.update(1/60,frame());};
function setup(){const p=new PlayerSimulation(new Ground());p.equipBaton();p.training=false;p.state.position={x:0,y:.035,z:0};p.state.pressure=50;const t=p.targets[1]!;p.targets.splice(0,p.targets.length,t);t.position={x:0,y:.035,z:.85};return {p,t};}
describe('baton dodge cancellation',()=>{
  for(const id of [...BATON.light,BATON.heavy])for(const phase of ['windup','active','recovery'] as const)it(`${id} cancels during ${phase} before contact resolution`,()=>{
    const {p,t}=setup(),a=BATON.attacks[id]!;
    p.update(1/60,frame(a.kind==='heavy'?'heavy':'attack'),{x:0,z:1});
    p.state.attack=id;p.state.actionTime=phase==='windup'?0:phase==='active'?a.active[0]:a.active[1];
    p.state.pendingAttack='heavy';t.exposedUntil=2;t.posture=100;
    p.drainEvents();const sequence=p.state.actionSequence;
    p.update(1/60,frame('attack','dodge'),undefined,true);p.resolveAttack();
    expect(p.state.action).toBe('dodge');expect(p.state.actionTime).toBe(0);expect(p.state.attack).toBeNull();expect(p.state.pendingAttack).toBeNull();expect(p.state.combo).toBe(0);expect(p.state.actionSequence).toBeGreaterThan(sequence);
    expect(t.health).toBe(160);expect(t.posture).toBe(100);expect(t.exposedUntil).toBe(2);expect(t.velocity).toEqual({x:0,z:0});expect(p.state.pressure).toBe(50);expect(p.drainEvents()).toEqual([]);
    tick(p,50);expect(p.state.strikes).toBe(1);p.update(1/60,frame('attack'));expect(p.state.attack).toBe('baton-light1');
  });
  it('prioritizes dodge on the first input tick and never repeats held dodge',()=>{
    const {p}=setup();p.update(1/60,frame('heavy','dodge'));expect(p.state.action).toBe('dodge');expect(p.state.strikes).toBe(0);
    for(let i=0;i<60;i++)p.update(1/60,{...frame(),held:new Set(['dodge'])});expect(p.state.action).toBe('idle');
  });
  it('preserves prior damage and pressure awards while preventing later contacts',()=>{
    const {p,t}=setup();p.update(1/60,frame('heavy'),{x:0,z:1});tick(p,28);expect(t.health).toBe(88);expect(p.state.pressure).toBe(60);
    p.update(1/60,frame('dodge'));tick(p,60);expect(t.health).toBe(88);expect(t.hits).toBe(1);expect(p.state.pressure).toBe(60);
  });
  it('retains unarmed commitment and restrictions during Ward, hit and dodge',()=>{
    const p=new PlayerSimulation(new Ground());p.training=false;p.update(1/60,frame('heavy'));p.update(1/60,frame('dodge'));expect(p.state.action).toBe('heavy');tick(p,10);expect(p.state.action).toBe('heavy');
    for(const action of ['ward','hit','dodge','dead'] as const){const {p}=setup();p.state.action=action;p.state.actionTime=0;p.update(1/60,frame('dodge'));expect(p.state.action).toBe(action);expect(p.state.actionTime).toBeLessThan(.02);}
  });
  it.each([0,2,3,9,10])('keeps the dodge invulnerability window at tick %i',n=>{
    const {p}=setup();p.update(1/60,frame('heavy'));p.update(1/60,frame('dodge'));tick(p,n);
    const immune=n>=3&&n<=9;expect(p.state.invulnerable).toBe(immune);expect(p.damage(20,{id:'zombie',generation:1},1,{x:0,y:1,z:0})).toBe(!immune);
    expect(p.state.health).toBe(immune?100:80);expect(p.drainEvents().some(e=>e.type==='evade')).toBe(immune);
  });
  it('uses exact boosted health damage and unchanged posture, including two-heavy defeat',()=>{
    expect([...BATON.light,BATON.heavy].map(id=>BATON.attacks[id]!.damage)).toEqual([32,41,54,72]);
    expect([...BATON.light,BATON.heavy].map(id=>BATON.attacks[id]!.posture)).toEqual([15,20,30,50]);
    const {p,t}=setup();t.health=120;t.maxHealth=120;
    for(let i=0;i<2;i++){p.state.position={x:0,y:.035,z:0};t.position={x:0,y:.035,z:.85};t.velocity={x:0,z:0};p.update(1/60,frame('heavy'),{x:0,z:1});tick(p,49);}
    expect(t.health).toBe(0);expect(t.hits).toBe(2);expect(p.state.criticals).toBe(0);
  });
});
