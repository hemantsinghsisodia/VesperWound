import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, KHRTextureBasisu } from '@gltf-transform/extensions';
import { dedup, prune, meshopt, listTextureSlots } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import { encodeToKTX2 } from 'ktx2-encoder';
import sharp from 'sharp';

await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
await mkdir('art/cache', { recursive: true });
const results = [];
for (const variant of ['desktop', 'mobile', 'cinematic']) {
  // The pinned Basis encoder supports up to 12M source texels. A 3K face
  // atlas retains the authored detail within the approved 4K maximum.
  const size = variant === 'cinematic' ? 3072 : variant === 'desktop' ? 2048 : 1024;
  const directory = `public/assets/showcase/${variant}`;
  await mkdir(directory, { recursive: true });
  for (const name of variant === 'cinematic' ? ['iona'] : ['iona', 'ash-quay']) {
    if (name === 'ash-quay') {
      const doc = await io.read(`${directory}/${name}.glb`); const bytes = await readFile(`${directory}/${name}.glb`);
      const triangles = doc.getRoot().listMeshes().reduce((sum, mesh) => sum + mesh.listPrimitives().reduce((total, p) => total + p.getIndices().getCount() / 3, 0), 0);
      results.push({ variant, name, triangles, rawBytes: bytes.length, gzipBytes: gzipSync(bytes).length, clips: [], textures: doc.getRoot().listTextures().length });
      continue;
    }
    const doc = await io.read(`art/source/${variant}/${name}.glb`);
    await doc.transform(dedup(), prune({ keepLeaves: true }));
    // Explicit factor preserves the original Blender soot tint in standard PBR glTF.
    for (const material of doc.getRoot().listMaterials()) if (material.getName() === 'Black iron') material.setBaseColorFactor([0.30, 0.34, 0.32, 1]);
    // Preserve authored strand coverage. A 0.35 binary cutoff erased narrow
    // fibres once minified mipmaps averaged their alpha below the threshold.
    for (const material of doc.getRoot().listMaterials()) if (material.getName() === 'Iona.Hair') material.setAlphaMode('BLEND').setDoubleSided(true);
    for (const texture of doc.getRoot().listTextures()) {
      const image = texture.getImage();
      const slots = listTextureSlots(texture);
      const srgb = slots.some((slot) => slot === 'baseColorTexture' || slot === 'emissiveTexture');
      const normal = slots.includes('normalTexture');
      const hairOpacity = variant === 'cinematic' && doc.getRoot().listMaterials().some((m) => m.getName() === 'Iona.Hair' && m.getBaseColorTexture() === texture);
      const uastc = normal || hairOpacity;
      const textureLimit = texture.getName().includes('wear') && variant !== 'cinematic' ? 256 : variant === 'cinematic' && !texture.getName().includes('skin') ? 2048 : size;
      const hash = createHash('sha256').update(image).update(`iona-v3/${textureLimit}/${srgb}/${normal}/${uastc}`).digest('hex');
      const cache = `art/cache/${hash}.ktx2`;
      let encoded;
      try { encoded = await readFile(cache); }
      catch {
        console.log(`Encoding ${variant}/${name}: ${texture.getName()} (${slots.join(', ')})`);
        const decoded = await sharp(image).resize(textureLimit, textureLimit, { fit: 'inside', withoutEnlargement: true }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        encoded = await encodeToKTX2(decoded.data, {
          imageDecoder: async () => ({ data: decoded.data, width: decoded.info.width, height: decoded.info.height }),
          isUASTC: uastc, isNormalMap: normal, isPerceptual: srgb,
          isSetKTX2SRGBTransferFunc: srgb, generateMipmap: true,
          qualityLevel: 240, compressionLevel: 2, needSupercompression: uastc,
        });
        await writeFile(cache, encoded);
      }
      texture.setImage(new Uint8Array(encoded)).setMimeType('image/ktx2');
    }
    doc.createExtension(KHRTextureBasisu).setRequired(true);
    await doc.transform(meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
    await io.write(`${directory}/${name}.glb`, doc);
    const bytes = await readFile(`${directory}/${name}.glb`);
    const triangles = doc.getRoot().listMeshes().reduce((sum, mesh) => sum + mesh.listPrimitives().reduce((total, primitive) => total + primitive.getIndices().getCount() / 3, 0), 0);
    const record = { variant, name, triangles, rawBytes: bytes.length, gzipBytes: gzipSync(bytes).length, clips: doc.getRoot().listAnimations().map((clip) => clip.getName()), textures: doc.getRoot().listTextures().length };
    console.log(JSON.stringify(record)); results.push(record);
  }
  await writeFile(`${directory}/manifest.json`, JSON.stringify({ version: 1, assets: {
    iona: { kind: 'model', url: 'iona.glb' }, ...(variant === 'cinematic' ? {} : { courtyard: { kind: 'model', url: 'ash-quay.glb' } }),
  } }, null, 2));
}
await writeFile('art/asset-report.json', JSON.stringify(results, null, 2));
