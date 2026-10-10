import { beforeAll, describe, expect, it } from 'vitest';
import { EncounterSimulation } from '../../src/enemies/encounter-simulation';
import { CombatTargeting } from '../../src/player/combat-targeting';
import { PlayerSimulation, type PlayerCollision } from '../../src/player/player-simulation';
import { initializePhysics, RapierPlayerCollision } from '../../src/player/player-collision';
import type { CombatantState, Position } from '../../src/player/combat-definitions';
import type { InputAction, InputFrame } from '../../src/core/input-frame';
import boxes from '../../src/player/courtyard-collision.json';

const frame = (pressed: InputAction[] = []): InputFrame => ({ movement: { x: 0, y: 0 }, aim: { x: 0, y: 0 }, pressed: new Set(pressed), held: new Set() });
class Ground implements PlayerCollision {
  move(p: Position, d: Position) { return { position: { x: p.x + d.x, y: .035, z: p.z + d.z }, grounded: true }; }
  reset() {} dispose() {}
}
const make = () => new EncounterSimulation(new Ground(), []);
const tick = (e: EncounterSimulation, count: number) => { for (let i = 0; i < count; i++) e.update(1 / 60, frame()); };

describe('group encounter', () => {
  beforeAll(initializePhysics);
  it('rotates one committed attack slot fairly and retains stationary windup/active poses', () => {
    const e = make(); e.start(3);
    e.enemies.forEach((enemy, index) => { enemy.position = { x: e.player.state.position.x + .8, y: .035, z: e.player.state.position.z + (index - 1) * .2 }; });
    const turns: string[] = [];
    for (let i = 0; i < 260; i++) {
      const positions = e.enemies.map(enemy => ({ ...enemy.position }));
      const actions = e.enemies.map(enemy => enemy.action);
      e.update(1 / 60, frame());
      expect(e.enemies.filter(enemy => ['windup', 'active', 'recovery'].includes(enemy.action)).length).toBeLessThanOrEqual(1);
      e.enemies.forEach((enemy, index) => { if (['windup', 'active'].includes(actions[index]!)) expect(enemy.position).toEqual(positions[index]); });
      turns.push(...e.drainEvents().filter(event => event.type === 'enemy-warning').map(event => event.source.id));
    }
    expect(new Set(turns.slice(0, 3)).size).toBe(3); e.dispose();
  });
  it('uses collision-constrained separation throughout pursuit and releases dead collision', () => {
    const collision = new RapierPlayerCollision(); collision.install(boxes);
    const e = new EncounterSimulation(collision, boxes); e.start(3);
    for (let i = 0; i < 420; i++) {
      e.update(1 / 60, frame());
      for (let a = 0; a < 3; a++) for (let b = a + 1; b < 3; b++) {
        const x = e.enemies[a]!, y = e.enemies[b]!;
        expect(Math.hypot(x.position.x - y.position.x, x.position.z - y.position.z)).toBeGreaterThanOrEqual(.599);
      }
    }
    const dead = e.enemies[0]!; dead.health = 0; e.update(1 / 60, frame());
    e.enemies[2]!.health=0;collision.syncTargets(e.enemies);collision.reset({x:-5,y:.035,z:-5});
    const survivor = e.enemies[1]!; const before = { ...dead.position };
    const moved = collision.moveTarget(survivor.id, { x: before.x - .3, y: .035, z: before.z }, { x: .3, y: 0, z: 0 });
    expect(moved.x).toBeGreaterThan(before.x - .29); expect(dead.action).toBe('dead'); e.dispose();
  });
  it('requires all three defeats, retains equipment and clears generations/slots/focus on restart', () => {
    const e = make(); e.player.equipBaton(); e.start(3);
    e.enemies[0]!.health = 0; tick(e, 1); expect(e.victorious).toBe(false);
    e.enemies[1]!.health = 0; tick(e, 1); expect(e.victorious).toBe(false);
    e.enemies[2]!.health = 0; tick(e, 1); expect(e.victorious).toBe(true);
    const generations = e.enemies.map(enemy => enemy.generation); e.restart();
    expect(e.enemies.every((enemy, i) => enemy.generation > generations[i]! && enemy.health === 120 && enemy.lastAttackOrder === 0)).toBe(true);
    expect(e.kind).toBe('group'); expect(e.player.state.weapon).toBe('baton'); expect(e.player.state.target).toBeNull(); expect(e.player.state.pressure).toBe(100);
    e.training(); expect(e.player.training).toBe(true); expect(e.enemies).toHaveLength(0); expect(e.player.state.weapon).toBe('baton'); e.dispose();
  });
  it.each(['death', 'stagger', 'return'] as const)('hands a committed group slot to a survivor after %s', reason => {
    const e = make(); e.start(3);
    e.enemies.forEach((enemy, index) => { enemy.position = { x: e.player.state.position.x + .8, y: .035, z: e.player.state.position.z + (index - 1) * .2 }; });
    tick(e, 1); const first = e.enemies.find(enemy => enemy.action === 'windup')!;
    if (reason === 'death') first.health = 0;
    if (reason === 'stagger') { first.posture = 100; first.exposedUntil = e.player.time + 2; }
    if (reason === 'return') first.position.x = first.spawn.x + 9;
    tick(e, 2);
    expect(first.action).toBe(reason === 'death' ? 'dead' : reason === 'stagger' ? 'stagger' : 'return');
    const next = e.enemies.filter(enemy => enemy.action === 'windup'); expect(next).toHaveLength(1); expect(next[0]!.id).not.toBe(first.id); e.dispose();
  });
  it.each(['ward', 'dodge'] as const)('keeps %s defense independent of the number of collected contacts', defense => {
    const e = make(); e.start(3); e.player.state.position = { x: 0, y: .035, z: 0 };
    e.player.state.action = defense; e.player.state.actionTime = .05; e.player.state.wardRemaining = defense === 'ward' ? .7 : 0;
    e.enemies.forEach((enemy, index) => {
      if (index === 2) { enemy.health = 0; return; }
      enemy.position = { x: index * .3, y: .035, z: .85 }; enemy.action = 'active'; enemy.facing = Math.atan2(-enemy.position.x, -enemy.position.z); enemy.attackRecipient = e.player.handle;
    });
    tick(e, 1); expect(e.player.state.health).toBe(defense === 'ward' ? 80 : 100); expect(e.player.state.blocks).toBe(defense === 'ward' ? 1 : 0); e.dispose();
  });
  it('resolves a baton sweep once per living target, with a single pressure award', () => {
    const p = new PlayerSimulation(new Ground()); p.equipBaton(); p.training = false; p.state.pressure = 50; p.state.position = { x: 0, y: .035, z: 0 };
    p.targets[0]!.position = { x: -.3, y: .035, z: .85 }; p.targets[1]!.position = { x: .3, y: .035, z: .85 }; p.targets[2]!.position = { x: 0, y: .035, z: -2 };
    p.update(1 / 60, frame(['attack']), { x: 0, z: 1 }); for (let i = 0; i < 26; i++) p.update(1 / 60, frame());
    const hits = p.drainEvents().filter(event => event.type === 'hit'); expect(hits).toHaveLength(2); expect(new Set(hits.map(event => event.recipient?.id)).size).toBe(2);
    expect(p.targets.slice(0, 2).map(target => target.hits)).toEqual([1, 1]); expect(p.targets[2]!.hits).toBe(0); expect(p.state.pressure).toBe(60); p.dispose();
  });
  it('consumes only the exposed target opening during a multi-target heavy', () => {
    const p = new PlayerSimulation(new Ground()); p.equipBaton(); p.training = false; p.state.position = { x: 0, y: .035, z: 0 };
    p.targets[0]!.position = { x: -.3, y: .035, z: .85 }; p.targets[1]!.position = { x: .3, y: .035, z: .85 }; p.targets[2]!.health = 0;
    p.targets[0]!.posture = 100; p.targets[0]!.exposedUntil = 2; p.targets[1]!.posture = 50;
    p.update(1 / 60, frame(['heavy']), { x: 0, z: 1 }); for (let i = 0; i < 40; i++) p.update(1 / 60, frame());
    expect(p.targets[0]!.health).toBe(36); expect(p.targets[1]!.health).toBe(128); expect(p.state.criticals).toBe(1);
    expect(p.targets[0]!.exposedUntil).toBe(0); expect(p.targets[1]!.exposedUntil).toBeGreaterThan(0); p.dispose();
  });
  it('produces identical group combat snapshots and events across presentation qualities', () => {
    const low = make(), high = make(); low.player.equipBaton(); high.player.equipBaton(); low.start(3); high.start(3);
    for (let i = 0; i < 600; i++) {
      const input = frame(i % 63 === 0 ? ['heavy'] : i % 89 === 0 ? ['ward'] : i % 113 === 0 ? ['target'] : []);
      for (const simulation of [low, high]) simulation.update(1 / 60, input, simulation.player.combatAim(undefined, input.pressed.has('target')));
      expect(low.drainEvents()).toEqual(high.drainEvents());
    }
    expect(low.enemies).toEqual(high.enemies); expect(low.player.state).toEqual(high.player.state); low.dispose(); high.dispose();
  });
});

describe('living combat focus', () => {
  const origin = { x: 0, y: .035, z: 0 };
  const targets = (): CombatantState[] => { const p = new PlayerSimulation(new Ground()); return p.targets.map((target, i) => ({ ...target, position: { x: .4 * i, y: .035, z: 1 } })); };
  it('holds near-equal targets, cycles living handles, and rejects dead/old generations', () => {
    const focus = new CombatTargeting(), list = targets(); focus.resolve(list, origin); const first = focus.selected!;
    list[1]!.position = { x: 0, y: .035, z: .95 }; focus.resolve(list, origin); expect(focus.selected).toEqual(first);
    focus.resolve(list, origin, undefined, undefined, true); expect(focus.selected?.id).not.toBe(first.id);
    const selected = list.find(target => target.id === focus.selected?.id)!; selected.health = 0; focus.resolve(list, origin); expect(focus.selected?.id).not.toBe(selected.id);
    list.forEach(target => target.generation++); focus.resolve(list, origin); expect(focus.selected?.generation).toBe(list[0]!.generation);
    focus.clear(); expect(focus.selected).toBeNull();
  });
  it('filters obstruction and raised targets, snaps a pointed living target and otherwise preserves free aim', () => {
    const focus = new CombatTargeting(), list = targets(); list[0]!.position.y = 2;
    const blocked = (_a: Position, b: Position) => b.x > .5;
    expect(focus.resolve(list, origin, blocked)).toEqual(list[1]!.position); expect(focus.resolve(list, origin, blocked, { x: 5, z: 5 })).toEqual({ x: 5, z: 5 });
    expect(focus.selected).toBeNull(); expect(focus.resolve(list, origin, blocked, { x: .5, z: 1 })).toEqual({x:.5,z:1});expect(focus.selected?.id).toBe(list[1]!.id);
    list.forEach(target => target.health = 0); expect(focus.resolve(list, origin, undefined, undefined, true)).toBeUndefined(); expect(focus.selected).toBeNull();
  });
});
