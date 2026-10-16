import { describe,it,expect } from 'vitest';
import { FirstMission,MISSION_POINTS,MISSION_WAVES } from '../../src/mission/first-mission';
import { EncounterSimulation } from '../../src/enemies/encounter-simulation';
import type { PlayerCollision } from '../../src/player/player-simulation';
import { DISTRICT_BOUNDS,DISTRICT_BOXES,districtGround } from '../../src/world/district-definition';
import { courtyardSolids,discBlocked } from '../../src/player/collision-math';
import type { InputFrame } from '../../src/core/input-frame';

const idle:InputFrame={movement:{x:0,y:0},aim:{x:0,y:0},pressed:new Set(),held:new Set()};
function setup(){
  let blocked=false;
  const collision:PlayerCollision={move:(p,d)=>({position:{x:p.x+d.x,y:.035,z:p.z+d.z},grounded:true}),blocked:()=>blocked,reset:()=>{},dispose:()=>{}};
  const encounter=new EncounterSimulation(collision,[],undefined,DISTRICT_BOUNDS,districtGround),mission=new FirstMission(encounter,collision);
  return {encounter,mission,player:encounter.player.state,block:()=>{blocked=true;}};
}
const tick=(m:FirstMission,interact=false,ready=true)=>m.update(1/60,interact,ready);
function defeat(m:FirstMission){for(const e of m.encounter.enemies)e.health=0;tick(m);}
function reachRegulator(s:ReturnType<typeof setup>){s.mission.start(false);s.player.weapon='baton';tick(s.mission);s.player.position={x:0,y:.035,z:17.5};tick(s.mission);defeat(s.mission);s.player.position={...MISSION_POINTS.regulator};}

describe('first mission',()=>{
  it('requires a baton, a ready quay, two fights and valid interactions to finish',()=>{
    const s=setup();s.mission.start(false);expect(s.mission.stage).toBe('prepare');expect(s.encounter.player.training).toBe(false);expect(s.encounter.enemies).toHaveLength(0);
    s.player.position={x:0,y:.035,z:18};tick(s.mission,true);expect(s.mission.stage).toBe('prepare');
    s.player.weapon='baton';tick(s.mission);tick(s.mission,false,false);expect(s.mission.stage).toBe('quay');
    s.player.health=73;tick(s.mission);expect(s.mission.stage).toBe('passage-fight');expect(s.player.health).toBe(73);expect(s.player.position.z).toBe(18);expect(s.encounter.enemies).toHaveLength(2);
    const generation=s.encounter.enemies[0]!.generation;tick(s.mission);expect(s.encounter.enemies[0]!.generation).toBe(generation);
    defeat(s.mission);expect(s.mission.stage).toBe('regulator');tick(s.mission,true);expect(s.mission.stage).toBe('regulator');
    s.player.position={...MISSION_POINTS.regulator};tick(s.mission,true);expect(s.mission.stage).toBe('winch-approach');expect(s.encounter.enemies).toHaveLength(3);expect(s.encounter.enemies[0]!.generation).toBeGreaterThan(generation);
    s.player.position={x:0,y:.035,z:23.5};tick(s.mission);expect(s.mission.stage).toBe('winch-fight');
    defeat(s.mission);s.player.position={...MISSION_POINTS.winch};tick(s.mission,true);expect(s.mission.stage).toBe('powering');
    for(let i=0;i<359;i++)tick(s.mission);expect(s.mission.stage).toBe('powering');
    tick(s.mission);tick(s.mission);expect(s.mission.stage).toBe('board');expect(s.mission.ramp).toBe(1);
    tick(s.mission,true);expect(s.mission.stage).toBe('board');s.player.position={...MISSION_POINTS.ferry};tick(s.mission,true);expect(s.mission.stage).toBe('departure');for(let i=0;i<360;i++)tick(s.mission);expect(s.mission.stage).toBe('complete');
    const elapsed=s.mission.elapsed;tick(s.mission);expect(s.mission.elapsed).toBe(elapsed);expect(s.mission.drainCues()).toEqual(['encounter','regulator','encounter','winch','winch','release','winch','winch','winch','winch','departure','complete']);expect(s.mission.drainCues()).toEqual([]);
  });
  it('rejects obstructed, committed, dead and wrong-height interactions',()=>{
    const s=setup();reachRegulator(s);
    for(const action of ['attack','heavy','dodge','ward','hit','dead'] as const){s.player.action=action;tick(s.mission,true);expect(s.mission.stage).toBe('regulator');}
    s.player.action='idle';s.player.position.y=2;expect(s.mission.canInteract()).toBe(false);s.player.position.y=.035;s.block();expect(s.mission.canInteract()).toBe(false);
  });
  it('freezes when paused/dead and resets progression while retaining session equipment',()=>{
    const s=setup();reachRegulator(s);const time=s.mission.elapsed;
    s.mission.update(0,true,true);expect(s.mission.elapsed).toBe(time);
    s.player.health=0;tick(s.mission,true);expect(s.mission.elapsed).toBe(time);
    s.mission.start(false);expect(s.mission.stage).toBe('quay');expect(s.player.weapon).toBe('baton');expect(s.player.health).toBe(100);expect(s.player.pressure).toBe(100);expect(s.encounter.enemies).toHaveLength(0);expect(s.mission.ramp).toBe(0);
    s.mission.leave();expect(s.mission.stage).toBe('inactive');tick(s.mission,true);expect(s.mission.elapsed).toBe(0);
    expect(setup().mission.stage).toBe('inactive');
  });
  it('uses walkable authored spawns and allows pursuit on the quay',()=>{
    const solids=courtyardSolids(DISTRICT_BOXES);
    for(const wave of MISSION_WAVES)for(const p of wave){expect(districtGround(p)).toBe(true);expect(discBlocked(p,solids)).toBe(false);}
    const s=setup();s.encounter.start(2,MISSION_WAVES[0],false);s.player.position={x:0,y:.035,z:22};
    const before=s.encounter.enemies[0]!.position.z;for(let i=0;i<60;i++)s.encounter.update(1/60,idle);
    expect(s.encounter.enemies[0]!.position.z).toBeGreaterThan(before);
  });
});

it('opening and departure skip reach the same state and never advance combat time',()=>{
  const natural=setup(),skip=setup();natural.mission.start();skip.mission.start();
  expect(natural.mission.snapshot.gameplayEnabled).toBe(false);
  const time=natural.encounter.player.time;
  for(let i=0;i<240;i++)tick(natural.mission);
  skip.mission.skip();expect(natural.mission.stage).toBe(skip.mission.stage);expect(natural.mission.elapsed).toBe(0);expect(natural.encounter.player.time).toBe(time);
  expect(natural.mission.cinematicTime).toBeCloseTo(4);
  for(const s of [natural,skip]){s.mission.stage='departure';s.mission.phaseTime=0;s.mission.powerTime=6;}
  for(let i=0;i<360;i++)tick(natural.mission);skip.mission.skip();
  expect(natural.mission.snapshot).toMatchObject({stage:'complete',hidePlayer:true,progress:1,gameplayEnabled:false});
  expect(skip.mission.snapshot).toMatchObject({stage:'complete',hidePlayer:true,progress:1,gameplayEnabled:false});
  expect(natural.mission.ramp).toBe(0);expect(skip.mission.ramp).toBe(0);
  natural.mission.start();expect(natural.mission.stage).toBe('prepare');
});

it('waiting guards stay targetable and activate on a real hit, or apron entry',()=>{
  const s=setup();reachRegulator(s);tick(s.mission,true);
  expect(s.mission.stage).toBe('winch-approach');expect(s.encounter.awaitingActivation).toBe(true);
  const positions=s.encounter.enemies.map(e=>({...e.position}));
  for(let i=0;i<120;i++)s.encounter.update(1/60,idle);
  expect(s.encounter.enemies.map(e=>e.position)).toEqual(positions);
  expect(s.encounter.player.targets).toHaveLength(3);
  const target=s.encounter.enemies[0]!;s.player.position={...target.position,z:target.position.z-.55};s.player.facing=0;
  s.encounter.update(1/60,{...idle,pressed:new Set(['heavy'])});
  for(let i=0;i<45;i++)s.encounter.update(1/60,idle);
  expect(target.health).toBeLessThan(target.maxHealth);expect(s.encounter.awaitingActivation).toBe(false);tick(s.mission);expect(s.mission.stage).toBe('winch-fight');
  const approach=setup();reachRegulator(approach);tick(approach.mission,true);approach.player.position={x:-1.5,y:.035,z:23.3};tick(approach.mission);
  expect(approach.encounter.awaitingActivation).toBe(false);expect(approach.mission.stage).toBe('winch-fight');
});

it('presentation timers pause, hints appear once and restart clears pending actions',()=>{
  const s=setup();s.mission.start();s.mission.update(1,false,true);const snapshot=s.mission.snapshot;
  s.mission.update(0,true,true);expect(s.mission.snapshot).toEqual(snapshot);
  s.mission.skip();expect(s.mission.snapshot.hint).toContain('Pick up');
  s.mission.start(false);expect(s.mission.snapshot.hint).toBe('');expect(s.mission.phaseTime).toBe(0);
  s.mission.stage='powering';for(let i=0;i<120;i++)tick(s.mission);expect(s.mission.ramp).toBe(0);
  const power=s.mission.powerTime;s.mission.update(0,false,true);expect(s.mission.powerTime).toBe(power);
  for(let i=0;i<240;i++)tick(s.mission);expect(s.mission.ramp).toBe(1);
});
