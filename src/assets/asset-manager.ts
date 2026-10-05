import { Mesh, Texture, SRGBColorSpace, NoColorSpace, RepeatWrapping, type WebGPURenderer } from 'three/webgpu';
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

  constructor(renderer: WebGPURenderer) {
    this.ktx.detectSupport(renderer);
    this.gltf.setMeshoptDecoder(MeshoptDecoder).setKTX2Loader(this.ktx);
    this.cache = new ResourceCache((id) => this.load(id), (resource) => this.destroy(resource));
  }
  async init(): Promise<void> {
    this.manifest = validateManifest(await this.fetch('/assets/fixtures/manifest.json').then((response) => response.json() as Promise<unknown>));
  }
  private async fetch(url: string): Promise<Response> {
    const controller = new AbortController(); this.pending.add(controller);
    const timer = window.setTimeout(() => controller.abort(), 25000);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
      return response;
    } finally { window.clearTimeout(timer); this.pending.delete(controller); }
  }
  private async load(id: string): Promise<Resource> {
    const definition = this.manifest?.assets[id];
    if (!definition) throw new Error(`Unknown asset ID: ${id}`);
    try {
      const bytes = await this.fetch(definition.url).then((response) => response.arrayBuffer());
      if (definition.kind === 'model') return { kind: 'model', gltf: await this.gltf.parseAsync(bytes, '/assets/fixtures/') };
      const texture = await new Promise<Texture>((resolve, reject) => this.ktx.parse(bytes, resolve, reject));
      texture.colorSpace = definition.colorSpace === 'srgb' ? SRGBColorSpace : NoColorSpace;
      texture.wrapS = texture.wrapT = RepeatWrapping;
      return { kind: 'texture', texture };
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
    resource.gltf.scene.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      object.geometry.dispose();
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        for (const value of Object.values(material)) if (value instanceof Texture) textures.add(value);
        material.dispose();
      }
      if ('skeleton' in object && typeof object.skeleton === 'object' && object.skeleton && 'dispose' in object.skeleton && typeof object.skeleton.dispose === 'function') object.skeleton.dispose();
    });
    for (const texture of textures) {
      texture.dispose();
      if (texture.source.data instanceof ImageBitmap) texture.source.data.close();
    }
  }
  get resourceCount(): number { return this.cache.size; }
  get referenceCount(): number { return this.cache.references; }
  dispose(): void {
    for (const controller of this.pending) controller.abort();
    this.pending.clear(); this.cache.dispose(); this.ktx.dispose();
  }
}
