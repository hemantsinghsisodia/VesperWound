import { Lifetime } from '../core/lifetime';
import { EventChannel } from '../core/events';
import { FixedClock } from '../core/clock';
import { SettingsStore, type Preferences } from '../platform/settings';
import { defaultPreferences, readBootOptions, type BackendMode } from '../platform/capabilities';
import { Interface } from '../ui/interface';
import { InputManager } from '../input/input-manager';
import { AudioManager } from '../audio/audio-manager';
import { QualityManager, type QualityName } from '../performance/quality';
import { FrameMetrics, type FrameStatistics } from '../performance/metrics';
import { RendererAdapter } from '../rendering/renderer-adapter';
import type { AnimationClip } from 'three/webgpu';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import type { AssetHandle } from '../assets/resource-cache';
import { WeaponPickup } from '../player/weapon-pickup';
import { BATON } from '../player/weapon-definitions';
import { AssetManager } from '../assets/asset-manager';
import { VisualShowcase } from '../world/visual-showcase';
import { artVariant, type WorldPresentation, type InspectionState } from '../world/presentation';
import type { CharacterInspection } from '../world/character-inspection';
import { CourtyardCamera } from '../camera/courtyard-camera';
import type { PlayerSimulation } from '../player/player-simulation';
import { EncounterSimulation, type EncounterKind } from '../enemies/encounter-simulation';
import type { EnemyPresentation } from '../world/enemy-presentation';
import type { CombatEvent } from '../player/combat-definitions';
import type { RapierPlayerCollision } from '../player/player-collision';
import collisionBoxes from '../player/courtyard-collision.json';

interface SessionEvents { pressureReleased: { x: number; z: number }; combat: CombatEvent }

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
  private courtyard: WorldPresentation | null = null;
  private loadingAssets: AssetManager | null = null;
  private loadingWorld: WorldPresentation | null = null;
  private inspection: CharacterInspection | null = null;
  private inspectionAssets: AssetManager | null = null;
  private pendingInspection: { world: CharacterInspection | null; assets: AssetManager | null; cancelled: boolean } | null = null;
  private inspectionState: InspectionState = { status: 'courtyard' };
  private committedQuality: QualityName = 'High';
  private input: InputManager | null = null;
  private player: PlayerSimulation | null = null;
  private encounter: EncounterSimulation | null = null;
  private enemyAssets: AssetManager | null = null;
  private pendingEnemy: { assets: AssetManager | null; view: EnemyPresentation | null; cancelled: boolean } | null = null;
  private encounterError = '';
  private readonly pickup=new WeaponPickup();
  private weaponAssets:AssetManager|null=null;
  private weaponHandle:AssetHandle<GLTF>|null=null;
  private armedClips:readonly AnimationClip[]|null=null;
  private pendingWeapon:{id:number;assets:AssetManager;handle:AssetHandle<GLTF>|null;cancelled:boolean}|null=null;
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
    this.ui.scene(this.options.scene);
    this.ui.storage(this.settings.persistent);
    this.audio.setVolume(this.settings.values.volume, this.settings.values.muted);
    this.events.on('pressureReleased', () => this.audio.pulse());
    this.events.on('combat', (event) => {
      const reduced = this.settings.values.reducedMotion;
      this.audio.combat(event);
      if (this.courtyard instanceof VisualShowcase) this.courtyard.combatEvent(event, reduced);
      if (!reduced && event.type === 'hit') this.camera.impulse(event.critical ? .12 : (event.attack === 'heavy' || event.attack === 'baton-heavy') ? .07 : .025);
      if (!reduced && event.type === 'damage') this.camera.impulse(.08);
    });
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
      camera: (view) => {
        if (this.courtyard && !this.inspection) {
          this.cancelWeaponLoad();
          if (this.courtyard instanceof VisualShowcase) this.courtyard.setPlaying(view === 'player');
          this.input?.clear(); this.ui.mode(view);
          this.encounter?.clearQueued();
          this.camera.selectView(view, this.courtyard.target, this.courtyard instanceof VisualShowcase); this.ui.canvas.focus();
        }
      },
      animation: (clip) => this.preview?.selectClip(clip),
      turn: () => this.preview?.turn(),
      inspection: () => { if (this.inspection || this.pendingInspection) this.closeInspection(); else void this.enterInspection(); },
      inspectionView: (view) => { this.inspection?.selectView(view); this.updateInspectionUi(); },
      inspectionLighting: (lighting) => { this.inspection?.selectLighting(lighting); this.updateInspectionUi(); },
      inspectionPause: () => { if (this.inspection) this.inspection.actor.paused = !this.inspection.actor.paused; this.updateInspectionUi(); },
      restart: () => { this.cancelWeaponLoad(); this.encounter?.restart(); this.input?.clear(); this.ui.canvas.focus(); },
      resetTargets: () => { this.player?.resetTargets(); this.input?.clear(); this.ui.canvas.focus(); },
      encounterStart: () => { if(this.pendingEnemy)this.cancelEnemyLoad();else void this.startEncounter(); },
      encounterGroup: () => { if(this.pendingEnemy)this.cancelEnemyLoad();else void this.startEncounter('group'); },
      encounterRestart: () => { this.cancelWeaponLoad(); this.encounter?.restart(); this.input?.clear(); this.ui.canvas.focus(); },
      encounterReturn: () => this.returnToTraining(),
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
      const assets = new AssetManager(adapter.renderer); this.assets = assets; await assets.init(this.manifestUrl());
      if (this.disposed) return;
      if (this.options.scene === 'showcase') {
        const physics = await import('../player/player-collision'); await physics.initializePhysics();
        if (this.disposed) return;
        const collision: RapierPlayerCollision = new physics.RapierPlayerCollision(); collision.install(collisionBoxes);
        this.encounter = new EncounterSimulation(collision, collisionBoxes); this.player=this.encounter.player;
      }
      this.courtyard = await this.createWorld(); await this.courtyard.load(assets, this.options.missingFixture);
      if (this.disposed) return;
      this.fixtureLoads++;
      this.courtyard.configure(this.quality.profile);
      this.camera.selectView(this.player ? 'player' : 'courtyard', this.courtyard.target, this.courtyard instanceof VisualShowcase);
      this.committedQuality = this.quality.selected;
      adapter.configure(this.courtyard.scene, this.camera.camera, this.quality.profile);
      this.resize();
      this.ui.loading('Kindling the last light…');
      await adapter.compile(this.courtyard.scene, this.camera.camera);
      if (this.disposed) return;
      adapter.render();
      this.input = new InputManager(this.ui.canvas, this.ui.stick, this.ui.pulse, this.player ? { dodge: this.ui.get('#dodge'), run: this.ui.get('#run'), heavy: this.ui.get('#heavy'), ward: this.ui.get('#ward'), interact: this.ui.get('#pickup'), target: this.ui.get('#target-cycle') } : undefined);
      this.clock.reset(); this.metrics.resetTiming(); this.lastFrame = 0;
      await adapter.renderer.setAnimationLoop((time) => this.frame(time));
      if (import.meta.env.DEV && !this.debug) {
        const { mountDebug } = await import('../debug/debug-tools');
        this.debug = mountDebug(this.ui.root, {
          snapshot: () => this.snapshot(), reloadFixture: () => this.reloadFixture(),
          exportMetrics: () => ({ ...this.metrics.export(), ...this.snapshot(), userAgent: navigator.userAgent, viewport: [innerWidth, innerHeight], schema: 1 }),
          resetMetrics: () => this.metrics.resetMeasurements(),
          timeScale: (value) => { this.timeScale = value; },
          encounter: (count) => { if(this.enemyAssets)this.encounter?.start(count); },
        });
      }
      this.refreshAnimationUi(); this.ui.ready();
      this.updateInspectionUi();
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
    this.encounter?.clearQueued();
    if (paused) void this.audio.suspend();
  }
  private setPreferences(values: Partial<Preferences>): void {
    if (values.reducedMotion) this.camera.clearImpulse();
    if (values.quality) this.closeInspection();
    this.settings.update(values); this.ui.applyPreferences(this.settings.values); this.ui.storage(this.settings.persistent);
    this.audio.setVolume(this.settings.values.volume, this.settings.values.muted);
    this.quality.adaptive = this.settings.values.adaptive;
    if (values.quality) {
      this.quality.select(values.quality);
      if (this.adapter && this.courtyard) {
        if (this.courtyard instanceof VisualShowcase && this.courtyard.variant !== artVariant(this.quality.selected)) void this.reloadFixture();
        else {
          this.courtyard.configure(this.quality.profile);
          this.adapter.configure(this.courtyard.scene, this.camera.camera, this.quality.profile);
          this.committedQuality = this.quality.selected;
        }
      }
    }
    this.resize();
    this.updateInspectionUi();
  }
  private resize(): void {
    this.camera.resize(innerWidth, innerHeight);
    this.inspection?.resize(innerWidth, innerHeight);
    this.adapter?.resize(innerWidth, innerHeight, this.quality.profile, this.inspection ? 1 : this.quality.resolutionScale);
  }
  private frame(time: number): void {
    if (this.disposed || !this.adapter || !this.courtyard || !this.input) return;
    const begin = performance.now();
    const paused = this.modalPaused || this.visibilityPaused || this.portrait || document.hidden || this.reloading;
    const delta = this.lastFrame ? Math.min(0.1, (time - this.lastFrame) / 1000) : 0;
    this.lastFrame = time;
    try {
      if (this.started && !paused) {
        const world = this.inspection ?? this.courtyard;
        const alpha = this.clock.advance(time, (dt) => {
          const input = this.input?.sample();
          if (!input) return;
          if (world instanceof VisualShowcase) {
            world.aim = this.player?.combatAim(input.aimActive ? this.camera.aim(input.aim, world.target.y) : undefined,input.pressed.has('target'));
            if(world.playing){
              this.encounter?.update(dt,input,world.aim);
              if(this.player){
                const id=this.pickup.update(this.player,input.pressed.has('interact'),!this.pendingEnemy&&!this.pendingInspection);
                if(id!==null)void this.loadBaton(id);
                if(this.pendingWeapon&&this.pendingWeapon.id!==this.pickup.requestId)this.cancelWeaponLoad();
                if(this.pickup.status==='equipped'&&this.pendingWeapon?.handle){
                  this.weaponAssets=this.pendingWeapon.assets;this.weaponHandle=this.pendingWeapon.handle;this.armedClips=this.weaponHandle.value.animations;this.pendingWeapon=null;
                  world.equipBaton(this.armedClips);this.refreshAnimationUi();
                }
              }
            }
          }
          if (world.update(dt, input, this.settings.values.reducedMotion)) this.events.emit('pressureReleased', { x: world.target.x, z: world.target.z });
          if (world instanceof VisualShowcase) for (const event of this.encounter?.drainEvents() ?? []) this.events.emit('combat', event);
          this.audio.setListener(world.target.x, world.target.z);
        }, this.timeScale);
        world.interpolate(alpha);
        if (!this.inspection) this.camera.update(this.courtyard.target, delta);
        if (this.preview) this.ui.animation(this.preview.clip);
        if (this.player) this.ui.player(this.player.state);
        this.ui.encounter(this.encounter,!!this.pendingEnemy,this.encounterError);
        if(this.player)this.ui.weapon(this.player,this.pickup);
      }
      this.adapter.render();
      if (!paused) {
        this.metrics.record(time, performance.now() - begin);
        if (this.started && !this.inspection && this.quality.observe(this.metrics.frameMs, time)) this.resize();
      }
      if (time - this.lastUiUpdate > 500) {
        this.debug?.update(this.snapshot()); this.lastUiUpdate = time;
        // Read-only evidence on the rendering surface, available in production
        // without exposing commands or enabling the development diagnostics.
        const info = this.adapter.renderer.info;
        this.ui.canvas.dataset.rendererBytes = String(info.memory.total);
        this.ui.canvas.dataset.rendererTextures = String(info.memory.textures);
        this.ui.canvas.dataset.backend = this.adapter.backend;
      }
    } catch (error) { this.fail(error instanceof Error ? error.message : String(error)); }
  }
  private fail(reason: string): void {
    if (this.disposed) return;
    this.started = false; this.adapter?.renderer.setAnimationLoop(null); this.input?.clear(); void this.audio.suspend();
    this.ui.error(reason);
  }
  private async reloadFixture(): Promise<void> {
    if (this.reloading || !this.assets || !this.adapter) return;
    this.closeInspection();
    this.cancelWeaponLoad();
    this.cancelEnemyLoad();this.encounter?.clearQueued();
    this.reloading = true; this.ui.artLoading(true, 'Preparing the art collection…');
    const oldWorld = this.courtyard; const oldAssets = this.assets; const adapter = this.adapter;
    const previousQuality = this.committedQuality;
    let replacement: WorldPresentation | null = null;
    let assets: AssetManager | null = null;
    let enemyAssets: AssetManager | null = null;
    try {
      assets = new AssetManager(adapter.renderer); this.loadingAssets = assets;
      await assets.init(this.manifestUrl());
      replacement = await this.createWorld(); this.loadingWorld = replacement;
      await replacement.load(assets, false);
      if(replacement instanceof VisualShowcase&&this.armedClips)replacement.equipBaton(this.armedClips);
      if(replacement instanceof VisualShowcase && this.encounter?.mode==='encounter') {
        enemyAssets=new AssetManager(adapter.renderer);await enemyAssets.init(`/assets/encounter/${replacement.variant}/manifest.json`);
        const {EnemyPresentation}=await import('../world/enemy-presentation');const view=new EnemyPresentation(this.encounter);
        replacement.setEnemy(view);await view.load(enemyAssets);
      }
      if (replacement instanceof VisualShowcase) replacement.setPlaying(this.camera.view === 'player');
      if (this.disposed || this.adapter !== adapter) return;
      replacement.configure(this.quality.profile);
      await adapter.compile(replacement.scene, this.camera.camera);
      if (this.disposed || this.adapter !== adapter) return;
      adapter.configure(replacement.scene, this.camera.camera, this.quality.profile);
      adapter.render();
      this.courtyard = replacement; this.assets = assets;
      replacement = null; assets = null;
      oldWorld?.dispose(); oldAssets.dispose();
      this.enemyAssets?.dispose();this.enemyAssets=enemyAssets;enemyAssets=null;
      this.committedQuality = this.quality.selected;
      this.fixtureLoads++; this.clock.reset(); this.metrics.resetTiming();
      this.refreshAnimationUi(); this.ui.artLoading(false);
    } catch (error) {
      if (!this.disposed && this.adapter === adapter && oldWorld) {
        this.quality.select(previousQuality); this.settings.update({ quality: previousQuality });
        this.ui.get<HTMLSelectElement>('#quality').value = previousQuality;
        oldWorld.configure(this.quality.profile); adapter.configure(oldWorld.scene, this.camera.camera, this.quality.profile);
        this.resize();
        this.ui.artLoading(false, `Art could not be loaded. Current view retained. ${error instanceof Error ? error.message : String(error)}`);
      }
    } finally {
      replacement?.dispose(); assets?.dispose(); this.loadingWorld = null; this.loadingAssets = null;
      enemyAssets?.dispose();
      this.reloading = false;
      this.updateInspectionUi();
    }
  }
  private refreshAnimationUi(): void {
    if (this.preview) { this.ui.animationChoices(this.player?.state.weapon==='baton'?this.preview.clips.filter(c=>c.name.startsWith('Baton_')):this.preview.clips); this.ui.animation(this.preview.clip); }
  }
  private get preview() { return this.inspection?.actor ?? (this.courtyard instanceof VisualShowcase ? this.courtyard.preview : null); }
  private get inspectionEligible(): boolean {
    return this.courtyard instanceof VisualShowcase && this.courtyard.variant === 'desktop' && !matchMedia('(pointer: coarse)').matches;
  }
  private updateInspectionUi(): void {
    if (this.inspection) this.inspectionState = { status: 'active', view: this.inspection.view, lighting: this.inspection.lighting, paused: this.inspection.actor.paused };
    this.ui.inspection(this.inspectionState, this.inspectionEligible);
  }
  private async enterInspection(): Promise<void> {
    if (!this.inspectionEligible || !this.adapter || this.reloading || this.pendingInspection || this.inspection || this.disposed) return;
    this.cancelWeaponLoad();this.cancelEnemyLoad();this.encounter?.clearQueued();
    const adapter = this.adapter;
    const request = { world: null as CharacterInspection | null, assets: null as AssetManager | null, cancelled: false };
    this.pendingInspection = request; this.inspectionState = { status: 'loading' }; this.updateInspectionUi();
    const current = () => !request.cancelled && !this.disposed && this.adapter === adapter && this.pendingInspection === request;
    try {
      const { CharacterInspection } = await import('../world/character-inspection');
      if (!current()) return;
      request.assets = new AssetManager(adapter.renderer);
      await request.assets.init('/assets/showcase/cinematic/manifest.json');
      if (!current()) return;
      request.world = new CharacterInspection(this.ui.canvas);
      await request.world.load(request.assets);
      if(this.armedClips)request.world.equipBaton(this.armedClips);
      if (!current()) return;
      request.world.configure(this.quality.profile); request.world.resize(innerWidth, innerHeight);
      await adapter.compile(request.world.scene, request.world.camera);
      if (!current()) return;
      adapter.configure(request.world.scene, request.world.camera, { ...this.quality.profile, bloom: false });
      adapter.renderer.toneMappingExposure = 1;
      adapter.render();
      this.inspection = request.world; this.inspectionAssets = request.assets;
      this.input?.clear();
      request.world = null; request.assets = null; this.inspection.activate();
      this.clock.reset(); this.metrics.resetTiming(); this.lastFrame = 0; this.resize();
      this.refreshAnimationUi(); this.updateInspectionUi();
    } catch (error) {
      if (current()) {
        if (this.courtyard) adapter.configure(this.courtyard.scene, this.camera.camera, this.quality.profile);
        adapter.renderer.toneMappingExposure = 1.25;
        this.inspectionState = { status: 'failed', message: `Detailed Medic could not be loaded. ${error instanceof Error ? error.message : String(error)}` };
        this.updateInspectionUi();
      }
    } finally {
      request.world?.dispose(); request.assets?.dispose();
      if (this.pendingInspection === request) this.pendingInspection = null;
    }
  }
  private closeInspection(): void {
    const pending = this.pendingInspection;
    if (pending) { pending.cancelled = true; pending.world?.dispose(); pending.assets?.dispose(); this.pendingInspection = null; }
    if (this.inspection && this.adapter && this.courtyard) {
      this.adapter.configure(this.courtyard.scene, this.camera.camera, this.quality.profile);
      this.adapter.renderer.toneMappingExposure = 1.25;
    }
    this.inspection?.dispose(); this.inspection = null; this.inspectionAssets?.dispose(); this.inspectionAssets = null;
    this.inspectionState = { status: 'courtyard' }; this.clock.reset(); this.metrics.resetTiming(); this.lastFrame = 0;
    this.input?.clear();
    this.resize(); this.updateInspectionUi(); this.refreshAnimationUi();
  }
  private manifestUrl(): string {
    if (this.options.scene === 'foundation') return '/assets/fixtures/manifest.json';
    return `/assets/showcase/${artVariant(this.quality.selected)}/manifest.json`;
  }
  private updateEncounterUi():void {this.ui.encounter(this.encounter,!!this.pendingEnemy,this.encounterError);}
  private cancelEnemyLoad():void {
    const request=this.pendingEnemy;if(request){request.cancelled=true;request.view?.dispose();request.assets?.dispose();this.pendingEnemy=null;}
    this.encounterError='';this.updateEncounterUi();
  }
  private async startEncounter(kind:EncounterKind='single'):Promise<void> {
    if(!this.encounter||!this.adapter||!(this.courtyard instanceof VisualShowcase)||this.reloading||this.inspection||this.pendingEnemy)return;
    this.cancelWeaponLoad();
    const adapter=this.adapter,world=this.courtyard,simulation=this.encounter;
    const request={assets:null as AssetManager|null,view:null as EnemyPresentation|null,cancelled:false};this.pendingEnemy=request;this.encounterError='';this.updateEncounterUi();
    const current=()=>!request.cancelled&&!this.disposed&&this.adapter===adapter&&this.courtyard===world&&this.pendingEnemy===request;
    try {
      const {EnemyPresentation}=await import('../world/enemy-presentation');if(!current())return;
      request.assets=new AssetManager(adapter.renderer);await request.assets.init(`/assets/encounter/${world.variant}/manifest.json`);if(!current())return;
      request.view=new EnemyPresentation(simulation);await request.view.load(request.assets);if(!current())return;
      simulation.start(kind==='group'?3:1);world.setEnemy(request.view);this.enemyAssets=request.assets;request.view=null;request.assets=null;
      this.input?.clear();this.camera.selectView('player',world.target,true);world.setPlaying(true);this.ui.mode('player');this.ui.canvas.focus();
      this.clock.reset();this.metrics.resetTiming();this.lastFrame=0;
    } catch(error){if(current())this.encounterError=`Enemy could not be loaded. Training retained. ${error instanceof Error?error.message:String(error)}`;}
    finally{request.view?.dispose();request.assets?.dispose();if(this.pendingEnemy===request)this.pendingEnemy=null;this.updateEncounterUi();}
  }
  private returnToTraining():void {
    if(this.reloading)return;
    this.cancelWeaponLoad();this.cancelEnemyLoad();if(this.courtyard instanceof VisualShowcase)this.courtyard.setEnemy(null);
    this.enemyAssets?.dispose();this.enemyAssets=null;this.encounter?.training();this.input?.clear();this.updateEncounterUi();this.ui.canvas.focus();
  }
  private cancelWeaponLoad():void {
    const request=this.pendingWeapon;
    if(request){request.cancelled=true;request.handle?.release();request.assets.dispose();this.pendingWeapon=null;}
    this.pickup.cancel();
  }
  private async loadBaton(id:number):Promise<void> {
    if(!this.adapter||!(this.courtyard instanceof VisualShowcase)||this.pendingWeapon)return;
    const world=this.courtyard,assets=new AssetManager(this.adapter.renderer),request={id,assets,handle:null as AssetHandle<GLTF>|null,cancelled:false};
    this.pendingWeapon=request;
    const current=()=>!request.cancelled&&!this.disposed&&this.pendingWeapon===request&&this.pickup.requestId===id&&this.courtyard===world;
    try {
      await assets.init('/assets/weapons/baton/manifest.json');if(!current())return;
      request.handle=await assets.model('animations');if(!current())return;
      const names=request.handle.value.animations.map(a=>a.name);
      if([...Object.values(BATON.animations),...Object.values(BATON.attacks).map(a=>a!.clip)].some(n=>!names.includes(n)))throw new Error('Armed animation pack is incomplete');
      this.pickup.complete(id);
    } catch(error){if(current())this.pickup.failed(id,error instanceof Error?error.message:String(error));}
    finally {
      if(!current()||this.pickup.status!=='ready'){request.handle?.release();assets.dispose();if(this.pendingWeapon===request)this.pendingWeapon=null;}
    }
  }
  private async createWorld(): Promise<WorldPresentation> {
    if (import.meta.env.DEV && this.options.scene === 'foundation') {
      const { Courtyard } = await import('../world/courtyard'); return new Courtyard();
    }
    if (!this.player) throw new Error('Player simulation is unavailable.');
    return new VisualShowcase(artVariant(this.quality.selected), this.player);
  }
  private snapshot(): FrameStatistics {
    const info = this.adapter?.renderer.info;
    return {
      backend: this.adapter?.backend ?? 'unavailable', quality: this.quality.selected,
      resolution: this.adapter?.resolution ?? '0 × 0', frameMs: this.metrics.frameMs, cpuMs: this.metrics.cpuMs,
      fps: this.metrics.fps, p95: this.metrics.p95,
      draws: info?.render.drawCalls ?? 0, triangles: info?.render.triangles ?? 0,
      textures: info?.memory.textures ?? 0, estimatedGpuBytes: info?.memory.total ?? 0,
      resources: (this.courtyard?.ownedResources ?? 0) + (this.assets?.resourceCount ?? 0) + (this.inspection?.ownedResources ?? 0) + (this.inspectionAssets?.resourceCount ?? 0) + (this.enemyAssets?.resourceCount ?? 0) + (this.weaponAssets?.resourceCount ?? 0),
      references: (this.assets?.referenceCount ?? 0) + (this.inspectionAssets?.referenceCount ?? 0) + (this.enemyAssets?.referenceCount ?? 0) + (this.weaponAssets?.referenceCount ?? 0), voices: this.audio.voiceCount,
      overruns: this.clock.overruns, fixtureLoads: this.fixtureLoads,
      markerX: this.courtyard?.target.x ?? 0, markerZ: this.courtyard?.target.z ?? 0,
      listeners: this.lifetime.cleanupCount + this.ui.listenerCount + (this.input?.listenerCount ?? 0) + this.events.listenerCount,
      audioState: this.audio.status,
      scene: this.options.scene, variant: this.courtyard instanceof VisualShowcase ? this.courtyard.variant : 'fixture',
      animation: this.preview ? this.preview.clip.kind === 'pose' ? 'static-pose' : this.preview.clip.name : 'fixture', camera: this.inspection?.view ?? this.camera.view,
      characterTier: this.inspection ? 'cinematic' : this.courtyard instanceof VisualShowcase ? this.courtyard.variant : 'fixture',
      inspection: this.inspectionState.status, inspectionPaused: this.inspection?.actor.paused ?? false,
      artLoading: this.reloading,
      ...(import.meta.env.DEV && this.preview ? { rig: this.preview.inspection() } : {}),
      ...(import.meta.env.DEV && this.courtyard instanceof VisualShowcase && this.courtyard.baton && this.player?.state.weapon==='baton' ? { weaponContact: this.courtyard.baton.diagnostics() } : {}),
      ...(this.player ? { player: structuredClone(this.player.state), targets: structuredClone(this.player.targets) } : {}),
      ...(this.encounter ? { encounter: this.encounter.mode, enemies: structuredClone(this.encounter.enemies), enemyLoading: !!this.pendingEnemy } : {}),
    };
  }
  private stopSession(): void {
    this.cancelWeaponLoad();
    this.weaponHandle?.release();this.weaponHandle=null;this.weaponAssets?.dispose();this.weaponAssets=null;this.armedClips=null;
    this.pickup.status='available';
    this.cancelEnemyLoad();
    this.closeInspection();
    const adapter = this.adapter; this.adapter = null;
    adapter?.renderer.setAnimationLoop(null);
    this.input?.dispose(); this.input = null;
    this.courtyard?.dispose(); this.courtyard = null;
    this.loadingWorld?.dispose(); this.loadingWorld = null;
    this.loadingAssets?.dispose(); this.loadingAssets = null;
    this.assets?.dispose(); this.assets = null;
    this.enemyAssets?.dispose();this.enemyAssets=null;this.encounter?.dispose();this.encounter=null;this.player = null;
    adapter?.dispose(); this.clock.reset();
  }
  async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true; this.stopSession(); this.lifetime.dispose(); this.events.dispose();
    this.debug?.dispose(); this.debug = null; this.ui.dispose(); await this.audio.dispose();
  }
}
