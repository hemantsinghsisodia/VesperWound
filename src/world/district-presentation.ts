import { Box3, Group, Mesh, BoxGeometry, MeshStandardNodeMaterial, Ray, Texture, Vector3, type Camera, type Scene, type Object3D } from 'three/webgpu';
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
  private mission = false;
  private readonly harbourOriginals: Array<{ object:Object3D; x:number; visible:boolean; wall:boolean }> = [];
  private readonly harbourSegments:Mesh[]=[];
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
        const textures = new Set<Texture>();
        for (const mesh of meshes) for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
          for (const value of Object.values(material)) if (value instanceof Texture) textures.add(value);
        }
        // Upload one texture per browser turn, before shader construction can
        // implicitly upload all maps for several materials in one long task.
        for (const texture of textures) {
          await preparationFrame();
          if (this.disposed) return;
          assets.renderer.initTexture(texture);
        }
        // Prepare off-scene against the actual lighting. The section remains
        // gated until asynchronous shader construction has yielded and completed.
        for (const mesh of meshes) {
          await preparationFrame();
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
      this.prepareHarbour(gltf.scene);
    }, gltf => { this.restoreHarbour(); this.group.remove(gltf.scene); this.cutaways.length = 0; this.gate.visible = true; }, true);
  }
  private prepareHarbour(root:Object3D):void {
    root.traverse(object=>{
      const name=object.name.replaceAll('_',' ').replace(/\s+/g,' ').trim();
      const wall=name==='Harbour edge';
      if(wall||name.startsWith('Arrival sign post')||name==='Arrival harbour sign'||name==='Lettering ASH QUAY ARRIVALS')
        this.harbourOriginals.push({object,x:object.position.x,visible:object.visible,wall});
    });
    // Share the loaded geometry/materials under the same asset lease. This
    // opens a visual boarding gap, without extending the navigable quay.
    for(const {object,wall} of this.harbourOriginals)if(wall&&object instanceof Mesh){
      for(const x of [-4.65,4.65]){
        const segment=object.clone();segment.name='Mission harbour side';
        segment.position.x=x;segment.scale.x*=3.55/8.2;
        object.parent?.add(segment);this.harbourSegments.push(segment);
      }
    }
    this.applyHarbour();
  }
  setMission(active:boolean):void {if(active===this.mission)return;this.mission=active;this.applyHarbour();}
  private applyHarbour():void {
    for(const {object,x,visible,wall} of this.harbourOriginals){
      object.position.x=x-(!wall&&this.mission?4.6:0);
      object.visible=visible&&(!wall||!this.mission);
    }
    for(const segment of this.harbourSegments)segment.visible=this.mission;
  }
  private restoreHarbour():void {
    for(const {object,x,visible} of this.harbourOriginals){object.position.x=x;object.visible=visible;}
    for(const segment of this.harbourSegments)segment.removeFromParent();
    this.harbourOriginals.length=0;this.harbourSegments.length=0;
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

/** Permit a drawn frame between upload batches; background tabs still settle. */
function preparationFrame(): Promise<void> {
  return new Promise(resolve => {
    const finish = () => { clearTimeout(timer); cancelAnimationFrame(frame); resolve(); };
    const frame = requestAnimationFrame(finish), timer = setTimeout(finish, 100);
  });
}
