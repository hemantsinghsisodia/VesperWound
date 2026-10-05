import {
  Scene, Color, FogExp2, Group, Mesh, BoxGeometry, CylinderGeometry, TorusGeometry,
  SphereGeometry, PlaneGeometry, MeshStandardNodeMaterial, MeshBasicNodeMaterial,
  InstancedMesh, Object3D, DirectionalLight, HemisphereLight, PointLight,
  AnimationMixer, Vector3, BufferGeometry, Float32BufferAttribute, Points,
  PointsNodeMaterial, AdditiveBlending, DoubleSide, CanvasTexture,
  type Material, type Texture,
} from 'three/webgpu';
import { uniform } from 'three/tsl';
import type { AssetHandle } from '../assets/resource-cache';
import type { AssetManager } from '../assets/asset-manager';
import type { QualityProfile } from '../performance/quality';
import type { InputFrame } from '../core/input-frame';

/** Technical fixture only: the marker exercises input and camera, not player gameplay. */
export class Courtyard {
  readonly scene = new Scene();
  readonly target = new Vector3(0, 0.8, 5);
  readonly previousTarget = this.target.clone();
  private readonly root = new Group();
  private readonly geometries = new Set<BufferGeometry>();
  private readonly materials = new Set<Material>();
  private readonly textures = new Set<Texture>();
  private readonly handles: Array<{ release(): void }> = [];
  private readonly decorative = new Group();
  private mixer: AnimationMixer | null = null;
  private readonly lamp = new PointLight(0xffc177, 90, 17, 2);
  private readonly key = new DirectionalLight(0xacc7cc, 3);
  private readonly marker = new Group();
  private pulseValue = 0;
  private readonly glow = uniform(1.8);
  private readonly pulseRing: Mesh;
  private particles: Points | null = null;
  private time = 0;
  private disposed = false;

  constructor() {
    this.scene.background = new Color(0x142023);
    this.scene.fog = new FogExp2(0x142023, 0.033);
    this.scene.add(this.root);
    this.root.add(this.decorative, this.marker);
    this.pulseRing = new Mesh(this.geometry(new TorusGeometry(1, 0.02, 6, 64)), this.material(new MeshBasicNodeMaterial({ color: 0xe7b56a, transparent: true, opacity: 0 })));
    this.pulseRing.rotation.x = Math.PI / 2;
    this.root.add(this.pulseRing);
  }

  async load(assets: AssetManager, missingFixture: boolean): Promise<void> {
    const acquired = await Promise.allSettled([assets.texture('stone'), assets.texture('normal'), assets.model(missingFixture ? 'missing-vessel' : 'vessel')]);
    if (this.disposed) {
      for (const result of acquired) if (result.status === 'fulfilled') result.value.release();
      throw new Error('Courtyard load was cancelled.');
    }
    for (const result of acquired) if (result.status === 'fulfilled') this.handles.push(result.value);
    const failure = acquired.find((result) => result.status === 'rejected');
    if (failure?.status === 'rejected') { this.dispose(); throw failure.reason; }
    const stone = (acquired[0] as PromiseFulfilledResult<AssetHandle<Texture>>).value.value;
    const normal = (acquired[1] as PromiseFulfilledResult<AssetHandle<Texture>>).value.value;
    stone.repeat.set(2, 2); normal.repeat.set(2, 2);
    const vessel = acquired[2];
    if (vessel?.status !== 'fulfilled' || !('animations' in vessel.value.value)) throw new Error('Animated fixture was not loaded.');
    const gltf = vessel.value.value;
    gltf.scene.position.set(0, 1.4, -3);
    gltf.scene.traverse((object) => { if (object instanceof Mesh) { object.castShadow = true; object.receiveShadow = true; } });
    this.root.add(gltf.scene);
    this.mixer = new AnimationMixer(gltf.scene);
    for (const clip of gltf.animations) this.mixer.clipAction(clip).play();
    this.build(stone, normal);
  }

  private geometry<T extends BufferGeometry>(value: T): T { this.geometries.add(value); return value; }
  private material<T extends Material>(value: T): T { this.materials.add(value); return value; }
  private place(geometry: BufferGeometry, material: Material, position: [number, number, number], scale: [number, number, number] = [1, 1, 1], rotation = 0): Mesh {
    const mesh = new Mesh(geometry, material);
    mesh.position.set(...position); mesh.scale.set(...scale); mesh.rotation.y = rotation;
    mesh.castShadow = true; mesh.receiveShadow = true; this.root.add(mesh); return mesh;
  }
  private instances(geometry: BufferGeometry, material: Material, placements: Array<[number, number, number, number, number, number, number]>, decorative = false): InstancedMesh {
    const mesh = new InstancedMesh(geometry, material, placements.length);
    const transform = new Object3D();
    placements.forEach(([x, y, z, sx, sy, sz, rotation], index) => {
      transform.position.set(x, y, z); transform.scale.set(sx, sy, sz); transform.rotation.set(0, rotation, 0); transform.updateMatrix(); mesh.setMatrixAt(index, transform.matrix);
    });
    mesh.castShadow = true; mesh.receiveShadow = true; mesh.computeBoundingSphere();
    (decorative ? this.decorative : this.root).add(mesh); return mesh;
  }

  private build(stone: Texture, normal: Texture): void {
    const box = this.geometry(new BoxGeometry(1, 1, 1));
    const cylinder = this.geometry(new CylinderGeometry(1, 1, 1, 12));
    const rock = this.material(new MeshStandardNodeMaterial({ color: 0x788782, map: stone, normalMap: normal, roughness: 0.88 }));
    const dark = this.material(new MeshStandardNodeMaterial({ color: 0x33433f, map: stone, normalMap: normal, roughness: 0.94 }));
    const iron = this.material(new MeshStandardNodeMaterial({ color: 0x34413e, metalness: 0.72, roughness: 0.5 }));
    const brass = this.material(new MeshStandardNodeMaterial({ color: 0x89764f, metalness: 0.68, roughness: 0.45 }));
    const warm = this.material(new MeshStandardNodeMaterial({ color: 0xffd898, emissive: 0xff9b3d, emissiveIntensity: 2.5, roughness: 0.4 }));
    warm.emissiveNode = uniform(new Color(0xffa955)).mul(this.glow);
    this.place(box, dark, [0, -0.6, 0], [34, 1, 32]);
    const tiles: Array<[number, number, number, number, number, number, number]> = [];
    for (let x = -8; x <= 8; x++) for (let z = -8; z <= 7; z++) {
      if (Math.abs(x) < 2 && z >= -3 && z <= 0) continue;
      tiles.push([x * 1.9, -0.03 + Math.sin(x * 8 + z * 3) * 0.012, z * 1.9, 1.82, 0.18, 1.82, 0]);
    }
    this.instances(box, rock, tiles);
    const pillars: Array<[number, number, number, number, number, number, number]> = [];
    for (const x of [-12, -7, 7, 12]) {
      pillars.push([x, 3.4, -12, 1.3, 7, 1.4, 0], [x, 0.5, -12, 1.8, 1, 1.9, 0]);
      this.place(box, brass, [x, 6.6, -12], [1.55, 0.25, 1.6]);
    }
    this.instances(box, dark, pillars);
    this.place(box, dark, [0, 7.4, -13], [28, 1.2, 2.2]);
    this.place(box, dark, [0, 4, -15], [32, 9, 2]);
    this.place(box, iron, [0, 9, -14], [6.5, 7, 2.5]);
    this.place(box, brass, [0, 12.6, -14], [7, 0.5, 3]);
    this.place(box, iron, [0, 11, -12.65], [0.22, 3.5, 0.15]);
    this.place(box, iron, [0, 11, -12.65], [3.5, 0.22, 0.15]);
    for (const x of [-14.5, 14.5]) {
      this.place(box, dark, [x, 2, -3], [1.3, 4, 21]);
      this.place(box, rock, [x, 4.1, -3], [1.8, 0.3, 21]);
    }
    for (const x of [-9, 9]) {
      this.place(box, dark, [x, 0.7, -5], [4, 1.5, 9]);
      this.place(box, rock, [x, 1.55, -5], [4.3, 0.25, 9.2]);
      for (let i = 0; i < 4; i++) this.place(box, brass, [x, 1.75, -8 + i * 2], [3.4, 0.12, 0.05]);
    }
    const pipes: Array<[number, number, number, number, number, number, number]> = [];
    for (const x of [-11.2, -10.6, 10.6, 11.2]) pipes.push([x, 3, -12, 0.13, 6, 0.13, 0]);
    this.instances(cylinder, brass, pipes);
    const pedestal = this.place(cylinder, rock, [0, 0.55, -3], [2.4, 1.1, 2.4]);
    pedestal.castShadow = true;
    for (const radius of [1.8, 2.8, 3.4]) {
      const ring = this.place(this.geometry(new TorusGeometry(radius, 0.06, 6, 64)), brass, [0, 0.15, -3]);
      ring.rotation.x = Math.PI / 2;
    }
    this.place(box, iron, [0, 5.2, -3], [7, 0.3, 0.4]);
    for (const x of [-3.3, 3.3]) {
      this.place(box, iron, [x, 2.6, -3], [0.22, 5.2, 0.3]);
      this.place(box, brass, [x, 0.25, -3], [0.8, 0.4, 0.8]);
    }
    this.place(cylinder, brass, [0, 4.7, -3], [0.065, 1, 0.065]);
    this.place(cylinder, warm, [0, 1.3, -3], [0.24, 0.45, 0.24]);
    for (const [x, z] of [[-7, 2], [7, -1], [-9, -10], [9, -10]] as const) {
      this.place(cylinder, iron, [x, 1.2, z], [0.12, 2.4, 0.12]);
      this.place(cylinder, brass, [x, 2.5, z], [0.32, 0.18, 0.32]);
      this.place(cylinder, warm, [x, 2.75, z], [0.15, 0.45, 0.15]);
    }
    this.lamp.position.set(0, 2.2, -3);
    this.key.position.set(-8, 18, 5); this.key.target.position.set(0, 0, -3);
    this.key.castShadow = true;
    Object.assign(this.key.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, near: 1, far: 45 });
    this.key.shadow.bias = -0.0007; this.key.shadow.normalBias = 0.05;
    this.root.add(new HemisphereLight(0x94b8b7, 0x293226, 1.7), this.key, this.key.target, this.lamp);
    const side = new PointLight(0xc68f4c, 65, 15, 2); side.position.set(-7, 3, 2); this.root.add(side);
    const cold = new PointLight(0x7fadb9, 45, 18, 2); cold.position.set(9, 3, -9); this.root.add(cold);
    const markerMaterial = this.material(new MeshStandardNodeMaterial({ color: 0xd6b77e, emissive: 0xa87d37, emissiveIntensity: 0.4, metalness: 0.5, roughness: 0.4 }));
    const marker = new Mesh(this.geometry(new SphereGeometry(0.19, 12, 8)), markerMaterial);
    marker.castShadow = true; this.marker.add(marker);
    const markerRing = new Mesh(this.geometry(new TorusGeometry(0.45, 0.018, 4, 32)), brass);
    markerRing.rotation.x = Math.PI / 2; markerRing.position.y = -0.65; this.marker.add(markerRing);
    this.marker.position.copy(this.target);
    this.buildAtmosphere();
  }

  private buildAtmosphere(): void {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
    const context = canvas.getContext('2d');
    if (context) {
      const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, 'rgba(180,210,203,0.18)'); gradient.addColorStop(1, 'rgba(180,210,203,0)');
      context.fillStyle = gradient; context.fillRect(0, 0, 64, 64);
    }
    const texture = new CanvasTexture(canvas); this.textures.add(texture);
    const haze = this.material(new MeshBasicNodeMaterial({ map: texture, color: 0x93b8b7, transparent: true, opacity: 0.2, depthWrite: false, side: DoubleSide }));
    const plane = this.geometry(new PlaneGeometry(1, 1));
    for (const [x, z] of [[-5, 4], [5, -6], [0, -10]] as const) {
      const mesh = new Mesh(plane, haze); mesh.position.set(x, 0.4, z); mesh.rotation.x = -Math.PI / 2; mesh.scale.set(14, 8, 1); this.decorative.add(mesh);
    }
    const positions = new Float32Array(180 * 3);
    for (let i = 0; i < 180; i++) { positions[i * 3] = Math.sin(i * 19.12) * 13; positions[i * 3 + 1] = (i * 0.117) % 5; positions[i * 3 + 2] = Math.cos(i * 7.83) * 12; }
    const geometry = this.geometry(new BufferGeometry().setAttribute('position', new Float32BufferAttribute(positions, 3)));
    const material = this.material(new PointsNodeMaterial({ color: 0xc1b997, size: 0.025, transparent: true, opacity: 0.45, depthWrite: false, blending: AdditiveBlending, sizeAttenuation: true }));
    this.particles = new Points(geometry, material); this.decorative.add(this.particles);
  }

  configure(profile: QualityProfile): void {
    if (this.key.shadow.mapSize.x !== profile.shadowSize) { this.key.shadow.map?.dispose(); this.key.shadow.map = null; }
    this.key.shadow.mapSize.set(profile.shadowSize, profile.shadowSize);
    this.key.shadow.needsUpdate = true;
    if (this.particles) this.particles.geometry.setDrawRange(0, Math.round(180 * profile.decoration));
    this.decorative.visible = profile.decoration > 0;
  }
  update(dt: number, input: InputFrame, reducedMotion: boolean): boolean {
    this.time += dt; this.previousTarget.copy(this.target);
    this.target.x = Math.min(8, Math.max(-8, this.target.x + (input.movement.x + input.movement.y) * 2.2 * dt));
    this.target.z = Math.min(10, Math.max(1, this.target.z + (input.movement.y - input.movement.x) * 2.2 * dt));
    this.mixer?.update(reducedMotion ? dt * 0.35 : dt);
    this.glow.value = reducedMotion ? 1.8 : 1.8 + Math.sin(this.time * 1.7) * 0.18;
    this.lamp.intensity = 90 + Math.sin(this.time * 1.7) * 4;
    this.pulseValue = Math.max(0, this.pulseValue - dt * 1.7);
    if (input.pressed.has('pulse')) this.pulseValue = 1;
    const pulseMaterial = this.pulseRing.material as MeshBasicNodeMaterial;
    pulseMaterial.opacity = this.pulseValue * 0.65;
    const radius = 1 + (1 - this.pulseValue) * 4;
    this.pulseRing.scale.setScalar(reducedMotion ? 1.8 : radius);
    this.pulseRing.position.set(this.target.x, 0.16, this.target.z);
    if (this.particles && !reducedMotion) { this.particles.rotation.y = Math.sin(this.time * 0.05) * 0.08; this.particles.position.y = Math.sin(this.time * 0.17) * 0.2; }
    return input.pressed.has('pulse');
  }
  interpolate(alpha: number): void { this.marker.position.lerpVectors(this.previousTarget, this.target, alpha); }
  get ownedResources(): number { return this.geometries.size + this.materials.size + this.textures.size; }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.mixer?.stopAllAction();
    if (this.mixer) this.mixer.uncacheRoot(this.mixer.getRoot());
    this.key.shadow.map?.dispose();
    this.scene.clear(); this.root.clear();
    for (const geometry of this.geometries) geometry.dispose();
    for (const material of this.materials) material.dispose();
    for (const texture of this.textures) texture.dispose();
    for (const handle of this.handles) handle.release();
    this.geometries.clear(); this.materials.clear(); this.textures.clear(); this.handles.length = 0;
  }
}
