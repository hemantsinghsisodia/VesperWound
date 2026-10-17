import { expect, test, vi } from 'vitest';
import { Group, Mesh, BoxGeometry, MeshStandardMaterial, CompressedTexture, RGBA_BPTC_Format, SRGBColorSpace } from 'three/webgpu';
import { SharedModelTextures } from '../../src/assets/shared-model-textures';

function fixture(value = 3) {
  const texture = new CompressedTexture([{ width: 4, height: 4, data: new Uint8Array(16).fill(value) }], 4, 4, RGBA_BPTC_Format);
  const root = new Group(), material = new MeshStandardMaterial({ map: texture }), geometry = new BoxGeometry();
  root.add(new Mesh(geometry, material));
  const disposed = vi.fn(); texture.addEventListener('dispose', disposed);
  return { root, material, texture, disposed, clean: () => { geometry.dispose(); material.dispose(); } };
}

test('identical maps share residency until the last model releases, regardless of release order', async () => {
  const pool = new SharedModelTextures(), first = fixture(), second = fixture();
  const a = await pool.retain(first.root), b = await pool.retain(second.root);
  expect(second.material.map).toBe(first.texture); expect(second.disposed).toHaveBeenCalledOnce();
  a(); a(); expect(first.disposed).not.toHaveBeenCalled();
  b(); b(); expect(first.disposed).toHaveBeenCalledOnce(); first.clean(); second.clean();
  const fresh = fixture(), release = await pool.retain(fresh.root);
  expect(fresh.material.map).toBe(fresh.texture); release(); expect(fresh.disposed).toHaveBeenCalledOnce(); fresh.clean();
});

test('concurrent models, duplicate slots and different content keep correct ownership', async () => {
  const pool = new SharedModelTextures(), first = fixture(), second = fixture(), third = fixture(7);
  first.material.normalMap = first.texture;
  const releases = await Promise.all([pool.retain(first.root), pool.retain(second.root), pool.retain(third.root)]);
  expect(first.material.map).toBe(second.material.map); expect(third.material.map).not.toBe(first.material.map);
  releases[1]!(); expect(first.disposed).not.toHaveBeenCalled(); releases[0]!(); releases[2]!();
  expect(first.disposed).toHaveBeenCalledOnce(); expect(third.disposed).toHaveBeenCalledOnce();
  first.clean(); second.clean(); third.clean();
});

test.each(['colour', 'uv', 'sampling'] as const)('identical bytes with different %s settings are not merged', async difference => {
  const pool = new SharedModelTextures(), first = fixture(), second = fixture();
  if (difference === 'colour') second.texture.colorSpace = SRGBColorSpace;
  if (difference === 'uv') second.texture.repeat.set(2, 3);
  if (difference === 'sampling') second.texture.anisotropy = 4;
  const a = await pool.retain(first.root), b = await pool.retain(second.root);
  expect(second.material.map).toBe(second.texture); a(); expect(second.disposed).not.toHaveBeenCalled(); b();
  expect(first.disposed).toHaveBeenCalledOnce(); expect(second.disposed).toHaveBeenCalledOnce(); first.clean(); second.clean();
});
