import { describe, expect, it, beforeAll } from 'vitest';
import { PlayerSimulation, PLAYER_SPAWN, type PlayerCollision, type Position } from '../../src/player/player-simulation';
import { initializePhysics, RapierPlayerCollision } from '../../src/player/player-collision';
import type { InputAction, InputFrame } from '../../src/core/input-frame';
import boxes from '../../src/player/courtyard-collision.json';

function input(x = 0, y = 0, pressed: InputAction[] = [], held: InputAction[] = []): InputFrame { return { movement: { x, y }, aim: { x: 0, y: 0 }, pressed: new Set(pressed), held: new Set(held) }; }
class FlatGround implements PlayerCollision {
  move(p: Position, d: Position) { return { position: { x: p.x + d.x, y: Math.max(0.035, p.y + d.y), z: p.z + d.z }, grounded: true }; }
  reset() {}
  dispose() {}
}
function steps(player: PlayerSimulation, frame: InputFrame, count: number) { for (let i = 0; i < count; i++) player.update(1 / 60, i ? { ...frame, pressed: new Set() } : frame); }

describe('player fixed-clock rules', () => {
  it('normalizes screen movement and applies distinct walk/run speeds', () => {
    const walk = new PlayerSimulation(new FlatGround()); const run = new PlayerSimulation(new FlatGround());
    steps(walk, input(1, 0), 60); steps(run, input(1, 0, [], ['run']), 60);
    expect(Math.hypot(walk.state.position.x - PLAYER_SPAWN.x, walk.state.position.z - PLAYER_SPAWN.z)).toBeCloseTo(2.4);
    expect(Math.hypot(run.state.position.x - PLAYER_SPAWN.x, run.state.position.z - PLAYER_SPAWN.z)).toBeCloseTo(5);
  });
  it('resolves one timed punch against a forward target and buffers the next punch only briefly', () => {
    const player = new PlayerSimulation(new FlatGround()); player.state.position = { x: .75, y: .035, z: 3.4 };
    player.update(1 / 60, input(0, 0, ['attack']), { x: 1.5, z: 3.4 }); steps(player, input(), 20);
    expect(player.state.targetHits).toBe(1); steps(player, input(), 60); expect(player.state.targetHits).toBe(1);
    expect(player.state.action).toBe('idle');
    player.update(1 / 60, input(0, 0, ['attack'])); steps(player, input(0, 0, ['attack']), 12); steps(player, input(), 50);
    expect(player.state.strikes).toBe(2); // Early repeated press expired instead of executing late.
  });
  it('dodge travels three metres, grants only the defined invulnerability window, then recovers', () => {
    const player = new PlayerSimulation(new FlatGround());
    player.update(1 / 60, input(0, 0, ['dodge'])); steps(player, input(), 4);
    expect(player.state.invulnerable).toBe(true); expect(player.damage(20)).toBe(false);
    steps(player, input(), 12); expect(player.state.invulnerable).toBe(false);
    expect(player.state.position.z - PLAYER_SPAWN.z).toBeCloseTo(3, 1);
    steps(player, input(), 30); expect(player.state.action).toBe('idle');
  });
  it('death locks movement and actions until an explicit restart', () => {
    const player = new PlayerSimulation(new FlatGround()); player.damage(100);
    steps(player, input(1, 0, ['attack', 'dodge']), 60);
    expect(player.state.position).toEqual(PLAYER_SPAWN); expect(player.state.action).toBe('dead');
    player.reset(); expect(player.state.health).toBe(100); expect(player.state.action).toBe('idle');
  });
});

describe('Rapier capsule in authored courtyard', () => {
  beforeAll(initializePhysics);
  it('blocks movement and high-speed dodges at walls, and slides along obstacles', () => {
    const collision = new RapierPlayerCollision(); collision.install(boxes);
    let p = { x: 6, y: .035, z: 3.4 };
    for (let i = 0; i < 120; i++) p = collision.move(p, { x: .2, y: -.01, z: .03 }).position;
    expect(p.x).toBeLessThan(7.7); expect(p.z).toBeGreaterThan(4);
    p = collision.move(p, { x: 3, y: -.01, z: 0 }).position; expect(p.x).toBeLessThan(7.7);
    collision.dispose();
  });
  it('climbs authored landing steps and stays grounded without art-quality changes', () => {
    const collision = new RapierPlayerCollision(); collision.install(boxes);
    let p = { x: 4, y: .035, z: -.5 };
    for (let i = 0; i < 120; i++) p = collision.move(p, { x: 0, y: -.01, z: -.04 }).position;
    expect(p.y).toBeGreaterThan(.7); expect(p.z).toBeLessThan(-3.5); collision.dispose();
  });
});
