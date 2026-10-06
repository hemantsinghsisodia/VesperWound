import { describe, expect, it, beforeAll } from 'vitest';
import type { InputAction, InputFrame } from '../../src/core/input-frame';
import { PlayerSimulation, type PlayerCollision, type Position } from '../../src/player/player-simulation';
import { ATTACKS, UNARMED } from '../../src/player/combat-definitions';
import { segmentBlocked } from '../../src/player/collision-math';
import { initializePhysics, RapierPlayerCollision } from '../../src/player/player-collision';
import boxes from '../../src/player/courtyard-collision.json';
const frame = (pressed: InputAction[] = []): InputFrame => ({ movement: { x: 0, y: 0 }, aim: { x: 0, y: 0 }, pressed: new Set(pressed), held: new Set() });
class Ground implements PlayerCollision {
  obstruction = false;
  move(p: Position, d: Position) { return { position: { x: p.x + d.x, y: .035, z: p.z + d.z }, grounded: true }; }
  blocked() { return this.obstruction; } reset() {} dispose() {}
}
function tick(p: PlayerSimulation, seconds: number) { for (let i = 0; i < Math.ceil(seconds * 60); i++) p.update(1 / 60, frame()); }
function strike(p: PlayerSimulation, action: 'attack' | 'heavy' = 'attack', target = p.targets[0]!) {
  p.state.position = { x: target.position.x - .75, y: .035, z: target.position.z };
  p.update(1 / 60, frame([action]), target.position); const attack = p.state.attack!; tick(p, ATTACKS[attack].duration + .025); return attack;
}
describe('unarmed combat', () => {
  it('uses an injected combat-style chain without changing the damage system', () => {
    const p = new PlayerSimulation(new Ground(), { ...UNARMED, id: 'two-strike-test', light: ['cross', 'jab'] });
    expect([strike(p), strike(p), strike(p)]).toEqual(['cross', 'jab', 'cross']); expect(p.targets[0]!.health).toBe(62);
  });
  it('chains jab/cross/finisher, uses defined damage, and resets after the follow-up timeout', () => {
    const p = new PlayerSimulation(new Ground());
    expect([strike(p), strike(p), strike(p)]).toEqual(['jab', 'cross', 'finisher']);
    expect(p.targets[0]!.health).toBe(56); expect(p.targets[0]!.posture).toBe(50);
    tick(p, .7); expect(strike(p)).toBe('jab');
  });
  it('deduplicates each target across the active window and awards pressure once for a group hit', () => {
    const p = new PlayerSimulation(new Ground()); p.state.position = { x: 0, y: .035, z: 0 }; p.state.pressure = 50;
    p.targets[0]!.position = { x: -.25, y: .035, z: 1 }; p.targets[1]!.position = { x: .25, y: .035, z: 1 };
    p.update(1 / 60, frame(['attack']), { x: 0, z: 1 }); tick(p, .5);
    const hits = p.drainEvents().filter(e => e.type === 'hit'); expect(hits).toHaveLength(2);
    expect(p.state.pressure).toBe(60); expect(p.state.targetHits).toBe(2);
  });
  it('rejects strikes obstructed by solid courtyard geometry', () => {
    const g = new Ground(); g.obstruction = true; const p = new PlayerSimulation(g); strike(p);
    expect(p.targets[0]!.health).toBe(100); expect(p.state.targetHits).toBe(0);
    const wall = [{ position: { x: 0, y: 1, z: 0 }, half: { x: .1, y: 1, z: 2 } }];
    expect(segmentBlocked({ x: -1, y: 1, z: 0 }, { x: 1, y: 1, z: 0 }, wall)).toBe(true);
    expect(segmentBlocked({ x: -1, y: 3, z: 0 }, { x: 1, y: 3, z: 0 }, wall)).toBe(false);
  });
  it('expires early buffered presses but accepts a press in the last 120 ms', () => {
    const p = new PlayerSimulation(new Ground()); p.update(1 / 60, frame(['attack'])); tick(p, .1); p.update(1 / 60, frame(['attack'])); tick(p, .6);
    expect(p.state.strikes).toBe(1);
    p.update(1 / 60, frame(['attack'])); tick(p, .53); p.update(1 / 60, frame(['attack'])); tick(p, .1);
    expect(p.state.strikes).toBe(3); expect(p.state.attack).toBe('finisher');
  });
  it('commits windup/active frames but permits dodge during recovery', () => {
    const p = new PlayerSimulation(new Ground()); p.update(1 / 60, frame(['heavy'])); tick(p, .1); p.update(1 / 60, frame(['dodge'])); tick(p, .4);
    expect(p.state.action).toBe('heavy'); tick(p, .1); p.update(1 / 60, frame(['dodge'])); expect(p.state.action).toBe('dodge');
  });
  it('stagger exposes for two seconds, one heavy consumes it, and subsequent heavies are ordinary', () => {
    const p = new PlayerSimulation(new Ground()); const target = p.targets[1]!; p.targets[2]!.position = { x: 30, y: .035, z: 30 };
    strike(p, 'heavy', target); strike(p, 'heavy', target); expect(target.posture).toBe(100); expect(target.exposedUntil).toBeGreaterThan(0);
    strike(p, 'heavy', target); expect(target.health).toBe(40); expect(p.state.criticals).toBe(1); expect(target.exposedUntil).toBe(0);
    strike(p, 'heavy', target); expect(target.health).toBe(10); expect(p.state.criticals).toBe(1);
  });
  it('recovers posture after exposure expires without a critical', () => {
    const p = new PlayerSimulation(new Ground()); strike(p, 'heavy', p.targets[1]); strike(p, 'heavy', p.targets[1]); tick(p, 2.1);
    expect(p.targets[1]!.posture).toBe(0); expect(p.targets[1]!.exposedUntil).toBe(0);
  });
  it('Ward costs 25, absorbs one hit, expires, and rejects insufficient pressure', () => {
    const p = new PlayerSimulation(new Ground()); p.update(1 / 60, frame(['ward'])); expect(p.state.pressure).toBe(75);
    expect(p.damage(20)).toBe(false); expect(p.state.blocks).toBe(1); expect(p.damage(20)).toBe(true); expect(p.state.health).toBe(80);
    tick(p, .5); p.update(1 / 60, frame(['ward'])); tick(p, .85); expect(p.state.wardRemaining).toBe(0);
    p.state.pressure = 24; p.update(1 / 60, frame(['ward'])); expect(p.state.action).not.toBe('ward'); expect(p.state.pressure).toBe(24);
  });
  it('regenerates only after three quiet seconds and clamps pressure to 100', () => {
    const p = new PlayerSimulation(new Ground()); p.state.pressure = 50; p.damage(1); tick(p, 2.9); expect(p.state.pressure).toBe(50);
    tick(p, 1.1); expect(p.state.pressure).toBeCloseTo(55, 0); tick(p, 12); expect(p.state.pressure).toBe(100);
  });
  it('defeats and resets targets, while restart clears pending combat and barrier state', () => {
    const p = new PlayerSimulation(new Ground()); strike(p, 'heavy'); strike(p, 'heavy'); strike(p, 'heavy'); strike(p, 'heavy');
    expect(p.targets[0]!.health).toBe(0); expect(p.state.defeats).toBe(1); tick(p, 4.1); expect(p.targets[0]!.health).toBe(100);
    p.update(1 / 60, frame(['ward'])); p.damage(100); p.damage(100); expect(p.state.action).toBe('dead');
    p.reset(); tick(p, .2); expect(p.state.action).toBe('idle'); expect(p.state.combo).toBe(0); expect(p.state.pressure).toBe(100); expect(p.state.wardRemaining).toBe(0);
  });
  it('telegraphs each vent pulse for 600 ms and damages only on the pulse', () => {
    const p = new PlayerSimulation(new Ground()); p.state.position = { x: -4.2, y: .035, z: 1.2 };
    tick(p, 1.5); expect(p.state.ventWarning).toBe(true); expect(p.state.health).toBe(100); tick(p, .6); expect(p.state.health).toBe(80);
  });
});
describe('target collision', () => {
  beforeAll(initializePhysics);
  it('constrains knockback against authored walls and other training targets', () => {
    const collision = new RapierPlayerCollision(); collision.install(boxes); const p = new PlayerSimulation(collision);
    let target = { x: 6, y: .035, z: 3.4 }; for (let i = 0; i < 60; i++) target = collision.moveTarget('isolated', target, { x: .15, y: 0, z: 0 });
    expect(target.x).toBeLessThan(7.7); const heavy = p.targets[1]!.position;
    const stopped = collision.moveTarget('isolated', { x: heavy.x - 1, y: .035, z: heavy.z }, { x: 2, y: 0, z: 0 });
    expect(stopped.x).toBeLessThan(heavy.x - .55); p.dispose();
  });
});
