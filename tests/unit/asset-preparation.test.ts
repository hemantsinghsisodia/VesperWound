import { afterEach, expect, test, vi } from 'vitest';
import { Group, Mesh, BoxGeometry, MeshStandardMaterial, type WebGPURenderer } from 'three/webgpu';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { AssetManager } from '../../src/assets/asset-manager';

let model: GLTF;
vi.mock('three/addons/loaders/KTX2Loader.js', () => ({ KTX2Loader: class {
  setTranscoderPath() { return this; } setWorkerLimit() { return this; }
  detectSupport() {} dispose() {}
} }));
vi.mock('three/addons/loaders/GLTFLoader.js', () => ({ GLTFLoader: class {
  setMeshoptDecoder() { return this; } setKTX2Loader() { return this; }
  async parseAsync() { return model; }
} }));
afterEach(() => vi.unstubAllGlobals());

async function fixture() {
  const scene = new Group(), geometry = new BoxGeometry(), material = new MeshStandardMaterial();
  scene.add(new Mesh(geometry, material)); model = { scene } as GLTF;
  const destroyed = vi.fn(); geometry.addEventListener('dispose', destroyed);
  vi.stubGlobal('location', { href: 'http://localhost/' }); vi.stubGlobal('window', globalThis);
  vi.stubGlobal('fetch', vi.fn(async (url: string) => new Response(url.endsWith('manifest.json')
    ? JSON.stringify({ version: 1, assets: { section: { kind: 'model', url: 'section.glb' } } }) : new ArrayBuffer(0))));
  const manager = new AssetManager({} as WebGPURenderer); await manager.init('/manifest.json');
  return { manager, destroyed };
}

test('disposal waits for GPU preparation before destroying a leased model', async () => {
  const { manager, destroyed } = await fixture(); let finish!: () => void;
  const prepare = vi.fn(() => new Promise<void>(resolve => { finish = resolve; }));
  const pending = manager.model('section', prepare);
  await vi.waitFor(() => expect(prepare).toHaveBeenCalledOnce());
  manager.dispose(); expect(destroyed).not.toHaveBeenCalled();
  finish(); await expect(pending).rejects.toThrow('preparation was cancelled');
  expect(destroyed).toHaveBeenCalledOnce(); expect(manager.resourceCount).toBe(0);
});

test('failed preparation releases its lease and permits a fresh retry', async () => {
  const { manager, destroyed } = await fixture();
  await expect(manager.model('section', async () => { throw new Error('shader failed'); })).rejects.toThrow('shader failed');
  expect(manager.referenceCount).toBe(0); expect(destroyed).toHaveBeenCalledOnce();
  const retry = await manager.model('section', async () => {});
  expect(manager.referenceCount).toBe(1); retry.release(); manager.dispose();
  expect(manager.resourceCount).toBe(0);
});
