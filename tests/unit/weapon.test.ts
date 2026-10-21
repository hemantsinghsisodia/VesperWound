import { describe, it, expect } from 'vitest';
import { PlayerSimulation, type PlayerCollision, type Position } from '../../src/player/player-simulation';
import { WeaponPickup } from '../../src/player/weapon-pickup';
import { BATON } from '../../src/player/weapon-definitions';
import { weaponTouches } from '../../src/player/weapon-contact';
import type { InputAction, InputFrame } from '../../src/core/input-frame';
class Ground implements PlayerCollision {
  obstruction=false;
  move(p:Position,d:Position){return {position:{x:p.x+d.x,y:.035,z:p.z+d.z},grounded:true};}
  blocked(){return this.obstruction;} reset(){} dispose(){}
}
const frame=(pressed:InputAction[]=[]):InputFrame=>({movement:{x:0,y:0},aim:{x:0,y:0},pressed:new Set(pressed),held:new Set()});
const tick=(p:PlayerSimulation,n:number)=>{for(let i=0;i<n;i++)p.update(1/60,frame());};
describe('steel baton',()=>{
  it('validates range, obstruction, living and free action',()=>{
    const ground=new Ground(),p=new PlayerSimulation(ground);expect(p.canPickupBaton()).toBe(true);
    ground.obstruction=true;expect(p.canPickupBaton()).toBe(false);ground.obstruction=false;
    for(const action of ['attack','heavy','ward','dodge','hit','dead'] as const){p.state.action=action;expect(p.canPickupBaton()).toBe(false);}
    p.state.action='idle';p.state.health=0;expect(p.canPickupBaton()).toBe(false);p.state.health=100;p.state.position.x=5;expect(p.canPickupBaton()).toBe(false);
  });
  it('equips only on a revalidated fixed update, deduplicates requests and retains equipment on reset',()=>{
    const p=new PlayerSimulation(new Ground()),pickup=new WeaponPickup(),id=pickup.update(p,true,true)!;
    expect(pickup.update(p,true,true)).toBeNull();pickup.complete(id);expect(p.state.weapon).toBe('unarmed');pickup.update(p,false,true);
    expect(p.state.weapon).toBe('baton');p.reset();expect(p.state.weapon).toBe('baton');expect(new PlayerSimulation(new Ground()).state.weapon).toBe('unarmed');
  });
  it('rejects stale callbacks after range, generation and scene cancellation; retries failures',()=>{
    const p=new PlayerSimulation(new Ground()),pickup=new WeaponPickup();let id=pickup.update(p,true,true)!;
    p.state.position.x=4;pickup.update(p,false,true);pickup.complete(id);expect(pickup.status).toBe('available');p.reset();
    id=pickup.update(p,true,true)!;p.reset();pickup.update(p,false,true);pickup.complete(id);expect(p.state.weapon).toBe('unarmed');
    id=pickup.update(p,true,true)!;pickup.update(p,false,false);pickup.complete(id);expect(pickup.status).toBe('available');
    id=pickup.update(p,true,true)!;pickup.failed(id,'failed');expect(pickup.status).toBe('failed');expect(pickup.update(p,true,true)).toBeGreaterThan(id);
  });
  it('uses the armed chain and precise defined damage with deduplication and pressure once',()=>{
    const p=new PlayerSimulation(new Ground());p.equipBaton();p.training=false;p.state.pressure=50;
    const t=p.targets[1]!;p.targets.splice(0,p.targets.length,t);t.position={x:0,y:.035,z:.85};t.spawn={...t.position};
    const ids=[];
    for(let i=0;i<3;i++){p.state.position={x:0,y:.035,z:0};t.position={...t.spawn};t.velocity={x:0,z:0};p.update(1/60,frame(['attack']),{x:0,z:1});ids.push(p.state.attack);tick(p,Math.ceil(p.attackDefinition(p.state.attack!).duration*60)+1);}
    expect(ids).toEqual(BATON.light);expect(t.health).toBe(160-21-27-36);expect(t.hits).toBe(3);expect(p.state.pressure).toBe(80);
  });
  it('starts on the next update, retains one early follow-up and resets the chain after 600 ms',()=>{
    const p=new PlayerSimulation(new Ground());p.equipBaton();p.training=false;
    p.update(1/60,frame(['attack']));expect(p.state.attack).toBe('baton-light1');expect(p.state.actionTime).toBe(0);
    tick(p,3);p.update(1/60,frame(['attack']));expect(p.state.pendingAttack).toBe('attack');tick(p,22);
    expect(p.state.strikes).toBe(1);tick(p,1);expect(p.state.attack).toBe('baton-light2');expect(p.state.actionTime).toBe(0);
    p.update(1/60,frame(['attack']));tick(p,29);expect(p.state.strikes).toBe(3);expect(p.state.attack).toBe('baton-light3');
    tick(p,73);p.update(1/60,frame(['attack']));expect(p.state.attack).toBe('baton-light1');
  });
  it('replaces the single choice with the latest press and starts fresh repeated heavy instances',()=>{
    const p=new PlayerSimulation(new Ground());p.equipBaton();p.training=false;
    p.update(1/60,frame(['heavy']));const sequence=p.state.actionSequence;
    p.update(1/60,frame(['attack']));expect(p.state.pendingAttack).toBe('attack');
    p.update(1/60,frame(['heavy']));expect(p.state.pendingAttack).toBe('heavy');
    tick(p,46);expect(p.state.attack).toBe('baton-heavy');expect(p.state.actionTime).toBe(0);
    expect(p.state.actionSequence).toBeGreaterThan(sequence);expect(p.state.strikes).toBe(2);expect(p.state.pendingAttack).toBeNull();
    tick(p,49);expect(p.state.strikes).toBe(2);
  });
  it('preserves press order when light and heavy arrive in the same fixed tick',()=>{
    const p=new PlayerSimulation(new Ground());p.equipBaton();p.training=false;
    p.update(1/60,frame(['attack']));
    p.update(1/60,frame(['heavy','attack']));expect(p.state.pendingAttack).toBe('attack');
    p.update(1/60,frame(['attack','heavy']));expect(p.state.pendingAttack).toBe('heavy');
  });
  it('never repeats a held button and clears pending strikes on interruption, reset and suspension',()=>{
    const p=new PlayerSimulation(new Ground());p.equipBaton();p.training=false;
    p.update(1/60,frame(['attack']));
    for(let i=0;i<60;i++)p.update(1/60,{...frame(),held:new Set(['attack'])});
    expect(p.state.strikes).toBe(1);
    for(const clear of [()=>p.damage(1),()=>p.clearQueued(),()=>p.reset()]){
      tick(p,60);p.update(1/60,frame(['attack']));p.update(1/60,frame(['heavy']));expect(p.state.pendingAttack).toBe('heavy');
      clear();expect(p.state.pendingAttack).toBeNull();const strikes=p.state.strikes;tick(p,60);expect(p.state.strikes).toBe(strikes);
    }
    p.update(1/60,frame(['attack']));p.update(1/60,frame(['attack']));p.damage(100);tick(p,60);expect(p.state.action).toBe('dead');expect(p.state.pendingAttack).toBeNull();
  });
  it('lets a recovery dodge win over the queued follow-up but commits windup and active frames',()=>{
    const p=new PlayerSimulation(new Ground());p.equipBaton();p.training=false;
    p.update(1/60,frame(['attack']));p.update(1/60,frame(['heavy','dodge']));
    expect(p.state.action).toBe('attack');tick(p,11);expect(p.state.action).toBe('attack');
    tick(p,3);p.update(1/60,frame(['dodge']));expect(p.state.action).toBe('dodge');expect(p.state.pendingAttack).toBeNull();
    tick(p,60);expect(p.state.strikes).toBe(1);
  });
  it('has contact boundaries and cannot hit through solids',()=>{
    for(const id of [...BATON.light,BATON.heavy]){
      const a=BATON.attacks[id]!,origin={x:0,y:.035,z:0};
      const hits=(target:Position,blocked=false)=>{for(let t=a.active[0];t<a.active[1];t+=1/60)if(weaponTouches(a,origin,0,target,t,t-1/60,()=>blocked))return true;return false;};
      expect(hits({x:0,y:.035,z:.85})).toBe(true);expect(hits({x:0,y:.035,z:1.8})).toBe(false);expect(hits({x:1.6,y:.035,z:.85})).toBe(false);expect(hits({x:0,y:.035,z:-.8})).toBe(false);expect(hits({x:0,y:.035,z:.85},true)).toBe(false);
    }
  });
  it('keeps windup committed, permits recovery dodge and consumes heavy critical',()=>{
    const p=new PlayerSimulation(new Ground());p.equipBaton();p.training=false;const t=p.targets[1]!;p.targets.splice(0,p.targets.length,t);p.state.position={x:0,y:.035,z:0};t.position={x:0,y:.035,z:.85};
    t.exposedUntil=2;t.posture=100;p.update(1/60,frame(['heavy']),{x:0,z:1});tick(p,8);p.update(1/60,frame(['dodge']));expect(p.state.action).toBe('heavy');tick(p,19);
    expect(t.health).toBe(64);expect(t.exposedUntil).toBe(0);expect(p.state.criticals).toBe(1);tick(p,2);p.update(1/60,frame(['dodge']));expect(p.state.action).toBe('dodge');
  });
});
