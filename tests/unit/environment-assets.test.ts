import { expect, test } from 'vitest';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { read } from 'ktx-parse';

test('authored environment exports preserve source, spatial batches, tier and texture limits', async () => {
  const record = JSON.parse(await readFile('art/environment-provenance.json', 'utf8')) as { masterSha256: string };
  const master = await readFile('art/source/ash-quay-master.blend');
  expect(createHash('sha256').update(master).digest('hex')).toBe(record.masterSha256);
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
  for (const tier of ['desktop', 'mobile']) {
    const root = (await io.read(`public/assets/showcase/${tier}/ash-quay.glb`)).getRoot();
    expect(root.listAnimations()).toHaveLength(0); expect(root.listSkins()).toHaveLength(0);
    expect(root.listNodes().some(n => n.getName().includes('BLOCKOUT'))).toBe(false);
    expect(root.listNodes().filter(n => n.getName().startsWith('Quay cell')).length).toBeGreaterThan(4);
    expect(root.listExtensionsRequired().map(e => e.extensionName)).toEqual(expect.arrayContaining(['KHR_texture_basisu', 'EXT_meshopt_compression']));
    for (const t of root.listTextures()) {
      const k = read(t.getImage()!);
      expect(k.pixelWidth).toBeLessThanOrEqual(tier === 'desktop' ? 1024 : 512);
      expect(k.pixelHeight).toBeLessThanOrEqual(tier === 'desktop' ? 1024 : 512);
      expect(k.levels.length).toBeGreaterThan(1);
      if (root.listMaterials().some(m => m.getNormalTexture() === t)) expect(k.supercompressionScheme).toBe(2);
    }
    const manifest = JSON.parse(await readFile(`public/assets/showcase/${tier}/manifest.json`, 'utf8')) as { assets: Record<string, unknown> };
    expect(manifest.assets.reflection).toEqual({ kind: 'texture', url: 'reflection.ktx2', colorSpace: 'srgb' });
    const reflection = read(await readFile(`public/assets/showcase/${tier}/reflection.ktx2`));
    expect(reflection.pixelWidth).toBe(512); expect(reflection.pixelHeight).toBe(256);
  }
});
