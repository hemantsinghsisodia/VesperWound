import {describe,it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {ChapterSimulation} from '../../src/chapter/simulation';
import {ChapterSession} from '../../src/chapter/session';
import {SectorLoader} from '../../src/chapter/sector-loader';
import {freshProgress,parseProgress} from '../../src/chapter/progress';
import {CHECKPOINTS,CHAPTER_BOXES,ENCOUNTERS,POINTS,PORTALS,SECTORS,chapterGround,hoistCargo,point,sectorBoxes} from '../../src/chapter/definition';
import {EncounterSimulation} from '../../src/enemies/encounter-simulation';
import {discBlocked} from '../../src/player/collision-math';
import type {PlayerCollision} from '../../src/player/player-simulation';
const collision:PlayerCollision={move:(p,d)=>({position:{x:p.x+d.x,y:.035,z:p.z+d.z},grounded:true}),reset:()=>{},dispose:()=>{},blocked:()=>false};
function setup(){const encounter=new EncounterSimulation(collision,[]),chapter=new ChapterSimulation(encounter,collision);chapter.start();return {chapter,encounter,p:encounter.player.state};}
const tick=(c:ChapterSimulation,pressed=false)=>c.update(1/60,pressed);
describe('chapter progression',()=>{
  it.each(Object.entries(CHECKPOINTS))('restores death at checkpoint %s with committed progress only',(id,checkpoint)=>{
    const {chapter:c,p}=setup(),saved=freshProgress();saved.checkpoint=id as keyof typeof CHECKPOINTS;saved.baton=true;saved.upgrade=true;saved.cleared=['intake'];c.start(saved);
    p.health=0;p.pressure=0;p.pendingAttack='heavy';p.attack='baton-heavy';c.restore();
    expect(p.position).toEqual(checkpoint.position);expect(p.health).toBe(100);expect(p.pressure).toBe(125);expect(p.weapon).toBe('baton');expect(p.attack).toBeNull();expect(p.pendingAttack).toBeNull();expect(c.progress.cleared).toEqual(['intake']);
  });
  it('exports the same solids used for collision in both selected tiers',()=>{
    for(const tier of ['desktop','mobile'])for(const s of SECTORS){const payload=JSON.parse(readFileSync(`public/assets/chapter/${tier}/${s.id}.json`,'utf8')) as {boxes:unknown};expect(payload.boxes).toEqual(sectorBoxes(s.id));}
  });
  it('keeps every portal, spawn and checkpoint on walkable clear ground',()=>{
    for(const p of [...PORTALS.map(p=>p.position),...Object.values(CHECKPOINTS).map(c=>c.position),...ENCOUNTERS.flatMap(e=>e.positions)]){expect(chapterGround(p),JSON.stringify(p)).toBe(true);expect(discBlocked(p,CHAPTER_BOXES),JSON.stringify(p)).toBe(false);}
    expect(SECTORS).toHaveLength(5);expect(SECTORS.every(s=>sectorBoxes(s.id).length>3)).toBe(true);
    expect(discBlocked(POINTS.regulator,[hoistCargo(0)])).toBe(true);expect(discBlocked(POINTS.regulator,[hoistCargo(2)])).toBe(false);
  });
  it('commits defeat once, retains completed fights and equipment on restart',()=>{
    const {chapter:c,encounter:e,p}=setup();p.weapon='baton';p.position=point(2,4);tick(c);expect(c.encounterId).toBe('intake');
    e.enemies.forEach(e=>e.health=0);tick(c);tick(c);expect(c.progress.cleared).toEqual(['intake']);
    p.attack='baton-heavy';p.pendingAttack='heavy';p.health=0;c.restore();expect(p.health).toBe(100);expect(p.weapon).toBe('baton');expect(p.attack).toBeNull();expect(p.pendingAttack).toBeNull();expect(c.progress.cleared).toEqual(['intake']);
  });
  it('resets unfinished fights without recording partial health',()=>{
    const {chapter:c,encounter:e,p}=setup();p.position=point(2,4);tick(c);e.enemies[0]!.health=3;c.restore();p.position=point(2,4);tick(c);expect(e.enemies[0]!.health).toBe(120);expect(c.progress.cleared).toEqual([]);
  });
  it('requires free action, clear reach and no combat for checkpoint interactions',()=>{
    const {chapter:c,p}=setup();p.health=37;p.action='dodge';tick(c,true);expect(p.health).toBe(37);p.action='idle';tick(c,true);expect(p.health).toBe(100);
    p.position=point(2,4);tick(c);p.position={...CHECKPOINTS.court.position};p.health=20;tick(c,true);expect(p.health).toBe(20);
  });
  it('stores machinery and shortcuts and completes the route without timed padding',()=>{
    const {chapter:c,p}=setup();c.progress.baton=true;p.weapon='baton';c.progress.cleared=ENCOUNTERS.filter(e=>e.id!=='guardian-site').map(e=>e.id);
    const interact=(at:typeof POINTS.hoist)=>{p.position={...at};p.action='idle';tick(c,true);};
    interact(POINTS.hoist);interact(POINTS.hoist);for(let i=0;i<200;i++)tick(c);expect(c.hoistPosition).toBe(2);
    interact(POINTS.regulator);expect(c.progress.regulator).toBe(true);
    interact(point(22,21));expect(c.progress.shortcuts).toContain('warehouse');
    interact(POINTS.supply);expect(c.progress.pressureRestored).toBe(false);interact(POINTS.leak);tick(c);expect(c.progress.pressureRestored).toBe(true);
    interact(point(49,47));expect(c.progress.shortcuts).toContain('pump');
    interact(CHECKPOINTS['pump-exit'].position);expect(c.progress.checkpoint).toBe('pump-exit');
    interact(POINTS.winch);expect(c.progress.installed).toBe(true);interact(POINTS.board);expect(c.progress.complete).toBe(false);
    c.progress.cleared.push('guardian-site');c.encounter.clearEncounter();c.encounterId=null;interact(POINTS.board);expect(c.progress.complete).toBe(true);
    const restored=parseProgress(c.progress)!;c.start(restored);expect(c.progress.complete).toBe(true);expect(p.position).toEqual(CHECKPOINTS['pump-exit'].position);
  });
  it('supports pump-before-regulator exploration and blocks shortcuts from the wrong side',()=>{
    const {chapter:c,p}=setup();c.progress.cleared=ENCOUNTERS.map(e=>e.id);p.position=POINTS.leak;tick(c,true);p.position=POINTS.supply;tick(c,true);tick(c);expect(c.progress.pressureRestored).toBe(true);expect(c.progress.regulator).toBe(false);
    p.position=point(22,19.6);tick(c,true);expect(c.progress.shortcuts).toEqual([]);
  });
  it('does not double-award the optional accumulator',()=>{
    const {chapter:c,p,encounter:e}=setup();c.progress.cleared=ENCOUNTERS.map(e=>e.id);p.position=POINTS.upgrade;tick(c,true);expect(e.player.maximumPressure).toBe(125);p.pressure=20;tick(c,true);expect(p.pressure).toBe(20);c.restore();expect(p.pressure).toBe(125);
  });
  it('rejects partial, foreign-version and invalid saves',()=>{
    expect(parseProgress(freshProgress())).not.toBeNull();for(const patch of [{version:2},{checkpoint:'constructor'},{activeSeconds:Infinity},{cleared:['fake']},{discovered:['court','court']},{hoist:3},{installed:true}])expect(parseProgress({...freshProgress(),...patch})).toBeNull();expect(parseProgress(null)).toBeNull();
  });
});
describe('chapter ownership',()=>{
  it('shares readiness, disposes once after final reference and rejects late results',async()=>{
    let finish!:(v:{value:string;dispose():void})=>void;const dispose=vi.fn(),load=vi.fn(()=>new Promise<{value:string;dispose():void}>(r=>{finish=r;}));
    const loader=new SectorLoader(load),a=loader.acquire('court'),b=loader.acquire('court');expect(load).toHaveBeenCalledTimes(1);a.release();finish({value:'court',dispose});await b.ready;expect(dispose).not.toHaveBeenCalled();b.release();b.release();expect(dispose).toHaveBeenCalledTimes(1);expect(loader.count).toBe(0);
    const late=loader.acquire('street');late.release();finish({value:'street',dispose});await expect(late.ready).rejects.toThrow('cancelled');expect(dispose).toHaveBeenCalledTimes(2);loader.dispose();
  });
  it('disposes a resource once when its owner closes before the final lease',async()=>{
    const dispose=vi.fn(),loader=new SectorLoader(async()=>({value:'court',dispose})),lease=loader.acquire('court');await lease.ready;loader.dispose();lease.release();expect(dispose).toHaveBeenCalledOnce();
  });
  it('retains playable state after storage failure and reports it',async()=>{
    const encounter=new EncounterSimulation(collision,[]),store={read:async()=>({progress:null,recovered:false}),write:vi.fn(async()=>{throw new Error('quota');}),close:vi.fn()},session=new ChapterSession(encounter,collision,store);
    session.start(freshProgress());await vi.waitFor(()=>expect(session.message).toContain('could not be saved'));expect(session.simulation.active).toBe(true);session.dispose();expect(store.close).toHaveBeenCalledOnce();
  });
});
