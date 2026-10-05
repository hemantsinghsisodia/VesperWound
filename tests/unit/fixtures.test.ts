import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';

describe('generated original assets', () => {
  it('contains a decodable Meshopt mesh, skin and animation', async () => {
    const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
    const doc = await io.read('public/assets/fixtures/vessel.glb');
    expect(doc.getRoot().listSkins()).toHaveLength(1);
    expect(doc.getRoot().listAnimations()).toHaveLength(1);
    expect(doc.getRoot().listExtensionsUsed().some((extension) => extension.extensionName === 'EXT_meshopt_compression')).toBe(true);
    expect(doc.getRoot().listMeshes()[0]?.listPrimitives()[0]?.getAttribute('POSITION')?.getCount()).toBeGreaterThan(100);
  });
  it('uses KTX2 containers for the generated color and normal textures', async () => {
    const signature = [0xab, 0x4b, 0x54, 0x58, 0x20, 0x32, 0x30, 0xbb, 0x0d, 0x0a, 0x1a, 0x0a];
    for (const name of ['stone', 'normal']) {
      const bytes = await readFile(`public/assets/fixtures/${name}.ktx2`);
      expect([...bytes.subarray(0, 12)]).toEqual(signature);
      expect(bytes.readUInt32LE(40)).toBe(8);
    }
  });
});
