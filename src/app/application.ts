import { Lifetime } from '../core/lifetime';
import { EventChannel } from '../core/events';
import { FixedClock } from '../core/clock';
import { SettingsStore, type Preferences } from '../platform/settings';
import { defaultPreferences, readBootOptions, type BackendMode } from '../platform/capabilities';
import { Interface } from '../ui/interface';
import { InputManager } from '../input/input-manager';
import { AudioManager } from '../audio/audio-manager';
import { QualityManager } from '../performance/quality';
import { FrameMetrics, type FrameStatistics } from '../performance/metrics';
import { RendererAdapter } from '../rendering/renderer-adapter';
import { AssetManager } from '../assets/asset-manager';
import { Courtyard } from '../world/courtyard';
import { CourtyardCamera } from '../camera/courtyard-camera';

interface SessionEvents { pressureReleased: { x: number; z: number } }

export class Application {
  private readonly lifetime = new Lifetime();
  private readonly settings: SettingsStore;
  private readonly ui: Interface;
  private readonly audio = new AudioManager();
  private readonly clock = new FixedClock();
  private readonly metrics = new FrameMetrics();
  private readonly quality: QualityManager;
  private readonly events = new EventChannel<SessionEvents>();
  private readonly camera = new CourtyardCamera();
  private adapter: RendererAdapter | null = null;
  private assets: AssetManager | null = null;
  private courtyard: Courtyard | null = null;
  private input: InputManager | null = null;
  private debug: { update(stats: FrameStatistics): void; dispose(): void } | null = null;
  private started = false;
  private modalPaused = false;
  private visibilityPaused = false;
  private portrait = false;
  private booting = false;
  private reloading = false;
  private disposed = false;
  private lastUiUpdate = 0;
  private lastFrame = 0;
  private fixtureLoads = 0;
  private timeScale = 1;
  private readonly options = readBootOptions(import.meta.env.DEV, location.search);

  constructor(root: HTMLElement) {
    let storage: Storage | null = null;
    try { storage = window.localStorage; } catch { /* A playable session still works without storage. */ }
    this.settings = new SettingsStore(storage, defaultPreferences());
    this.quality = new QualityManager(this.settings.values.quality, this.settings.values.adaptive);
    this.ui = new Interface(root, this.settings.values);
    this.ui.storage(this.settings.persistent);
    this.audio.setVolume(this.settings.values.volume, this.settings.values.muted);
    this.events.on('pressureReleased', () => this.audio.pulse());
    this.ui.bind({
      start: () => this.start(),
      pause: (paused) => {
        this.modalPaused = paused;
        if (!paused) this.visibilityPaused = false;
        this.synchronizePause();
        if (!paused && this.started) { void this.audio.unlock(); this.ui.canvas.focus(); }
      },
      retry: (compatibility) => { void this.audio.unlock(); void this.boot(compatibility); },
      preferences: (values) => this.setPreferences(values),
    });
    this.lifetime.listen(window, 'resize', () => { this.resize(); this.synchronizePause(); });
    const visibility = () => {
      if (document.hidden) { this.visibilityPaused = true; this.synchronizePause(); }
      else if (this.started) { this.modalPaused = true; this.ui.openSettings(); }
    };
    document.addEventListener('visibilitychange', visibility);
    this.lifetime.own(() => document.removeEventListener('visibilitychange', visibility));
  }

  async boot(compatibility = false): Promise<void> {
    if (this.booting || this.disposed) return;
    this.booting = true; this.started = false; this.modalPaused = false; this.visibilityPaused = false;
    this.stopSession(); this.ui.prepare(); this.ui.replaceCanvas();
    try {
      const mode = compatibility ? 'webgl2' : this.options.backend;
      this.ui.loading('Waking the pressure engine…');
      try { await this.createRenderer(mode); }
      catch (error) {
        this.adapter?.dispose(); this.adapter = null;
        if (mode !== 'auto') throw error;
        this.ui.loading('Opening compatibility graphics…'); this.ui.replaceCanvas(); await this.createRenderer('webgl2');
      }
      const adapter = this.adapter;
      if (!adapter) throw new Error('Renderer initialization did not complete.');
      if (this.disposed) { adapter.dispose(); return; }
      this.ui.loading('Unsealing the courtyard…');
      const assets = new AssetManager(adapter.renderer); this.assets = assets; await assets.init();
      if (this.disposed) return;
      this.courtyard = new Courtyard(); await this.courtyard.load(assets, this.options.missingFixture);
      if (this.disposed) return;
      this.fixtureLoads++;
      this.courtyard.configure(this.quality.profile);
      adapter.configure(this.courtyard.scene, this.camera.camera, this.quality.profile);
      this.resize();
      this.ui.loading('Kindling the last light…');
      await adapter.compile(this.courtyard.scene, this.camera.camera);
      if (this.disposed) return;
      adapter.render();
      this.input = new InputManager(this.ui.canvas, this.ui.stick, this.ui.pulse);
      this.clock.reset(); this.metrics.resetTiming(); this.lastFrame = 0;
      await adapter.renderer.setAnimationLoop((time) => this.frame(time));
      if (import.meta.env.DEV && !this.debug) {
        const { mountDebug } = await import('../debug/debug-tools');
        this.debug = mountDebug(this.ui.root, {
          snapshot: () => this.snapshot(), reloadFixture: () => this.reloadFixture(),
          exportMetrics: () => ({ ...this.metrics.export(), ...this.snapshot(), userAgent: navigator.userAgent, viewport: [innerWidth, innerHeight], schema: 1 }),
          resetMetrics: () => this.metrics.resetMeasurements(),
          timeScale: (value) => { this.timeScale = value; },
        });
      }
      this.ui.ready();
    } catch (error) {
      if (!this.disposed) this.fail(error instanceof Error ? error.message : String(error));
    } finally { this.booting = false; }
  }
  private async createRenderer(mode: BackendMode): Promise<void> {
    const adapter = new RendererAdapter(this.ui.canvas, mode); this.adapter = adapter;
    await adapter.init(mode, (reason) => { if (!this.disposed && this.adapter === adapter) this.fail(reason); });
  }
  private start(): void {
    if (!this.adapter || !this.courtyard || this.booting || this.ui.root.dataset.state === 'error') return;
    void this.audio.unlock(); this.started = true; this.ui.enter(); this.synchronizePause();
  }
  private synchronizePause(): void {
    this.portrait = matchMedia('(pointer: coarse)').matches && innerHeight > innerWidth;
    this.ui.setPortrait(this.started && this.portrait);
    const paused = this.modalPaused || this.visibilityPaused || this.portrait || document.hidden;
    this.ui.setPaused(paused); this.clock.reset(); this.metrics.resetTiming(); this.quality.resetObservation(); this.input?.clear();
    if (paused) void this.audio.suspend();
  }
  private setPreferences(values: Partial<Preferences>): void {
    this.settings.update(values); this.ui.applyPreferences(this.settings.values); this.ui.storage(this.settings.persistent);
    this.audio.setVolume(this.settings.values.volume, this.settings.values.muted);
    this.quality.adaptive = this.settings.values.adaptive;
    if (values.quality) {
      this.quality.select(values.quality);
      if (this.adapter && this.courtyard) {
        this.courtyard.configure(this.quality.profile);
        this.adapter.configure(this.courtyard.scene, this.camera.camera, this.quality.profile);
      }
    }
    this.resize();
  }
  private resize(): void {
    this.camera.resize(innerWidth, innerHeight);
    this.adapter?.resize(innerWidth, innerHeight, this.quality.profile, this.quality.resolutionScale);
  }
  private frame(time: number): void {
    if (this.disposed || !this.adapter || !this.courtyard || !this.input) return;
    const begin = performance.now();
    const paused = this.modalPaused || this.visibilityPaused || this.portrait || document.hidden || this.reloading;
    const delta = this.lastFrame ? Math.min(0.1, (time - this.lastFrame) / 1000) : 0;
    this.lastFrame = time;
    try {
      if (this.started && !paused) {
        const alpha = this.clock.advance(time, (dt) => {
          const input = this.input?.sample();
          if (!input || !this.courtyard) return;
          if (this.courtyard.update(dt, input, this.settings.values.reducedMotion)) this.events.emit('pressureReleased', { x: this.courtyard.target.x, z: this.courtyard.target.z });
          this.audio.setListener(this.courtyard.target.x, this.courtyard.target.z);
        }, this.timeScale);
        this.courtyard.interpolate(alpha);
        this.camera.update(this.courtyard.target, delta);
      }
      this.adapter.render();
      if (!paused) {
        this.metrics.record(time, performance.now() - begin);
        if (this.started && this.quality.observe(this.metrics.frameMs, time)) this.resize();
      }
      if (time - this.lastUiUpdate > 500) { this.debug?.update(this.snapshot()); this.lastUiUpdate = time; }
    } catch (error) { this.fail(error instanceof Error ? error.message : String(error)); }
  }
  private fail(reason: string): void {
    if (this.disposed) return;
    this.started = false; this.adapter?.renderer.setAnimationLoop(null); this.input?.clear(); void this.audio.suspend();
    this.ui.error(reason);
  }
  private async reloadFixture(): Promise<void> {
    if (this.reloading || !this.assets || !this.adapter) return;
    this.reloading = true;
    this.courtyard?.dispose(); this.courtyard = null;
    try {
      const fixture = new Courtyard(); this.courtyard = fixture;
      await fixture.load(this.assets, false);
      fixture.configure(this.quality.profile);
      this.adapter.configure(fixture.scene, this.camera.camera, this.quality.profile);
      await this.adapter.compile(fixture.scene, this.camera.camera);
      this.adapter.render();
      this.fixtureLoads++; this.clock.reset(); this.metrics.resetTiming();
    } catch (error) { this.fail(error instanceof Error ? error.message : String(error)); }
    finally { this.reloading = false; }
  }
  private snapshot(): FrameStatistics {
    const info = this.adapter?.renderer.info;
    return {
      backend: this.adapter?.backend ?? 'unavailable', quality: this.quality.selected,
      resolution: this.adapter?.resolution ?? '0 × 0', frameMs: this.metrics.frameMs, cpuMs: this.metrics.cpuMs,
      fps: this.metrics.fps, p95: this.metrics.p95,
      draws: info?.render.drawCalls ?? 0, triangles: info?.render.triangles ?? 0,
      textures: info?.memory.textures ?? 0, estimatedGpuBytes: info?.memory.total ?? 0,
      resources: (this.courtyard?.ownedResources ?? 0) + (this.assets?.resourceCount ?? 0),
      references: this.assets?.referenceCount ?? 0, voices: this.audio.voiceCount,
      overruns: this.clock.overruns, fixtureLoads: this.fixtureLoads,
      markerX: this.courtyard?.target.x ?? 0, markerZ: this.courtyard?.target.z ?? 0,
      listeners: this.lifetime.cleanupCount + this.ui.listenerCount + (this.input?.listenerCount ?? 0) + this.events.listenerCount,
      audioState: this.audio.status,
    };
  }
  private stopSession(): void {
    const adapter = this.adapter; this.adapter = null;
    adapter?.renderer.setAnimationLoop(null);
    this.input?.dispose(); this.input = null;
    this.courtyard?.dispose(); this.courtyard = null;
    this.assets?.dispose(); this.assets = null;
    adapter?.dispose(); this.clock.reset();
  }
  async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true; this.stopSession(); this.lifetime.dispose(); this.events.dispose();
    this.debug?.dispose(); this.debug = null; this.ui.dispose(); await this.audio.dispose();
  }
}
