import { expect, test, vi } from 'vitest';
import { SectionStream } from '../../src/assets/section-stream';
import type { AssetHandle } from '../../src/assets/resource-cache';
import { DISTRICT_BOXES, DISTRICT_BOUNDS, districtGround } from '../../src/world/district-definition';
import { courtyardSolids } from '../../src/player/collision-math';
import { GroundNavigation } from '../../src/enemies/navigation';
import { initializePhysics, RapierPlayerCollision } from '../../src/player/player-collision';

test('section prefetch uses hysteresis and releases exactly one lease', async () => {
  const release = vi.fn(), attach = vi.fn(), detach = vi.fn();
  const load = vi.fn(async () => ({ value: 7, release }));
  const stream = new SectionStream(load, attach, detach);
  stream.update(3.4); expect(load).not.toHaveBeenCalled();
  stream.update(6); await stream.prepare(); stream.update(5); stream.update(6);
  expect(load).toHaveBeenCalledTimes(1); expect(attach).toHaveBeenCalledWith(7);
  stream.update(1); stream.dispose(); expect(release).toHaveBeenCalledTimes(1); expect(detach).toHaveBeenCalledTimes(1);
});
test('cancelled section results cannot attach after a new request', async () => {
  const pending: Array<(h: AssetHandle<number>) => void> = [], attach = vi.fn(), releaseOld = vi.fn(), releaseNew = vi.fn();
  const stream = new SectionStream<number>(() => new Promise(resolve => pending.push(resolve)), attach, vi.fn());
  const old = stream.prepare(); stream.update(0); const fresh = stream.prepare();
  pending[1]!({ value: 2, release: releaseNew }); await fresh;
  pending[0]!({ value: 1, release: releaseOld }); await old;
  expect(stream.value).toBe(2); expect(attach).toHaveBeenCalledTimes(1); expect(releaseOld).toHaveBeenCalledOnce();
  stream.dispose(); expect(releaseNew).toHaveBeenCalledOnce();
});

test('one warmed section reattaches without uploads and releases on scene disposal', async () => {
  const release = vi.fn(), attach = vi.fn(), detach = vi.fn();
  const load = vi.fn(async () => ({ value: 7, release }));
  const stream = new SectionStream(load, attach, detach, true);
  await stream.prepare(); stream.update(0);
  expect(stream.status).toBe('closed'); expect(stream.value).toBeNull(); expect(release).not.toHaveBeenCalled();
  await stream.prepare(); stream.update(0); await stream.prepare();
  expect(load).toHaveBeenCalledOnce(); expect(attach).toHaveBeenCalledTimes(3);
  stream.update(0);
  stream.dispose(); stream.dispose(); expect(release).toHaveBeenCalledOnce();
});

test('warm retention does not retain a cancelled first load', async () => {
  let resolve!: (h: AssetHandle<number>) => void;
  const release = vi.fn(), attach = vi.fn();
  const stream = new SectionStream<number>(() => new Promise(r => { resolve = r; }), attach, vi.fn(), true);
  const pending = stream.prepare(); stream.update(0); resolve({ value: 1, release }); await pending;
  expect(attach).not.toHaveBeenCalled(); expect(release).toHaveBeenCalledOnce();
  stream.dispose(); expect(release).toHaveBeenCalledOnce();
});
test('failed section remains blocked until explicit retry and disposal releases late assets', async () => {
  const release = vi.fn(); let resolve!: (h: AssetHandle<number>) => void;
  const load = vi.fn<() => Promise<AssetHandle<number>>>().mockRejectedValueOnce(new Error('offline')).mockImplementationOnce(() => new Promise(r => { resolve = r; }));
  const attach = vi.fn(), stream = new SectionStream(load, attach, vi.fn());
  await expect(stream.prepare()).rejects.toThrow('offline'); stream.update(7);
  expect(load).toHaveBeenCalledTimes(1); expect(stream.status).toBe('failed');
  const retried = stream.prepare(); stream.dispose(); resolve({ value: 1, release }); await retried;
  expect(attach).not.toHaveBeenCalled(); expect(release).toHaveBeenCalledOnce();
});
test('district navigation connects both areas while excluding harbour water', () => {
  const nav = new GroundNavigation(courtyardSolids(DISTRICT_BOXES), DISTRICT_BOUNDS, districtGround);
  nav.plan({ x: 0, y: .035, z: 27 }, 0);
  expect(nav.reachable({ x: 0, y: .035, z: 5 })).toBe(true);
  expect(nav.reachable({ x: 6, y: .035, z: 12 })).toBe(false);
  expect(nav.reachable({ x: 0, y: .035, z: 33 })).toBe(false);
});
test('real capsule stops at unavailable section, traverses when ready and cannot enter the water', async () => {
  await initializePhysics(); const collision = new RapierPlayerCollision(); collision.install(DISTRICT_BOXES); collision.setDistrictReady(false);
  let p = { x: 0, y: .035, z: 6 };
  for (let i = 0; i < 100; i++) p = collision.move(p, { x: 0, y: -.025, z: .08 }).position;
  expect(p.z).toBeLessThan(8); expect(p.z).toBeGreaterThan(7);
  collision.setDistrictReady(true);
  for (let i = 0; i < 400; i++) p = collision.move(p, { x: 0, y: -.025, z: .08 }).position;
  expect(p.z).toBeGreaterThan(30); expect(p.z).toBeLessThan(31); expect(p.y).toBeGreaterThan(-.1);
  collision.dispose();
});

test('mission readiness leases pin the section without moving the player and cancel late results',async()=>{
  const release=vi.fn(),attach=vi.fn();let resolve!:(h:AssetHandle<number>)=>void;
  const stream=new SectionStream<number>(()=>new Promise(r=>{resolve=r;}),attach,vi.fn());
  stream.update(3.4);const first=stream.acquire(),second=stream.acquire();stream.update(0);first.release();
  resolve({value:5,release});await second.ready;expect(stream.status).toBe('ready');
  second.release();second.release();expect(stream.status).toBe('closed');expect(release).toHaveBeenCalledOnce();
  const late=stream.acquire();stream.update(3.4);late.release();resolve({value:6,release});await late.ready;
  expect(attach).toHaveBeenCalledTimes(1);expect(release).toHaveBeenCalledTimes(2);stream.dispose();
});
