import {
  Scene, Color, FogExp2, Mesh,
  DirectionalLight, HemisphereLight, PointLight, Vector3, CubeTexture, SRGBColorSpace,
  Sprite, SpriteMaterial, CanvasTexture,
  PlaneGeometry, MeshStandardNodeMaterial, CylinderGeometry, TorusGeometry, BoxGeometry,
  PMREMGenerator, type BufferGeometry, type RenderTarget, type WebGPURenderer,
  type Texture, type Material,
} from 'three/webgpu';
import type { AssetManager } from '../assets/asset-manager';
import type { InputFrame } from '../core/input-frame';
import type { QualityProfile } from '../performance/quality';
import type { ArtVariant, PreviewClip, WorldPresentation } from './presentation';
import { PreviewActor } from './preview-actor';
import { MEDIC } from './character-definition';
import { PLAYER_CLIP_DESCRIPTORS, PLAYER_CLIPS, PLAYER_CLIP_RATES } from '../player/player-animation';
import { type PlayerSimulation, PRACTICE_TARGET, PRESSURE_VENT } from '../player/player-simulation';

/** Presentation observes the fixed-clock player; preview mode freezes simulation. */
export class VisualShowcase implements WorldPresentation {
  readonly scene = new Scene();
  readonly target = new Vector3(-1.6, 0.035, 3.4);
  readonly preview = new PreviewActor({ ...MEDIC, clips: PLAYER_CLIP_DESCRIPTORS });
  readonly actor = this.preview.group;
  get clip(): PreviewClip { return this.preview.clip; }
  private readonly handles: Array<{ release(): void }> = [];
  private readonly geometries: BufferGeometry[] = [];
  private readonly materials: Material[] = [];
  private readonly textures: Texture[] = [];
  private readonly key = new DirectionalLight(0xc8dcdf, 3.2);
  private readonly engine = new PointLight(0xb4e4d4, 38, 10, 2);
  private readonly gate = new PointLight(0xffc784, 35, 10, 2);
  private readonly steam: Sprite[] = [];
  private reflection: RenderTarget | null = null;
  private time = 0;
  private disposed = false;
  playing = true;
  aim: { x: number; z: number } | undefined;
  private targetPlate: MeshStandardNodeMaterial | null = null;
  private hitFlash = 0;
  private seenHits = 0;
  private readonly practiceLabels: Sprite[] = [];

  constructor(readonly variant: ArtVariant, readonly player: PlayerSimulation) {
    this.scene.background = new Color(0x142126);
    this.scene.fog = new FogExp2(0x142126, 0.028);
    this.actor.position.copy(this.target); this.actor.rotation.y = 0.25;
    this.scene.add(this.actor);
    this.key.position.set(-6, 15, 8); this.key.target.position.set(0, 0, -2);
    this.key.castShadow = true;
    Object.assign(this.key.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 40 });
    this.key.shadow.bias = -0.0006; this.key.shadow.normalBias = 0.035;
    this.engine.position.set(0, 2.8, -2); this.gate.position.set(-5, 3.1, -6);
    this.scene.add(this.key, this.key.target, new HemisphereLight(0xa5c5d6, 0x444235, 2), this.engine, this.gate);
  }
  async load(assets: AssetManager, missingFixture: boolean): Promise<void> {
    const loaded = await Promise.allSettled([assets.model(missingFixture ? 'missing-character' : 'character'), assets.model('courtyard'), assets.model('animations')]);
    for (const result of loaded) if (result.status === 'fulfilled') {
      if (this.disposed) result.value.release(); else this.handles.push(result.value);
    }
    const failure = loaded.find((result) => result.status === 'rejected');
    if (this.disposed) throw new Error('Showcase load was cancelled.');
    if (failure?.status === 'rejected') { this.dispose(); throw failure.reason; }
    const hero = loaded[0]; const court = loaded[1];
    if (hero?.status !== 'fulfilled' || court?.status !== 'fulfilled') throw new Error('The art collection is incomplete.');
    this.reflectionEnvironment(assets.renderer);
    const animations = loaded[2]; if (animations?.status !== 'fulfilled') throw new Error('The player animations are incomplete.');
    this.preview.attach({ scene: hero.value.value.scene, animations: animations.value.value.animations }); this.scene.add(court.value.value.scene);
    this.scene.traverse((object) => {
      if (object instanceof Mesh) { object.castShadow = true; object.receiveShadow = true; object.frustumCulled = !('isSkinnedMesh' in object); }
    });
    this.surfaceDetails(); this.practiceArea(); this.applyPlayer(1);
    this.update(0, { movement: { x: 0, y: 0 }, aim: { x: 0, y: 0 }, pressed: new Set(), held: new Set() }, true);
  }
  selectClip(name: PreviewClip): void { this.preview.selectClip(name); }
  setPlaying(playing: boolean): void {
    this.playing = playing; this.preview.controlled = playing;
    for (const label of this.practiceLabels) label.visible = playing;
    if (playing) this.applyPlayer(1); else this.preview.playbackRate(1);
  }
  turn(): void { this.preview.turn(); }
  inspection(): { feet: number[][]; gripDistances: number[] } {
    return this.preview.inspection();
  }
  configure(profile: QualityProfile): void {
    if (this.key.shadow.mapSize.x !== profile.shadowSize) { this.key.shadow.map?.dispose(); this.key.shadow.map = null; }
    this.key.shadow.mapSize.set(profile.shadowSize, profile.shadowSize); this.key.shadow.needsUpdate = true;
  }
  update(dt: number, input: InputFrame, reducedMotion: boolean): boolean {
    const impact = this.playing && this.player.update(dt, input, this.aim);
    if (this.playing) this.applyPlayer(1);
    this.time += dt; this.preview.update(dt);
    if (this.player.state.targetHits !== this.seenHits) { this.seenHits = this.player.state.targetHits; this.hitFlash = 0.22; }
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    if (this.targetPlate) this.targetPlate.emissiveIntensity = this.hitFlash > 0 ? 2.5 : 0.15;
    this.scene.updateMatrixWorld(true);
    this.engine.intensity = 38 + (reducedMotion ? 0 : Math.sin(this.time * 1.2) * 2);
    this.steam.forEach((puff, index) => {
      const phase = ((reducedMotion ? 0 : this.time * 0.12) + index / 12) % 1;
      const flue = index % 3;
      puff.position.set((flue - 1) * 0.55 + Math.sin(index * 2.4 + phase) * 0.12,
        [4.15, 4.7, 4.35][flue]! + phase, -2.2 + Math.cos(index * 1.7) * 0.12);
      puff.scale.setScalar(0.35 + phase * 0.35);
    });
    return impact;
  }
  interpolate(alpha: number): void { if (this.playing) this.applyPlayer(alpha); }
  private applyPlayer(alpha: number): void {
    const s = this.player.state;
    this.target.set(s.previous.x + (s.position.x - s.previous.x) * alpha, s.previous.y + (s.position.y - s.previous.y) * alpha, s.previous.z + (s.position.z - s.previous.z) * alpha);
    this.actor.position.copy(this.target); this.actor.rotation.y = s.facing;
    this.preview.controlled = true;
    const name = PLAYER_CLIPS[s.action];
    if (this.clip.kind !== 'clip' || this.clip.name !== name) this.preview.selectClip({ kind: 'clip', name });
    this.preview.playbackRate(PLAYER_CLIP_RATES[s.action]);
  }
  private practiceArea(): void {
    const iron = new MeshStandardNodeMaterial({ color: 0x343b3b, metalness: 0.65, roughness: 0.5 });
    this.targetPlate = new MeshStandardNodeMaterial({ color: 0xb09b79, emissive: 0x8a6030, emissiveIntensity: 0.15, roughness: 0.9 });
    const hazard = new MeshStandardNodeMaterial({ color: 0xb37a3d, emissive: 0x68310a, emissiveIntensity: 0.8, roughness: 0.65 });
    this.materials.push(iron, this.targetPlate, hazard);
    const postGeometry = new CylinderGeometry(0.09, 0.15, 1.6, 12); const plateGeometry = new BoxGeometry(0.65, 0.65, 0.18); const ringGeometry = new TorusGeometry(0.82, 0.035, 6, 32);
    this.geometries.push(postGeometry, plateGeometry, ringGeometry);
    const post = new Mesh(postGeometry, iron); post.position.set(PRACTICE_TARGET.x, 0.82, PRACTICE_TARGET.z); post.castShadow = true;
    const plate = new Mesh(plateGeometry, this.targetPlate); plate.position.set(PRACTICE_TARGET.x, 1.25, PRACTICE_TARGET.z); plate.castShadow = true;
    const ring = new Mesh(ringGeometry, hazard); ring.rotation.x = Math.PI / 2; ring.position.set(PRESSURE_VENT.x, 0.08, PRESSURE_VENT.z);
    this.scene.add(post, plate, ring);
    for (const [text, x, z] of [['PRACTICE TARGET', PRACTICE_TARGET.x, PRACTICE_TARGET.z], ['PRESSURE VENT · DANGER', PRESSURE_VENT.x, PRESSURE_VENT.z]] as const) {
      const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 64;
      const context = canvas.getContext('2d'); if (!context) continue;
      context.fillStyle = '#0d1c22db'; context.fillRect(0, 0, 512, 64); context.fillStyle = '#e8d4a7'; context.font = '22px Arial'; context.textAlign = 'center'; context.fillText(text, 256, 40);
      const texture = new CanvasTexture(canvas); texture.colorSpace = SRGBColorSpace; this.textures.push(texture);
      const material = new SpriteMaterial({ map: texture, depthTest: false, transparent: true }); this.materials.push(material);
      const label = new Sprite(material); label.geometry = label.geometry.clone(); this.geometries.push(label.geometry);
      label.position.set(x, text.startsWith('PRACTICE') ? 2 : 0.8, z); label.scale.set(2.1, 0.26, 1); this.scene.add(label); this.practiceLabels.push(label);
    }
  }
  private reflectionEnvironment(renderer: WebGPURenderer): void {
    const faces = Array.from({ length: 6 }, (_, index) => {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
      const context = canvas.getContext('2d'); if (!context) throw new Error('Reflection canvas is unavailable.');
      const gradient = context.createLinearGradient(0, 0, 0, 64);
      gradient.addColorStop(0, index === 2 ? '#afc1c2' : '#6b878e'); gradient.addColorStop(0.48, '#41525a'); gradient.addColorStop(1, '#191f20');
      context.fillStyle = gradient; context.fillRect(0, 0, 64, 64);
      return canvas;
    });
    const texture = new CubeTexture(faces); texture.colorSpace = SRGBColorSpace; texture.needsUpdate = true;
    const generator = new PMREMGenerator(renderer);
    try { this.reflection = generator.fromCubemap(texture); this.scene.environment = this.reflection.texture; }
    finally { generator.dispose(); texture.dispose(); }
    this.scene.environmentIntensity = 0.65;
  }
  private surfaceDetails(): void {
    const geometry = new PlaneGeometry(1, 1); this.geometries.push(geometry);
    const material = new MeshStandardNodeMaterial({ color: 0x18282c, roughness: 0.12, metalness: 0.4, transparent: true, opacity: 0.32, depthWrite: false });
    this.materials.push(material);
    for (const [x, z, sx, sz] of [[-3, 2, 2, 0.5], [3, 3, 1.4, 0.6], [-1, -3, 0.8, 1.2], [4, -4, 1, 0.5]]) {
      const puddle = new Mesh(geometry, material); puddle.rotation.x = -Math.PI / 2; puddle.position.set(x!, 0.045, z!); puddle.scale.set(sx!, sz!, 1); this.scene.add(puddle);
    }
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
    const context = canvas.getContext('2d'); if (!context) return;
    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 31);
    gradient.addColorStop(0, '#d9e9e522'); gradient.addColorStop(0.5, '#d9e9e512'); gradient.addColorStop(1, '#d9e9e500');
    context.fillStyle = gradient; context.fillRect(0, 0, 64, 64);
    const texture = new CanvasTexture(canvas); this.textures.push(texture);
    const steamMaterial = new SpriteMaterial({ map: texture, transparent: true, depthWrite: false, opacity: 0.65 }); this.materials.push(steamMaterial);
    // Sprite's default quad is shared by Three.js. Own a clone so unloading this
    // courtyard cannot dispose the replacement scene's quad during a quality swap.
    const quad = new Sprite(steamMaterial).geometry.clone(); this.geometries.push(quad);
    for (let i = 0; i < 12; i++) {
      const puff = new Sprite(steamMaterial); puff.geometry = quad;
      this.steam.push(puff); this.scene.add(puff);
    }
  }
  get ownedResources(): number { return this.geometries.length + this.materials.length + this.textures.length + (this.reflection ? 1 : 0) + 1; }
  dispose(): void {
    if (this.disposed) return; this.disposed = true;
    this.preview.dispose();
    this.scene.clear(); this.scene.environment = null; this.steam.length = 0;
    for (const handle of this.handles) handle.release(); this.handles.length = 0;
    for (const geometry of this.geometries) geometry.dispose();
    for (const material of this.materials) material.dispose();
    for (const texture of this.textures) texture.dispose();
    this.reflection?.dispose(); this.reflection = null;
    this.key.dispose(); this.engine.dispose(); this.gate.dispose();
  }
}
