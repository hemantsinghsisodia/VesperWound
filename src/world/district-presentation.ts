import { Box3, Group, Mesh, BoxGeometry, MeshStandardNodeMaterial, Ray, Vector3, type Camera, type Scene } from 'three/webgpu';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import type { AssetManager } from '../assets/asset-manager';
import { SectionStream } from '../assets/section-stream';
import { configureEnvironmentMesh } from './environment-mesh';

/** Visual section owner. CPU collision uses the readiness snapshot, never meshes. */
export class DistrictPresentation {
  readonly group = new Group();
  readonly stream: SectionStream<GLTF>;
  private readonly gateGeometry = new BoxGeometry(4.8, .8, .14);
  private readonly gateMaterial = new MeshStandardNodeMaterial({ color: 0x514936, metalness: .6, roughness: .7 });
  private readonly gate = new Mesh(this.gateGeometry, this.gateMaterial);
  private readonly cutaways: Array<{ mesh: Mesh; bounds: Box3 }> = [];
  private readonly ray = new Ray();
  private readonly direction = new Vector3();
  private readonly hit = new Vector3();
  private disposed = false;
  private readonly preparations = new WeakMap<GLTF, Promise<void>>();
  constructor(assets: AssetManager, scene: Scene, camera: Camera) {
    this.gate.position.set(0, .55, 8.05); this.gate.castShadow = true; this.group.add(this.gate);
    this.stream = new SectionStream(() => assets.model('quayside', async gltf => {
      if (this.disposed) return;
      const existing = this.preparations.get(gltf);
      if (existing) return existing;
      const meshes: Mesh[] = [];
      gltf.scene.updateMatrixWorld(true);
      gltf.scene.traverse(object => {
        if (object instanceof Mesh) { configureEnvironmentMesh(object); object.frustumCulled = false; meshes.push(object); }
      });
      const preparation = (async () => { try {
        // Prepare off-scene against the actual lighting. The section remains
        // gated until asynchronous shader construction has yielded and completed.
        for (const mesh of meshes) {
          if (this.disposed) break;
          await assets.renderer.compileAsync(mesh, camera, scene);
        }
      } finally { for (const mesh of meshes) mesh.frustumCulled = true; } })();
      this.preparations.set(gltf, preparation); await preparation;
    }), gltf => {
      this.group.add(gltf.scene); gltf.scene.updateMatrixWorld(true); this.gate.visible = false;
      gltf.scene.traverse(object => {
        if (!(object instanceof Mesh)) return;
        configureEnvironmentMesh(object);
        let parent = object.parent;
        while (parent && !parent.name.includes('Cutaway')) parent = parent.parent;
        if (parent) this.cutaways.push({ mesh: object, bounds: new Box3().setFromObject(object) });
      });
    }, gltf => { this.group.remove(gltf.scene); this.cutaways.length = 0; this.gate.visible = true; });
  }
  update(z: number): void { this.stream.update(z); this.gate.visible = this.stream.status !== 'ready'; }
  visibility(camera: Camera, target: Vector3, playing: boolean): void {
    this.direction.copy(target); this.direction.y += 1.8; this.direction.sub(camera.position);
    const distance = this.direction.length(); this.ray.set(camera.position, this.direction.normalize());
    for (const { mesh, bounds } of this.cutaways) {
      const intersection = this.ray.intersectBox(bounds, this.hit);
      const beneath = target.x >= bounds.min.x - .4 && target.x <= bounds.max.x + .4 && target.z >= bounds.min.z - .4 && target.z <= bounds.max.z + .4 && target.y < bounds.max.y;
      mesh.visible = !playing || !beneath && (!intersection || camera.position.distanceTo(intersection) >= distance - .25);
    }
  }
  get hiddenCutaways(): number { return this.cutaways.filter(({ mesh }) => !mesh.visible).length; }
  dispose(): void { this.disposed = true; this.stream.dispose(); this.gateGeometry.dispose(); this.gateMaterial.dispose(); this.group.clear(); }
}
