import { Scene, Color, PerspectiveCamera, DirectionalLight, HemisphereLight, Mesh, PlaneGeometry, MeshStandardNodeMaterial, Vector3, CubeTexture, SRGBColorSpace, PMREMGenerator, type RenderTarget } from 'three/webgpu';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { AssetManager } from '../assets/asset-manager';
import type { QualityProfile } from '../performance/quality';
import type { InspectionLighting, InspectionView, WorldPresentation } from './presentation';
import { PreviewActor } from './preview-actor';
import { MEDIC, type CharacterDefinition } from './character-definition';
import { PLAYER_CLIP_DESCRIPTORS } from '../player/player-animation';

/** Optional studio owns model/animation references and its own camera/listeners. */
export class CharacterInspection implements WorldPresentation {
  readonly scene = new Scene();
  readonly target = new Vector3();
  readonly camera = new PerspectiveCamera(35, 1, 0.02, 30);
  readonly actor: PreviewActor;
  view: InspectionView = 'full-body';
  lighting: InspectionLighting = 'neutral';
  private readonly controls: OrbitControls;
  private readonly key = new DirectionalLight(0xfff6ea, 3);
  private readonly fill = new DirectionalLight(0xe5eeff, 1.4);
  private readonly rim = new DirectionalLight(0xffffff, 1.8);
  private readonly hemisphere = new HemisphereLight(0xe1e4ea, 0x3c3934, 1.1);
  private readonly floor = new Mesh(new PlaneGeometry(16, 16), new MeshStandardNodeMaterial({ color: 0x343a3c, roughness: 0.82 }));
  private reflection: RenderTarget | null = null;
  private readonly handles: Array<{ release(): void }> = [];
  private disposed = false;
  constructor(canvas: HTMLCanvasElement, private readonly definition: CharacterDefinition = { ...MEDIC, clips: PLAYER_CLIP_DESCRIPTORS }) {
    this.actor = new PreviewActor(definition);
    this.scene.background = new Color(0x30363a);
    this.floor.rotation.x = -Math.PI / 2; this.floor.receiveShadow = true;
    this.key.position.set(-2.5, 3.5, 3); this.fill.position.set(2, 2, 1); this.rim.position.set(0, 2.5, -2);
    for (const light of [this.key, this.fill, this.rim]) light.target.position.set(0, 1, 0);
    this.key.castShadow = true; this.key.shadow.normalBias = 0.012; this.key.shadow.bias = -0.0002;
    Object.assign(this.key.shadow.camera, { left: -2, right: 2, top: 3, bottom: -1, near: 0.1, far: 10 });
    this.scene.add(this.actor.group, this.floor, this.key, this.key.target, this.fill, this.fill.target, this.rim, this.rim.target, this.hemisphere);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enabled = false; this.controls.enablePan = false; this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.12; this.controls.maxPolarAngle = Math.PI * 0.85;
    this.selectView('full-body');
  }
  async load(assets: AssetManager): Promise<void> {
    const loaded = await Promise.allSettled([assets.model('character'), assets.model('animations')]);
    for (const result of loaded) if (result.status === 'fulfilled') { if (this.disposed) result.value.release(); else this.handles.push(result.value); }
    if (this.disposed) throw new Error('Inspection was cancelled.');
    const character = loaded[0]; const animations = loaded[1];
    const failed = loaded.find(result => result.status === 'rejected');
    if (failed?.status === 'rejected') throw failed.reason;
    if (character?.status !== 'fulfilled' || animations?.status !== 'fulfilled') throw new Error('Inspection is incomplete.');
    this.actor.attach({ scene: character.value.value.scene, animations: animations.value.value.animations });
    // A soft, owned reflection field makes the imported materials readable.
    const faces = Array.from({ length: 6 }, () => {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 32;
      const context = canvas.getContext('2d'); if (!context) throw new Error('Studio reflection canvas unavailable.');
      const gradient = context.createLinearGradient(0, 0, 0, 32);
      gradient.addColorStop(0, '#b0b2b5'); gradient.addColorStop(0.5, '#777c80'); gradient.addColorStop(1, '#303234');
      context.fillStyle = gradient; context.fillRect(0, 0, 32, 32); return canvas;
    });
    const texture = new CubeTexture(faces); texture.colorSpace = SRGBColorSpace; texture.needsUpdate = true;
    const generator = new PMREMGenerator(assets.renderer);
    try { this.reflection = generator.fromCubemap(texture); this.scene.environment = this.reflection.texture; }
    finally { generator.dispose(); texture.dispose(); }
    this.scene.environmentIntensity = 0.45; this.update(0);
  }
  activate(): void { this.controls.enabled = true; }
  selectView(view: InspectionView): void {
    this.view = view;
    const setups = this.definition.cameras[view];
    this.controls.target.fromArray(setups.target); this.camera.position.fromArray(setups.position);
    this.controls.minDistance = setups.near; this.controls.maxDistance = setups.far; this.controls.update();
  }
  selectLighting(lighting: InspectionLighting): void {
    this.lighting = lighting;
    const ash = lighting === 'ash-quay';
    this.scene.background = new Color(ash ? 0x142126 : 0x30363a);
    this.key.color.set(ash ? 0xc8dcdf : 0xfff6ea); this.key.intensity = ash ? 2.6 : 3;
    this.fill.intensity = ash ? 0.8 : 1.4; this.hemisphere.intensity = ash ? 0.65 : 1.1;
  }
  resize(width: number, height: number): void { this.camera.aspect = width / Math.max(1, height); this.camera.updateProjectionMatrix(); }
  configure(profile: QualityProfile): void {
    if (this.key.shadow.mapSize.x !== profile.shadowSize) { this.key.shadow.map?.dispose(); this.key.shadow.map = null; }
    this.key.shadow.mapSize.set(profile.shadowSize, profile.shadowSize); this.key.shadow.needsUpdate = true;
  }
  update(dt: number): boolean {
    this.actor.update(dt); this.scene.updateMatrixWorld(true);
    this.controls.update(); return false;
  }
  interpolate(): void { /* Skeletal previews are in place. */ }
  get ownedResources(): number { return 4; }
  dispose(): void {
    if (this.disposed) return; this.disposed = true;
    this.controls.dispose(); this.actor.dispose(); this.scene.clear(); this.scene.environment = null;
    for (const handle of this.handles) handle.release(); this.handles.length = 0;
    this.reflection?.dispose(); this.reflection = null;
    this.floor.geometry.dispose(); this.floor.material.dispose();
    for (const light of [this.key, this.fill, this.rim, this.hemisphere]) light.dispose();
  }
}
