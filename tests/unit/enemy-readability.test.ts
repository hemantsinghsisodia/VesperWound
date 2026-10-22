import { describe,it,expect } from 'vitest';
import { EncounterSimulation } from '../../src/enemies/encounter-simulation';
import type { PlayerCollision } from '../../src/player/player-simulation';
import type { Position } from '../../src/player/combat-definitions';
import type { InputFrame } from '../../src/core/input-frame';
const frame:InputFrame={movement:{x:0,y:0},aim:{x:0,y:0},pressed:new Set(),held:new Set()};
class Ground implements PlayerCollision {
  blockedValue=false; freeze=false;
  move(p:Position,d:Position){return {position:this.freeze?{...p}:{x:p.x+d.x,y:.035,z:p.z+d.z},grounded:true};}
  blocked(){return this.blockedValue;}reset(){}dispose(){}
}
function setup(){const ground=new Ground(),sim=new EncounterSimulation(ground,[]);sim.start();const e=sim.enemies[0]!;e.position={x:0,y:.035,z:0};e.facing=0;sim.player.state.position={x:0,y:.035,z:.8};return {ground,sim,e};}
const tick=(sim:EncounterSimulation,n=1)=>{for(let i=0;i<n;i++)sim.update(1/60,frame);};
describe('enemy readable timing and truthful defenses',()=>{
  it('uses one clock, locks the last 250 ms and starts each attack at zero',()=>{
    const {sim,e}=setup();tick(sim);expect(e.action).toBe('windup');expect(e.attackElapsed).toBe(0);
    expect(sim.drainEvents().filter(e=>e.type==='enemy-warning')).toHaveLength(1);
    tick(sim,24);const facing=e.facing;sim.player.state.position.x=.1;tick(sim,14);
    expect(e.facing).toBe(facing);expect(e.action).toBe('windup');tick(sim);
    expect(e.action).toBe('active');expect(e.attackElapsed).toBeCloseTo(.65);
    tick(sim,8);expect(e.action).toBe('recovery');expect(e.attackElapsed).toBeCloseTo(47/60);
    tick(sim,54);expect(e.action).toBe('approach');expect(e.attackElapsed).toBe(1.67);
    expect(sim.drainEvents().filter(e=>e.type==='enemy-warning')).toHaveLength(0);
    tick(sim);expect(e.attackInstance).toBe(2);expect(e.attackElapsed).toBe(0);
  });
  it.each(['block','evade'] as const)('emits one %s only for a valid contact and consumes the strike',kind=>{
    const {ground,sim,e}=setup();ground.freeze=true;
    e.action='active';e.attackElapsed=.72;e.attackInstance=3;e.attackRecipient=sim.player.handle;
    const p=sim.player.state;p.action=kind==='block'?'ward':'dodge';p.actionTime=.06;p.wardRemaining=kind==='block'?.7:0;
    tick(sim);const events=sim.drainEvents().filter(v=>v.type===kind);
    expect(events).toHaveLength(1);expect(events[0]!.recipient).toEqual(sim.player.handle);expect(events[0]!.source.id).toBe(e.id);expect(events[0]!.attackInstance).toBe(3);expect(events[0]!.position.y).toBeGreaterThan(.8);
    expect(p.health).toBe(100);expect(e.hitPlayer).toBe(true);p.wardRemaining=0;p.action='idle';tick(sim,5);
    expect(p.health).toBe(100);expect(sim.drainEvents().filter(v=>v.type===kind)).toHaveLength(0);
  });
  it.each(['range','obstruction','old recipient'] as const)('does not award a defensive success for %s',reason=>{
    const {ground,sim,e}=setup();ground.freeze=true;e.action='active';e.attackElapsed=.72;e.attackRecipient=sim.player.handle;
    sim.player.state.action='dodge';sim.player.state.actionTime=.06;
    if(reason==='range')sim.player.state.position.z=2;
    if(reason==='obstruction')ground.blockedValue=true;
    if(reason==='old recipient')e.attackRecipient={...sim.player.handle,generation:-1};
    tick(sim);expect(sim.drainEvents().some(v=>v.type==='evade'||v.type==='block')).toBe(false);expect(e.hitPlayer).toBe(false);
  });
  it('a pause advances no combat clock and restart clears attack ownership',()=>{
    const {sim,e}=setup();tick(sim,20);const before=structuredClone(e);sim.update(0,frame);expect(e).toEqual(before);
    sim.restart();expect(sim.enemies[0]!.attackElapsed).toBe(0);expect(sim.enemies[0]!.attackRecipient).toBeNull();expect(sim.drainEvents()).toEqual([]);
  });
});
