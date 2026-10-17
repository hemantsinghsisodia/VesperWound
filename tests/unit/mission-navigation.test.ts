import { expect, test } from 'vitest';
import { GroundNavigation } from '../../src/enemies/navigation';
import { courtyardSolids, discBlocked, discPathBlocked } from '../../src/player/collision-math';
import { initializePhysics, RapierPlayerCollision } from '../../src/player/player-collision';
import { DISTRICT_BOXES, DISTRICT_BOUNDS, districtGround } from '../../src/world/district-definition';
import { EncounterSimulation } from '../../src/enemies/encounter-simulation';
import { MISSION_WAVES } from '../../src/mission/first-mission';
import { ZOMBIE7 } from '../../src/enemies/enemy-definition';

test('a returning guard escapes the observed crane corner through real collision', async () => {
  await initializePhysics();
  const collision = new RapierPlayerCollision(); collision.install(DISTRICT_BOXES);
  collision.reset({ x: 3.997, y: .035, z: 25.711 });
  const solids = courtyardSolids(DISTRICT_BOXES);
  const navigation = new GroundNavigation(solids, DISTRICT_BOUNDS, districtGround);
  const spawn = { x: 1, y: .035, z: 24 };
  let position = { x: 3.639466117788648, y: .035, z: 25.10377360437103 };
  try {
    for (let frame = 0; frame < 600; frame++) {
      navigation.plan(spawn, frame / 60);
      const direction = navigation.direction(position, spawn);
      expect(direction, `no route at ${JSON.stringify(position)}`).not.toBeNull();
      const previous = position;
      position = collision.moveTarget('guard', position, { x: direction!.x * .025, y: 0, z: direction!.z * .025 });
      expect(Math.hypot(position.x - previous.x, position.z - previous.z)).toBeLessThanOrEqual(.025001);
      expect(discBlocked(position, solids)).toBe(false);
    }
    expect(Math.hypot(position.x - spawn.x, position.z - spawn.z)).toBeLessThan(.15);
  } finally { collision.dispose(); }
});

test.each([
  { player: { x: 3.997, y: .035, z: 25.711 }, guard: { x: 3.639466117788648, y: .035, z: 25.10377360437103 } },
  { player: { x: -1.669, y: .035, z: 27.228 }, guard: { x: -1.279468, y: .035, z: 26.678736 } },
])('the encounter returns from recorded stuck positions and resumes pursuit: $guard', async ({ player, guard }) => {
  await initializePhysics();
  const collision = new RapierPlayerCollision(); collision.install(DISTRICT_BOXES);
  const encounter = new EncounterSimulation(collision, DISTRICT_BOXES, ZOMBIE7, DISTRICT_BOUNDS, districtGround);
  try {
    encounter.start(3, MISSION_WAVES[1]);
    encounter.player.state.position = player; collision.reset(player);
    const enemy = encounter.enemies[0]!; enemy.position = guard; enemy.action = 'return'; enemy.health = 24;
    for (const other of encounter.enemies.slice(1)) { other.health = 0; other.action = 'dead'; }
    let returned = false, approached = false;
    for (let frame = 0; frame < 600; frame++) {
      const previous = { ...enemy.position };
      encounter.update(1 / 60, { movement: { x: 0, y: 0 }, aim: { x: 0, y: 0 }, held: new Set(), pressed: new Set() });
      expect(Math.hypot(enemy.position.x - previous.x, enemy.position.z - previous.z)).toBeLessThanOrEqual(.025001);
      expect(discBlocked(enemy.position, courtyardSolids(DISTRICT_BOXES))).toBe(false);
      returned ||= Math.hypot(enemy.position.x - enemy.spawn.x, enemy.position.z - enemy.spawn.z) < .15;
      approached ||= returned && ['approach'].includes(enemy.action);
    }
    expect(returned).toBe(true); expect(approached).toBe(true); expect(enemy.health).toBe(24);
  } finally { encounter.player.dispose(); }
});

test('a wall-adjacent player remains reachable without connecting across the wall', () => {
  const wall = { position: { x: 0, y: 1, z: 0 }, half: { x: .2, y: 1, z: 7.5 } };
  const navigation = new GroundNavigation([wall]);
  navigation.plan({ x: .49, y: .035, z: 0 }, 0);
  expect(navigation.reachable({ x: 2, y: .035, z: 0 })).toBe(true);
  expect(navigation.reachable({ x: -2, y: .035, z: 0 })).toBe(false);
  expect(navigation.reachable({ x: .1, y: .035, z: 0 })).toBe(false);
});

test('swept disc follows rounded corners but rejects edge and thin-wall crossings', () => {
  const boxes = [{ position: { x: 0, y: 1, z: 0 }, half: { x: 1, y: 1, z: 1 } }];
  expect(discPathBlocked({ x: 1.22, y: .035, z: 1.22 }, { x: 1.4, y: .035, z: 1.4 }, boxes)).toBe(false);
  expect(discPathBlocked({ x: 1.3, y: .035, z: 1.05 }, { x: 1.05, y: .035, z: 1.3 }, boxes)).toBe(true);
  expect(discPathBlocked({ x: -2, y: .035, z: 0 }, { x: 2, y: .035, z: 0 }, boxes)).toBe(true);
});

test('field planning respects its cadence and rebuilds after a clock restart', () => {
  const navigation = new GroundNavigation([]);
  navigation.plan({ x: 0, y: 1, z: 0 }, 100);
  navigation.plan({ x: 0, y: .035, z: 0 }, 100.05);
  expect(navigation.reachable({ x: 2, y: .035, z: 0 })).toBe(false);
  navigation.plan({ x: 0, y: .035, z: 0 }, 0);
  expect(navigation.reachable({ x: 2, y: .035, z: 0 })).toBe(true);
});
