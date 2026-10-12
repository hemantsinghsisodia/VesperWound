import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile, rename, unlink } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, KHRTextureBasisu } from '@gltf-transform/extensions';
import { dedup, prune, meshopt, join, listTextureSlots } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import { encodeToKTX2 } from 'ktx2-encoder';
import sharp from 'sharp';

const master = 'art/source/ash-quay-district.blend';
// Stage complete artifacts before replacement; Windows file scanners can briefly
// hold an existing GLB/KTX2 open during an export.
async function publish(path, bytes) {
  const temporary = `${path}.partial`;
  await writeFile(temporary, bytes);
  try {
    for (let attempt = 0; ; attempt++) {
      try { await rename(temporary, path); break; }
      catch (error) {
        if (attempt >= 3 || !['EPERM', 'EBUSY', 'UNKNOWN'].includes(error.code)) throw error;
        await delay(250);
      }
    }
  } finally { await unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error; }); }
}
const hash = async p => createHash('sha256').update(await readFile(p)).digest('hex');
const before = await hash(master);
await mkdir('art/cache', { recursive: true });
const blender = process.env.BLENDER_PATH ?? 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe';
const environment = { ...process.env }; delete environment.SSLKEYLOGFILE;
await new Promise((resolve, reject) => {
  let output = '';
  const child = spawn(blender, ['-b', '--factory-startup', '--disable-autoexec', '--python', 'tools/blender/export_environment.py'], { windowsHide: true, env: environment, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', b => { output += b; }); child.stderr.on('data', b => { output += b; });
  child.on('error', reject); child.on('exit', code => code === 0 && output.includes('ENVIRONMENT_EXPORT_COMPLETE') ? resolve() : reject(new Error(output.slice(-3000))));
});
if (before !== await hash(master)) throw new Error('Environment export modified the authored master');
let probeHash;
try { probeHash = await readFile('art/cache/environment-probe-master.txt', 'utf8'); } catch { /* First bake. */ }
if (probeHash !== before) {
  await new Promise((resolve,reject) => {
    let output='';const child=spawn(blender,['-b','--factory-startup','--disable-autoexec','--python','tools/blender/bake_environment_probe.py'],{windowsHide:true,env:environment,stdio:['ignore','pipe','pipe']});
    child.stdout.on('data',b=>{output+=b;});child.stderr.on('data',b=>{output+=b;});child.on('error',reject);child.on('exit',code=>code===0&&output.includes('ENVIRONMENT_PROBE_COMPLETE')?resolve():reject(new Error(output.slice(-3000))));
  });
  await writeFile('art/cache/environment-probe-master.txt',before);
}
await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const reports = [];
for (const tier of ['desktop', 'mobile']) for (const section of ['court', 'quay']) {
  const doc = await io.read(`art/source/environment/${section === 'court' ? 'ash-quay' : 'arrival-quay'}.glb`);
  // The proof courtyard is one visible room. Batch its static materials together
  // instead of submitting the same material in every small cell. The backdrop
  // retains local cells; the expanded district will supply separate room batches.
  const scene = doc.getRoot().listScenes()[0];
  const cells = new Map();
  for (const node of [...scene.listChildren()]) {
    if (!node.getMesh()) continue;
    const positions = node.getMesh().listPrimitives()[0].getAttribute('POSITION');
    const min = positions.getMin([]), max = positions.getMax([]), t = node.getTranslation();
    const x = (min[0] + max[0]) / 2 + t[0], z = (min[2] + max[2]) / 2 + t[2];
    const key = node.getExtras().cutaway ? 'Cutaway canopy' : Math.abs(x) <= 9 && Math.abs(z) <= 9 ? 'pressure-court' : `${Math.floor(x / 6)},${Math.floor(z / 6)}`;
    let cell = cells.get(key);
    if (!cell) { cell = doc.createNode(`Quay cell ${key}`); cells.set(key, cell); scene.addChild(cell); }
    cell.addChild(node);
  }
  await doc.transform(dedup(), join({ keepNamed: false }), prune());
  for (const material of doc.getRoot().listMaterials()) {
    if (/worn paving/.test(material.getName())) material.setBaseColorFactor([.5, .55, .53, 1]);
    if (material.getName() === 'Quay / patinated iron') material.setBaseColorFactor([.2, .3, .28, 1]);
    if (/District \/ weathered concrete/.test(material.getName())) material.setBaseColorFactor([.62, .64, .62, 1]);
  }
  for (const texture of doc.getRoot().listTextures()) {
    const slots = listTextureSlots(texture), normal = slots.includes('normalTexture');
    const srgb = slots.some(s => s === 'baseColorTexture' || s === 'emissiveTexture');
    const materialNames = doc.getRoot().listMaterials().filter(m => m.getNormalTexture() === texture || m.getBaseColorTexture() === texture || m.getMetallicRoughnessTexture() === texture || m.getOcclusionTexture() === texture).map(m => m.getName()).join(' ');
    const paving = /worn paving/.test(materialNames);
    const facade = /modular_factory_facade_(brick|windows|doors)/.test(materialNames);
    const size = tier === 'desktop' ? normal && !paving ? 512 : 1024 : paving ? 512 : normal || !facade ? 256 : 512;
    const image = texture.getImage();
    const key = createHash('sha256').update(image).update(`quay-v1/${size}/${normal}/${srgb}`).digest('hex');
    const cache = `art/cache/${key}.ktx2`;
    let bytes;
    try { bytes = await readFile(cache); } catch {
      const decoded = await sharp(image).resize(size, size, { fit: 'inside', withoutEnlargement: true }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      bytes = await encodeToKTX2(decoded.data, { imageDecoder: async () => ({ data: decoded.data, width: decoded.info.width, height: decoded.info.height }), isUASTC: normal, isNormalMap: normal, isPerceptual: srgb, isSetKTX2SRGBTransferFunc: srgb, generateMipmap: true, qualityLevel: 240, compressionLevel: 2, needSupercompression: normal });
      await writeFile(cache, bytes);
    }
    texture.setImage(new Uint8Array(bytes)).setMimeType('image/ktx2');
  }
  doc.createExtension(KHRTextureBasisu).setRequired(true);
  await doc.transform(meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  await mkdir(`public/assets/district/${tier}`, { recursive: true });
  const output = section === 'court' ? `public/assets/showcase/${tier}/ash-quay.glb` : `public/assets/district/${tier}/arrival-quay.glb`;
  await publish(output, await io.writeBinary(doc));
  const reflection = await sharp('art/source/environment/reflection.png').ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const probe = await encodeToKTX2(reflection.data,{imageDecoder:async()=>({data:reflection.data,width:reflection.info.width,height:reflection.info.height}),isUASTC:false,isPerceptual:true,isSetKTX2SRGBTransferFunc:true,generateMipmap:true,qualityLevel:240,compressionLevel:2});
  await publish(`public/assets/showcase/${tier}/reflection.ktx2`,probe);
  const manifestPath=`public/assets/showcase/${tier}/manifest.json`;
  const manifest=JSON.parse(await readFile(manifestPath,'utf8'));manifest.assets.reflection={kind:'texture',url:'reflection.ktx2',colorSpace:'srgb'};
  manifest.assets.quayside={kind:'model',url:`../../district/${tier}/arrival-quay.glb`};
  await publish(manifestPath,JSON.stringify(manifest,null,2));
  const triangles = doc.getRoot().listMeshes().reduce((n,m) => n + m.listPrimitives().reduce((s,p) => s + p.getIndices().getCount()/3,0),0);
  reports.push({ tier, section, output, bytes: (await readFile(output)).length, triangles, meshes: doc.getRoot().listMeshes().length, textures: doc.getRoot().listTextures().length, maximumTexture: tier === 'desktop' ? 1024 : 512, reflectionBytes: probe.length, sha256: await hash(output) });
  console.log(JSON.stringify(reports.at(-1)));
}
const sources = JSON.parse(await readFile('art/imports/environment/acquisition.json', 'utf8'));
if (before !== await hash(master)) throw new Error('Environment build modified the authored master');
const record = { milestone: 'Ash Quay rebuild / Checkpoint B', status: 'Awaiting browser art review', master, masterSha256: before, sourceAssets: sources, retainedSources: 'Existing verified Poly Haven materials, including Rusty Metal 04, and wooden crate in art/provenance.json', originalWork: ['Pressure vessel, flanges, handwheels, gauges and sight glass', 'Architecture composition, signs, harbour and skyline', 'Arrival quay crane, loading canopy, mooring furniture and ground flags'], modifications: ['Curated factory facade and pipe modules with retained UVs', 'Packed textures in editable master; Checkpoint A source retained separately', 'Shared runtime bounds for collision and authored solids', 'Room static batching with spatial backdrop cells, native-resolution tier compression and mipmaps', 'Source-scene panoramic reflection bake', 'Read-only saved-source export; separate optional quay delivery; 64m blockout excluded from runtime'], exports: reports };
await publish('art/environment-provenance.json', JSON.stringify(record, null, 2));
await publish('public/assets/licenses/environment-provenance.json', JSON.stringify(record, null, 2));
await mkdir('docs/qa/ash-quay-checkpoint-b', { recursive: true });
await publish('docs/qa/ash-quay-checkpoint-b/assets.json', JSON.stringify(reports, null, 2));
