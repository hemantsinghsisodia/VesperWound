import { expect, test } from 'vitest';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { read } from 'ktx-parse';

test('authored environment exports preserve source, spatial batches, tier and texture limits', async () => {
  const record = JSON.parse(await readFile('art/environment-provenance.json', 'utf8')) as { master: string; masterSha256: string };
  const master = await readFile(record.master);
  expect(createHash('sha256').update(master).digest('hex')).toBe(record.masterSha256);
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
  for (const tier of ['desktop', 'mobile']) for (const section of ['court', 'quay']) {
    const root = (await io.read(section === 'court' ? `public/assets/showcase/${tier}/ash-quay.glb` : `public/assets/district/${tier}/arrival-quay.glb`)).getRoot();
    expect(root.listAnimations()).toHaveLength(0); expect(root.listSkins()).toHaveLength(0);
    expect(root.listNodes().some(n => n.getName().includes('BLOCKOUT'))).toBe(false);
    expect(root.listNodes().filter(n => n.getName().startsWith('Quay cell')).length).toBeGreaterThan(4);
    if (section === 'court') {
      // Check the decoded runtime geometry, including Meshopt quantization:
      // the old continuous floor must remain recessed below every flag batch.
      let baseTop = -Infinity;
      const flagTops:number[]=[];
      for(const node of root.listNodes())for(const primitive of node.getMesh()?.listPrimitives()??[]){
        const name=primitive.getMaterial()?.getName()??'';
        if(name!=='District / basalt base'&&!name.startsWith('District / weathered concrete'))continue;
        const positions=primitive.getAttribute('POSITION')!,matrix=node.getWorldMatrix();
        let top=-Infinity;
        for(let i=0;i<positions.getCount();i++){
          const v=positions.getElement(i,[]);
          top=Math.max(top,matrix[1]!*v[0]!+matrix[5]!*v[1]!+matrix[9]!*v[2]!+matrix[13]!);
        }
        if(name==='District / basalt base')baseTop=Math.max(baseTop,top);else flagTops.push(top);
      }
      expect(Number.isFinite(baseTop)).toBe(true);expect(flagTops.length).toBeGreaterThan(0);
      for(const top of flagTops)expect(top-baseTop).toBeGreaterThan(.02);
    }
    if (section === 'quay') {
      expect(root.listNodes().some(n => n.getName().includes('Cutaway canopy'))).toBe(true);
      const paving = root.listMaterials().filter(m => m.getName().startsWith('District / dock limestone'));
      expect(paving).toHaveLength(3);
      expect(new Set(paving.map(m => m.getBaseColorFactor().join(','))).size).toBe(3);
    }
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
    expect(manifest.assets.quayside).toEqual({ kind: 'model', url: `../../district/${tier}/arrival-quay.glb` });
    const reflection = read(await readFile(`public/assets/showcase/${tier}/reflection.ktx2`));
    expect(reflection.pixelWidth).toBe(512); expect(reflection.pixelHeight).toBe(256);
  }
});
