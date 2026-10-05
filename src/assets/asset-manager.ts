import { Mesh, SkinnedMesh, Texture, SRGBColorSpace, NoColorSpace, RepeatWrapping, type Material, type BufferGeometry, type Skeleton, type WebGPURenderer } from 'three/webgpu';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { ResourceCache, type AssetHandle } from './resource-cache';
import { validateManifest, type AssetManifest } from './manifest';

type Resource = { kind: 'model'; gltf: GLTF } | { kind: 'texture'; texture: Texture };

export class AssetManager {
  private readonly ktx = new KTX2Loader().setTranscoderPath('/assets/decoders/basis/').setWorkerLimit(2);
  private readonly gltf = new GLTFLoader();
  private readonly cache: ResourceCache<Resource>;
  private readonly pending = new Set<AbortController>();
  private manifest: AssetManifest | null = null;
  private manifestUrl = '';
  private disposed = false;
  private decodes = 0;

  constructor(readonly renderer: WebGPURenderer) {
    this.ktx.detectSupport(renderer);
    this.gltf.setMeshoptDecoder(MeshoptDecoder).setKTX2Loader(this.ktx);
    this.cache = new ResourceCache((id) => this.load(id), (resource) => this.destroy(resource));
  }
  async init(manifestUrl: string): Promise<void> {
    this.manifestUrl = new URL(manifestUrl, location.href).href;
    this.manifest = validateManifest(await this.request(this.manifestUrl, (response) => response.json() as Promise<unknown>));
  }
  private async request<T>(url: string, read: (response: Response) => Promise<T>): Promise<T> {
    if (this.disposed) throw new Error('Asset manager was disposed.');
    const controller = new AbortController(); this.pending.add(controller);
    const timer = window.setTimeout(() => controller.abort(), 25000);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
      return await read(response);
    } finally { window.clearTimeout(timer); this.pending.delete(controller); }
  }
  private async load(id: string): Promise<Resource> {
    const definition = this.manifest?.assets[id];
    if (!definition) throw new Error(`Unknown asset ID: ${id}`);
    try {
      const url = new URL(definition.url, this.manifestUrl);
      const bytes = await this.request(url.href, (response) => response.arrayBuffer());
      if (this.disposed) throw new Error('Asset loading was cancelled.');
      this.decodes++;
      try {
        if (definition.kind === 'model') return { kind: 'model', gltf: await this.gltf.parseAsync(bytes, new URL('.', url).href) };
        const texture = await new Promise<Texture>((resolve, reject) => this.ktx.parse(bytes, resolve, reject));
        texture.colorSpace = definition.colorSpace === 'srgb' ? SRGBColorSpace : NoColorSpace;
        texture.wrapS = texture.wrapT = RepeatWrapping;
        return { kind: 'texture', texture };
      } finally { this.decodes--; if (this.disposed && this.decodes === 0) this.ktx.dispose(); }
    } catch (error) {
      throw new Error(`Could not load asset "${id}" (${definition.url}): ${error instanceof Error ? error.message : String(error)}`, { cause: error });
    }
  }
  async model(id: string): Promise<AssetHandle<GLTF>> {
    const handle = await this.cache.acquire(id);
    if (handle.value.kind !== 'model') { handle.release(); throw new Error(`${id} is not a model.`); }
    return { value: handle.value.gltf, release: handle.release };
  }
  async texture(id: string): Promise<AssetHandle<Texture>> {
    const handle = await this.cache.acquire(id);
    if (handle.value.kind !== 'texture') { handle.release(); throw new Error(`${id} is not a texture.`); }
    return { value: handle.value.texture, release: handle.release };
  }
  private destroy(resource: Resource): void {
    if (resource.kind === 'texture') { resource.texture.dispose(); return; }
    const textures = new Set<Texture>();
    const geometries = new Set<BufferGeometry>(); const materials = new Set<Material>(); const skeletons = new Set<Skeleton>();
    resource.gltf.scene.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      geometries.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        for (const value of Object.values(material)) if (value instanceof Texture) textures.add(value);
        materials.add(material);
      }
      if (object instanceof SkinnedMesh) skeletons.add(object.skeleton);
    });
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
    for (const skeleton of skeletons) skeleton.dispose();
    for (const texture of textures) {
      texture.dispose();
      if (texture.source.data instanceof ImageBitmap) texture.source.data.close();
    }
  }
  get resourceCount(): number { return this.cache.size; }
  get referenceCount(): number { return this.cache.references; }
  dispose(): void {
    if (this.disposed) return; this.disposed = true;
    for (const controller of this.pending) controller.abort();
    this.pending.clear(); this.cache.dispose(); if (this.decodes === 0) this.ktx.dispose();
  }
}
