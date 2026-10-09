import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, KHRTextureBasisu } from '@gltf-transform/extensions';
import { dedup, prune, meshopt, listTextureSlots } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import { encodeToKTX2 } from 'ktx2-encoder';
import sharp from 'sharp';
await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const reports = [];
for (const tier of ['desktop', 'mobile']) {
  const doc = await io.read(`art/source/zombie7/${tier}.glb`);
  await doc.transform(dedup(), prune({ keepLeaves: true }));
  for (const texture of doc.getRoot().listTextures()) {
    const slots = listTextureSlots(texture); const normal = slots.includes('normalTexture');
    const srgb = slots.some(s => s === 'baseColorTexture' || s === 'emissiveTexture');
    const max = tier === 'mobile' ? 1024 : 2048;
    const image = texture.getImage();
    const hash = createHash('sha256').update(image).update(`zombie7/1/${max}/${normal}/${srgb}`).digest('hex');
    const cache = `art/cache/${hash}.ktx2`; let encoded;
    try { encoded = await readFile(cache); } catch {
      const decoded = await sharp(image).resize(max,max,{fit:'inside',withoutEnlargement:true}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
      encoded = await encodeToKTX2(decoded.data, {imageDecoder:async()=>({data:decoded.data,width:decoded.info.width,height:decoded.info.height}),isUASTC:normal,isNormalMap:normal,isPerceptual:srgb,isSetKTX2SRGBTransferFunc:srgb,generateMipmap:true,qualityLevel:240,compressionLevel:2,needSupercompression:normal});
      await writeFile(cache,encoded);
    }
    texture.setImage(new Uint8Array(encoded)).setMimeType('image/ktx2');
  }
  doc.createExtension(KHRTextureBasisu).setRequired(true);
  await doc.transform(meshopt({encoder:MeshoptEncoder,level:'medium'}));
  const directory = `public/assets/encounter/${tier}`; await mkdir(directory,{recursive:true});
  const triangles = doc.getRoot().listMeshes().reduce((sum,m)=>sum+m.listPrimitives().reduce((n,p)=>n+p.getIndices().getCount()/3,0),0);
  if (triangles > (tier === 'mobile' ? 2000 : 6000)) throw new Error(`${tier} enemy exceeds triangle ceiling: ${triangles}`);
  await io.write(`${directory}/zombie7.glb`,doc);
  await writeFile(`${directory}/manifest.json`,JSON.stringify({version:1,assets:{enemy:{kind:'model',url:'zombie7.glb'}}},null,2));
  const bytes = await readFile(`${directory}/zombie7.glb`);
  if (bytes.length > (tier === 'mobile' ? 4 : 8)*1024*1024) throw new Error(`${tier} encounter payload exceeds ceiling`);
  reports.push({tier,triangles,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),clips:doc.getRoot().listAnimations().map(a=>a.getName()),bones:doc.getRoot().listSkins()[0].listJoints().length});
}
const hash = async p=>createHash('sha256').update(await readFile(p)).digest('hex');
await writeFile('art/enemy-provenance.json',JSON.stringify({title:'Zombie Number 7 - Animated',author:'Tony Flanagan',listing:'https://www.fab.com/listings/a5710c50-a98e-4b55-98f8-c0a0f8318a84',license:'CC BY 4.0',licenseUrl:'https://creativecommons.org/licenses/by/4.0/',acquired:'2026-10-06',inspected:'2026-10-09',originalZipSha256:await hash('art/imports/zombie7/zombie-number-7-animated.zip'),originalGlbSha256:await hash('art/imports/zombie7/original/source/zom_7.glb'),masterSha256:await hash('art/source/zombie7-master.blend'),notices:'No separate notice file supplied. License verified in Fab download dialog.',modifications:['Uniform height/ground normalization to 1.8 metres','In-place hip translation with original vertical motion','Derivative seam welding followed by anatomical weighted reduction preserving face/hands','Semantic KTX2 texture compression and Meshopt geometry compression'],additionalAnimations:[],exports:reports},null,2));
await writeFile('docs/qa/phase4a/asset-report.json',JSON.stringify(reports,null,2));
console.log(JSON.stringify(reports));
