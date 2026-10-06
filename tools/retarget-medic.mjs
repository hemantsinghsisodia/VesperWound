import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { NodeIO, Document, Accessor } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { resample, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import { Matrix4, Quaternion, Vector3 } from 'three';

// Retarget world-space rest-pose deltas, not raw local rotations: the two rigs
// have different bone axes and hierarchy. The accepted Medic master is read-only.
const sourcePath = 'art/imports/animations/original/Universal Animation Library[Standard]/Unreal-Godot/UAL1_Standard.glb';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const source = await io.read(sourcePath); const target = await io.read('art/source/medic/character.glb');
const output = new Document(); const buffer = output.createBuffer(); const scene = output.createScene();
const mapping = { Hips: 'pelvis', Spine: 'spine_01', Spine1: 'spine_02', Spine2: 'spine_03', Neck: 'neck_01', Head: 'Head' };
for (const [side, suffix] of [['Left', 'l'], ['Right', 'r']]) {
  for (const [name, equivalent] of Object.entries({ Shoulder: 'clavicle', Arm: 'upperarm', ForeArm: 'lowerarm', Hand: 'hand', UpLeg: 'thigh', Leg: 'calf', Foot: 'foot', ToeBase: 'ball' })) mapping[side + name] = `${equivalent}_${suffix}`;
  for (const finger of ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky']) for (let joint = 1; joint <= 3; joint++) mapping[`${side}Hand${finger}${joint}`] = `${finger.toLowerCase()}_0${joint}_${suffix}`;
}
const targetBones = target.getRoot().listSkins()[0].listJoints();
const targetSet = new Set(targetBones); const exportNodes = new Map();
function copy(node) {
  const saved = output.createNode(node.getName()).setTranslation(node.getTranslation()).setRotation(node.getRotation()).setScale(node.getScale()); exportNodes.set(node, saved);
  for (const child of node.listChildren()) if (targetSet.has(child) || child.listChildren().length) saved.addChild(copy(child));
  return saved;
}
for (const root of target.getRoot().listScenes()[0].listChildren()) scene.addChild(copy(root));
const sourceNodes = new Map(source.getRoot().listNodes().map(n => [n.getName(), n]));
const restRotation = n => { const rotation = new Quaternion(); new Matrix4().fromArray(n.getWorldMatrix()).decompose(new Vector3(), rotation, new Vector3()); return rotation.normalize(); };
const targetRest = new Map(targetBones.map(n => [n, restRotation(n)]));
const sourceRest = new Map(source.getRoot().listNodes().map(n => [n, restRotation(n)]));
// Medic is bound with lowered arms, the animation rig in T-pose. Align the
// semantic bone directions before applying motion, preserving each rig's axes.
const alignments = new Map(targetBones.map(n => {
  const mapped = sourceNodes.get(mapping[n.getName()]);
  const direction = new Vector3(0, 1, 0).applyQuaternion(targetRest.get(n));
  const sourceDirection = mapped ? new Vector3(0, 1, 0).applyQuaternion(sourceRest.get(mapped)) : direction;
  return [n, new Quaternion().setFromUnitVectors(direction.normalize(), sourceDirection.normalize())];
}));
const position = n => new Vector3().setFromMatrixPosition(new Matrix4().fromArray(n.getWorldMatrix()));
const sourceHips = sourceNodes.get('pelvis'); const hips = targetBones.find(n => n.getName() === 'Hips');
const ratio = position(hips).y / position(sourceHips).y;
const combatAddition = process.argv.includes('--combat');
const selected = combatAddition ? ['Punch_Jab', 'Spell_Simple_Shoot'] : ['Idle_Loop', 'Walk_Loop', 'Jog_Fwd_Loop', 'Punch_Cross', 'Roll', 'Hit_Chest', 'Death01'];
const rows = [];
for (const name of selected) {
  const original = source.getRoot().listAnimations().find(a => a.getName() === name);
  if (!original) throw new Error(`Missing licensed clip ${name}`);
  const duration = Math.max(...original.listSamplers().flatMap(s => Array.from(s.getInput().getArray())));
  const samples = Math.ceil(duration * 30); const times = Float32Array.from({ length: samples + 1 }, (_, i) => Math.min(duration, i / 30));
  const values = new Map(targetBones.filter(n => mapping[n.getName()]).map(n => [n, []])); const translations = [];
  const originalTransforms = new Map(source.getRoot().listNodes().map(n => [n, { t: n.getTranslation(), r: n.getRotation(), s: n.getScale() }]));
  const hipsLocal = hips.getTranslation(); const hipsParent = new Matrix4().fromArray(hips.getParentNode().getWorldMatrix()).invert();
  const hipsRestPosition = position(sourceHips);
  for (const time of times) {
    for (const [n, tr] of originalTransforms) n.setTranslation(tr.t).setRotation(tr.r).setScale(tr.s);
    for (const channel of original.listChannels()) {
      const sampler = channel.getSampler(); const input = sampler.getInput().getArray(); const array = sampler.getOutput().getArray(); const path = channel.getTargetPath(); const size = path === 'rotation' ? 4 : 3;
      let i = 0; while (i < input.length - 2 && input[i + 1] <= time) i++;
      const j = Math.min(i + 1, input.length - 1); const f = input[j] > input[i] ? Math.max(0, Math.min(1, (time - input[i]) / (input[j] - input[i]))) : 0;
      const a = Array.from(array.slice(i * size, (i + 1) * size)); const b = Array.from(array.slice(j * size, (j + 1) * size));
      const result = path === 'rotation' ? new Quaternion().fromArray(a).slerp(new Quaternion().fromArray(b), f).normalize().toArray() : a.map((v, k) => v + (b[k] - v) * f);
      const node = channel.getTargetNode(); if (path === 'rotation') node.setRotation(result); else if (path === 'translation') node.setTranslation(result); else if (path === 'scale') node.setScale(result);
    }
    const rotations = new Map();
    function solve(n) {
      if (rotations.has(n)) return rotations.get(n);
      const parent = n.getParentNode(); const parentRotation = parent && targetSet.has(parent) ? solve(parent) : parent ? restRotation(parent) : new Quaternion();
      const mapped = sourceNodes.get(mapping[n.getName()]);
      const desired = mapped ? restRotation(mapped).multiply(sourceRest.get(mapped).clone().invert()).multiply(alignments.get(n)).multiply(targetRest.get(n)) : parentRotation.clone().multiply(new Quaternion().fromArray(n.getRotation()));
      rotations.set(n, desired);
      if (values.has(n)) {
        const local = parentRotation.clone().invert().multiply(desired).normalize(); const data = values.get(n);
        // Quaternion sign continuity keeps linear compression and interpolation stable.
        if (data.length && local.dot(new Quaternion().fromArray(data, data.length - 4)) < 0) local.set(-local.x, -local.y, -local.z, -local.w);
        data.push(...local.toArray());
      }
      return desired;
    }
    for (const n of targetBones) solve(n);
    const currentHips = position(sourceHips);
    // Non-RM source retains body bob and roll/death vertical motion. Remove only
    // horizontal drift so the controller owns travel, including the dodge.
    const displacement = new Vector3(0, (currentHips.y - hipsRestPosition.y) * ratio, 0);
    const localDisplacement = displacement.applyMatrix4(hipsParent).sub(new Vector3().applyMatrix4(hipsParent));
    translations.push(hipsLocal[0] + localDisplacement.x, hipsLocal[1] + localDisplacement.y, hipsLocal[2] + localDisplacement.z);
  }
  const animation = output.createAnimation(name);
  const input = output.createAccessor().setType(Accessor.Type.SCALAR).setArray(times).setBuffer(buffer);
  for (const [n, data] of values) {
    const accessor = output.createAccessor().setType(Accessor.Type.VEC4).setArray(new Float32Array(data)).setBuffer(buffer);
    const sampler = output.createAnimationSampler().setInput(input).setOutput(accessor); animation.addSampler(sampler);
    animation.addChannel(output.createAnimationChannel().setTargetNode(exportNodes.get(n)).setTargetPath('rotation').setSampler(sampler));
  }
  const accessor = output.createAccessor().setType(Accessor.Type.VEC3).setArray(new Float32Array(translations)).setBuffer(buffer);
  const sampler = output.createAnimationSampler().setInput(input).setOutput(accessor); animation.addSampler(sampler);
  animation.addChannel(output.createAnimationChannel().setTargetNode(exportNodes.get(hips)).setTargetPath('translation').setSampler(sampler));
  rows.push({ name, duration, fps: 30, channels: animation.listChannels().length });
  for (const [n, tr] of originalTransforms) n.setTranslation(tr.t).setRotation(tr.r).setScale(tr.s);
}
await mkdir('art/source/medic', { recursive: true }); await io.write(`art/source/medic/${combatAddition ? 'combat-' : ''}animations.glb`, output);
const originalNodes = new Map([...exportNodes].map(([original, exported]) => [exported, original]));
const targetBuffer = target.getRoot().listBuffers()[0];
for (const clip of output.getRoot().listAnimations()) {
  const saved = target.createAnimation(clip.getName());
  for (const channel of clip.listChannels()) {
    const sampler = channel.getSampler();
    const copyAccessor = a => target.createAccessor().setType(a.getType()).setArray(a.getArray().slice()).setBuffer(targetBuffer);
    const copied = target.createAnimationSampler().setInput(copyAccessor(sampler.getInput())).setOutput(copyAccessor(sampler.getOutput())); saved.addSampler(copied);
    saved.addChannel(target.createAnimationChannel().setTargetNode(originalNodes.get(channel.getTargetNode())).setTargetPath(channel.getTargetPath()).setSampler(copied));
  }
}
await io.write(`art/source/medic/${combatAddition ? 'combat-character' : 'player-character'}.glb`, target);
if (combatAddition) {
  const record = JSON.parse(await readFile('art/animation-provenance.json', 'utf8'));
  record.clips = [...record.clips.filter(c => !selected.includes(c.name)), ...rows];
  record.modifications = [...new Set([...record.modifications, 'Phase 3 adds licensed jab and Ward clips; original seven authored actions retained'])];
  await writeFile('art/animation-provenance.json', JSON.stringify(record, null, 2));
  console.log(`Combat additions prepared: ${selected.join(', ')}`);
} else {
await output.transform(resample({ tolerance: 0.001 }), meshopt({ encoder: MeshoptEncoder, level: 'high' }));
await mkdir('public/assets/showcase/shared', { recursive: true }); await io.write('public/assets/showcase/shared/animations.glb', output);
const bytes = await readFile('public/assets/showcase/shared/animations.glb');
await mkdir('docs/qa/phase2', { recursive: true });
const provenance = { title: 'Universal Animation Library — free Standard package', author: 'Quaternius', contributors: ['Gonzalo Furnier'], source: 'https://quaternius.itch.io/universal-animation-library', license: 'CC0 1.0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', acquired: '2026-10-06', archiveSha256: createHash('sha256').update(await readFile('art/imports/animations/universal-animation-library-standard.zip')).digest('hex'), modifications: ['World-space rest-pose retargeting to supplied Medic skeleton', '30 Hz baked skeletal animation; horizontal hip translation removed, vertical motion retained', 'Keyframe resampling and Meshopt compression'], clips: rows, runtimeBytes: bytes.length, runtimeSha256: createHash('sha256').update(bytes).digest('hex') };
await writeFile('art/animation-provenance.json', JSON.stringify(provenance, null, 2)); await writeFile('docs/qa/phase2/animations.json', JSON.stringify(provenance, null, 2));
console.log(JSON.stringify(provenance, null, 2));
}
