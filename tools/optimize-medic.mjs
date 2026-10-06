import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
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
const doc = await io.read('art/source/medic/character.glb');
await doc.transform(dedup(), prune({ keepLeaves: true }));
await mkdir('art/cache', { recursive: true });
for (const texture of doc.getRoot().listTextures()) {
  const slots = listTextureSlots(texture); const normal = slots.includes('normalTexture');
  const srgb = slots.some((slot) => slot === 'baseColorTexture' || slot === 'emissiveTexture');
  // Native color maps are small: ETC1S visibly blocks the face and coat at close range.
  const uastc = normal || srgb;
  const image = texture.getImage();
  const hash = createHash('sha256').update(image).update(`medic-v2/1024/${srgb}/${normal}/${uastc}`).digest('hex');
  const cache = `art/cache/${hash}.ktx2`; let encoded;
  try { encoded = await readFile(cache); }
  catch {
    console.log(`Encoding supplied Medic texture: ${texture.getName()} (${slots.join(', ')})`);
    const decoded = await sharp(image).resize(1024, 1024, { fit: 'inside', withoutEnlargement: true }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    encoded = await encodeToKTX2(decoded.data, {
      imageDecoder: async () => ({ data: decoded.data, width: decoded.info.width, height: decoded.info.height }),
      isUASTC: uastc, isNormalMap: normal, isPerceptual: srgb, isSetKTX2SRGBTransferFunc: srgb,
      generateMipmap: true, qualityLevel: 240, compressionLevel: 2, needSupercompression: uastc,
    });
    await writeFile(cache, encoded);
  }
  texture.setImage(new Uint8Array(encoded)).setMimeType('image/ktx2');
}
doc.createExtension(KHRTextureBasisu).setRequired(true);
await doc.transform(meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
await mkdir('public/assets/showcase/desktop', { recursive: true });
await io.write('public/assets/showcase/desktop/character.glb', doc);
const bytes = await readFile('public/assets/showcase/desktop/character.glb');
const triangles = doc.getRoot().listMeshes().reduce((sum, mesh) => sum + mesh.listPrimitives().reduce((total, p) => total + p.getIndices().getCount() / 3, 0), 0);
if (triangles > 20000) throw new Error('Supplied Medic exceeds mobile geometry budget; deliberate reduction is required.');
const results = [];
for (const tier of ['desktop', 'mobile', 'cinematic']) {
  const directory = `public/assets/showcase/${tier}`; await mkdir(directory, { recursive: true });
  if (tier !== 'desktop') await copyFile('public/assets/showcase/desktop/character.glb', `${directory}/character.glb`);
  await writeFile(`${directory}/manifest.json`, JSON.stringify({ version: 1, assets: {
    character: { kind: 'model', url: 'character.glb' }, ...(tier === 'cinematic' ? {} : { courtyard: { kind: 'model', url: 'ash-quay.glb' } }),
  } }, null, 2));
  results.push({ tier, triangles, rawBytes: bytes.length, gzipBytes: gzipSync(bytes).length, sha256: createHash('sha256').update(bytes).digest('hex'), clips: doc.getRoot().listAnimations().map((a) => a.getName()), textures: doc.getRoot().listTextures().length, identicalToDesktop: true });
}
const acquisition = JSON.parse(await readFile('art/imports/medic/acquisition.json', 'utf8'));
await writeFile('art/medic-provenance.json', JSON.stringify({ ...acquisition,
  modifications: ['Uniform scale and ground normalization to 1.8 m', 'Blender 5.2 glTF export retaining all 67 source bones', 'Meshopt geometry compression', 'Semantic KTX2 compression and mipmaps; native textures retained without upscaling'],
  suppliedAnimations: [], additionalNotices: 'No separate notice or license file was included in the downloaded archive. Listing CC BY 4.0 and author credit retained.',
  masterSha256: createHash('sha256').update(await readFile('art/source/medic-master.blend')).digest('hex'), exports: results,
}, null, 2));
await writeFile('docs/qa/medic/asset-report.json', JSON.stringify(results, null, 2));
console.log(JSON.stringify(results));
