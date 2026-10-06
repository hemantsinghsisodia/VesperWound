import { describe, expect, it, vi } from 'vitest';
import { FixedClock } from '../../src/core/clock';
import { EventChannel } from '../../src/core/events';
import { Lifetime } from '../../src/core/lifetime';
import { ResourceCache } from '../../src/assets/resource-cache';
import { validateManifest } from '../../src/assets/manifest';
import { QualityManager, QUALITY_PROFILES, effectivePixelRatio } from '../../src/performance/quality';
import { parsePreferences, SettingsStore, type Preferences } from '../../src/platform/settings';
import { readBootOptions } from '../../src/platform/capabilities';
import { FrameMetrics } from '../../src/performance/metrics';

describe('performance evidence', () => {
  it('retains long stalls and separates pause resets from measurement resets', () => {
    const metrics = new FrameMetrics();
    metrics.record(0, 1); metrics.record(16, 1); metrics.record(2016, 1);
    expect(metrics.export()).toMatchObject({ framesMeasured: 2, maxFrameMs: 2000, framesAbove100ms: 1 });
    metrics.resetTiming(); metrics.record(10000, 1); metrics.record(10016, 1);
    expect(metrics.export()).toMatchObject({ framesMeasured: 3, maxFrameMs: 2000 });
    metrics.resetMeasurements(); metrics.record(20000, 1); metrics.record(20016, 1);
    expect(metrics.export()).toMatchObject({ framesMeasured: 1, maxFrameMs: 16, framesAbove100ms: 0 });
  });
});

describe('simulation clock', () => {
  it('runs the same simulation steps at different rendering rates', () => {
    const run = (fps: number) => {
      const clock = new FixedClock(); let total = 0;
      for (let i = 0; i <= fps; i++) clock.advance(i / fps * 1000, (dt) => { total += dt; });
      return total;
    };
    expect(run(30)).toBeCloseTo(1); expect(run(60)).toBeCloseTo(1); expect(run(120)).toBeCloseTo(1);
  });
  it('caps catch-up and resets suspended time', () => {
    const clock = new FixedClock(); const update = vi.fn();
    clock.advance(0, update); clock.advance(10000, update);
    expect(update).toHaveBeenCalledTimes(5); expect(clock.overruns).toBe(1);
    clock.reset(); clock.advance(20000, update); expect(update).toHaveBeenCalledTimes(5);
  });
});

describe('resource ownership', () => {
  it('shares pending loads, retains surviving owners, and destroys exactly once', async () => {
    const load = vi.fn(async () => ({ name: 'shared' })); const destroy = vi.fn();
    const cache = new ResourceCache(load, destroy);
    const [first, second] = await Promise.all([cache.acquire('asset'), cache.acquire('asset')]);
    expect(load).toHaveBeenCalledTimes(1); expect(cache.references).toBe(2);
    first.release(); first.release(); expect(destroy).not.toHaveBeenCalled();
    second.release(); expect(destroy).toHaveBeenCalledTimes(1); expect(cache.size).toBe(0);
  });
  it('destroys a late result after disposal and rejects both owners', async () => {
    let resolve: (value: object) => void = () => {};
    const load = vi.fn(() => new Promise<object>((complete) => { resolve = complete; })); const destroy = vi.fn();
    const cache = new ResourceCache(load, destroy);
    const first = cache.acquire('asset'); const second = cache.acquire('asset');
    await Promise.resolve(); cache.dispose(); resolve({});
    expect((await Promise.allSettled([first, second])).every((result) => result.status === 'rejected')).toBe(true);
    expect(destroy).toHaveBeenCalledTimes(1);
  });
  it('allows retry after a failed shared request', async () => {
    const cache = new ResourceCache(vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(3), vi.fn());
    await expect(cache.acquire('asset')).rejects.toThrow('offline');
    expect(cache.size).toBe(0); const handle = await cache.acquire('asset'); expect(handle.value).toBe(3); handle.release();
  });
});

describe('lifecycle and typed events', () => {
  it('unsubscribes session listeners and disposes lifetimes once in reverse order', () => {
    const events = new EventChannel<{ ready: number }>(); const listener = vi.fn();
    const unsubscribe = events.on('ready', listener); events.emit('ready', 3); unsubscribe(); events.emit('ready', 4);
    expect(listener).toHaveBeenCalledExactlyOnceWith(3); expect(events.listenerCount).toBe(0);
    events.on('ready', listener); events.dispose(); expect(events.listenerCount).toBe(0);
    const sequence: number[] = []; const lifetime = new Lifetime();
    lifetime.own(() => sequence.push(1)); lifetime.own(() => sequence.push(2)); lifetime.dispose(); lifetime.dispose();
    expect(sequence).toEqual([2, 1]);
  });
});

describe('capabilities and validated configuration', () => {
  it('ignores all development URL flags in production', () => {
    expect(readBootOptions(false, '?backend=webgpu-required&fixture=missing&portrait=refined')).toEqual({ backend: 'auto', missingFixture: false, scene: 'showcase' });
    expect(readBootOptions(true, '?backend=webgl2')).toEqual({ backend: 'webgl2', missingFixture: false, scene: 'showcase' });
    expect(readBootOptions(true, '?backend=unknown')).toEqual({ backend: 'auto', missingFixture: false, scene: 'showcase' });
  });
  it('rejects invalid manifests rather than handing malformed content to loaders', () => {
    expect(() => validateManifest({ version: 2, assets: {} })).toThrow();
    expect(() => validateManifest({ version: 1, assets: { a: { kind: 'model', url: 'https://untrusted.example/model' } } })).toThrow();
    expect(validateManifest({ version: 1, assets: { a: { kind: 'model', url: '/assets/a.glb' } } }).assets.a?.kind).toBe('model');
  });
});

const defaults: Preferences = { version: 1, quality: 'High', adaptive: true, muted: false, volume: 0.5, reducedMotion: false, uiScale: 1, leftHanded: false };
describe('settings', () => {
  it('recovers corrupt/future settings and bounds numerical values', () => {
    expect(parsePreferences('{bad', defaults)).toEqual(defaults);
    expect(parsePreferences('{"version":2}', defaults)).toEqual(defaults);
    expect(parsePreferences('{"version":1,"quality":"wrong","volume":3,"uiScale":0}', defaults)).toMatchObject({ quality: 'High', volume: 1, uiScale: 0.8 });
  });
  it('remains usable when local storage throws', () => {
    const store = new SettingsStore({ getItem: () => { throw new Error(); }, setItem: () => { throw new Error(); } }, defaults);
    store.update({ quality: 'Mobile' }); expect(store.values.quality).toBe('Mobile'); expect(store.persistent).toBe(false);
  });
});

describe('quality', () => {
  it('respects resolution caps and never invents a density setting', () => {
    expect(effectivePixelRatio(QUALITY_PROFILES.Mobile, 1920, 1080, 3, 1)).toBeCloseTo(2 / 3);
    expect(effectivePixelRatio(QUALITY_PROFILES.Ultra, 1280, 720, 3, 1)).toBe(2);
  });
  it('waits five seconds to downscale and twenty seconds before recovering', () => {
    const quality = new QualityManager('High', true);
    for (let t = 0; t <= 4900; t += 100) expect(quality.observe(40, t)).toBe(false);
    expect(quality.observe(40, 5000)).toBe(true); expect(quality.resolutionScale).toBe(0.9);
    for (let t = 5100; t < 10000; t += 100) quality.observe(10, t);
    const initial = quality.resolutionScale;
    for (let t = 10000; t < 24000; t += 100) quality.observe(10, t);
    expect(quality.resolutionScale).toBe(initial);
    for (let t = 24000; t <= 30000; t += 100) quality.observe(10, t);
    expect(quality.resolutionScale).toBe(1); expect(quality.selected).toBe('High');
  });
  it('does not adapt when disabled', () => {
    const quality = new QualityManager('High', false);
    expect(quality.observe(80, 0)).toBe(false); expect(quality.observe(80, 10000)).toBe(false); expect(quality.resolutionScale).toBe(1);
  });
});
