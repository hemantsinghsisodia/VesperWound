import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, resample, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read('art/source/medic/saved-animation-export.glb');
const expected = ['Idle_Loop', 'Walk_Loop', 'Jog_Fwd_Loop', 'Punch_Cross', 'Roll', 'Hit_Chest', 'Death01'];
const names = doc.getRoot().listAnimations().map(a => a.getName());
if (names.length !== expected.length || expected.some(name => !names.includes(name))) throw new Error(`Saved animation inventory changed: ${names.join(', ')}`);
const reference = await io.read('art/source/medic/animations.glb');
const tracks = new Set(reference.getRoot().listAnimations()[0].listChannels().map(c => `${c.getTargetNode().getName()}/${c.getTargetPath()}`));
// Blender adds constant rest-scale/location tracks for every bone. Keep only
// authored deformation rotations and hip bob; the accepted GLB owns the rest.
for (const clip of doc.getRoot().listAnimations()) for (const channel of clip.listChannels()) {
  if (!tracks.has(`${channel.getTargetNode().getName()}/${channel.getTargetPath()}`)) channel.dispose();
}
for (const clip of doc.getRoot().listAnimations()) {
  const used = new Set(clip.listChannels().map(c => c.getSampler()));
  for (const sampler of clip.listSamplers()) if (!used.has(sampler)) sampler.dispose();
}
for (const node of doc.getRoot().listNodes()) { node.setMesh(null); node.setSkin(null); }
for (const mesh of doc.getRoot().listMeshes()) mesh.dispose();
for (const skin of doc.getRoot().listSkins()) skin.dispose();
await doc.transform(prune({ keepLeaves: true }), resample({ tolerance: .001 }), meshopt({ encoder: MeshoptEncoder, level: 'high' }));
await io.write('public/assets/showcase/shared/animations.glb', doc);
const bytes = await readFile('public/assets/showcase/shared/animations.glb');
const path = 'art/animation-provenance.json'; const record = JSON.parse(await readFile(path, 'utf8'));
record.editableSource = 'art/source/medic-player-animations.blend';
record.editableSourceSha256 = createHash('sha256').update(await readFile(record.editableSource)).digest('hex');
record.runtimeBytes = bytes.length; record.runtimeSha256 = createHash('sha256').update(bytes).digest('hex');
record.modifications = [...new Set([...record.modifications, 'A-pose/T-pose semantic bone alignment', 'Read-only export from saved Blender animation source'])];
await writeFile(path, JSON.stringify(record, null, 2)); await writeFile('docs/qa/phase2/animations.json', JSON.stringify(record, null, 2));
await writeFile('public/assets/ANIMATION-NOTICES.json', JSON.stringify(record, null, 2));
console.log(`Saved animation export: ${bytes.length} bytes, ${names.join(', ')}`);
