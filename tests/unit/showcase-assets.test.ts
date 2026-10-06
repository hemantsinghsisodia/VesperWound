import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { read } from 'ktx-parse';

describe('imported Medic exports', () => {
  for (const tier of ['desktop', 'mobile', 'cinematic']) it(`${tier} preserves supplied rig, static pose, normalized weights and budgets`, async () => {
    const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
    const doc = await io.read(`public/assets/showcase/${tier}/character.glb`); const root = doc.getRoot();
    const inventory = JSON.parse(await readFile('docs/qa/medic/source-inventory.json', 'utf8')) as { objects: Array<{ type: string; bones?: string[] }> };
    const bones = inventory.objects.find((o) => o.type === 'ARMATURE')!.bones!;
    const exported = new Set(root.listSkins().flatMap((s) => s.listJoints().map((j) => j.getName())));
    expect([...exported].sort()).toEqual([...bones].sort()); expect(bones).toHaveLength(67);
    expect(root.listAnimations()).toHaveLength(0);
    const count = root.listMeshes().reduce((sum, m) => sum + m.listPrimitives().reduce((n, p) => n + p.getIndices()!.getCount() / 3, 0), 0);
    expect(count).toBe(18745); expect(count).toBeLessThanOrEqual(tier === 'mobile' ? 20000 : tier === 'desktop' ? 50000 : 180000);
    for (const node of root.listNodes()) if (node.getMesh()) {
      const skin = node.getSkin(); expect(skin).not.toBeNull();
      for (const p of node.getMesh()!.listPrimitives()) {
        const weights = p.getAttribute('WEIGHTS_0')!; const joints = p.getAttribute('JOINTS_0')!;
        expect(weights).not.toBeNull(); expect(joints).not.toBeNull();
        const w: number[] = []; const j: number[] = [];
        for (let i = 0; i < weights.getCount(); i++) {
          weights.getElement(i, w); joints.getElement(i, j);
          expect(Math.abs(w.reduce((sum, x) => sum + x, 0) - 1)).toBeLessThan(.005);
          expect(w.every((x) => Number.isFinite(x) && x >= 0)).toBe(true);
          expect(j.every((x) => Number.isInteger(x) && x >= 0 && x < skin!.listJoints().length)).toBe(true);
        }
      }
    }
    expect(root.listExtensionsRequired().map((e) => e.extensionName)).toEqual(expect.arrayContaining(['KHR_texture_basisu', 'EXT_meshopt_compression']));
    for (const t of root.listTextures()) {
      expect(t.getMimeType()).toBe('image/ktx2'); const k = read(t.getImage()!);
      expect(k.pixelWidth).toBeLessThanOrEqual(1024); expect(k.pixelHeight).toBeLessThanOrEqual(1024); expect(k.levels.length).toBeGreaterThan(1);
    }
    for (const m of root.listMaterials()) if (m.getNormalTexture()) {
      const k = read(m.getNormalTexture()!.getImage()!); expect(k.supercompressionScheme).toBe(2); expect(k.dataFormatDescriptor[0]?.colorModel).toBe(166);
    }
    const manifest = JSON.parse(await readFile(`public/assets/showcase/${tier}/manifest.json`, 'utf8')) as { assets: Record<string, unknown> };
    expect(manifest.assets.character).toEqual({ kind: 'model', url: 'character.glb' }); expect(manifest.assets.iona).toBeUndefined();
  });
  it('reuses equivalent tiers without inventing source detail', async () => {
    const buffers = await Promise.all(['desktop', 'mobile', 'cinematic'].map((tier) => readFile(`public/assets/showcase/${tier}/character.glb`)));
    expect(buffers[0]!.equals(buffers[1]!)).toBe(true); expect(buffers[0]!.equals(buffers[2]!)).toBe(true);
  });
});
