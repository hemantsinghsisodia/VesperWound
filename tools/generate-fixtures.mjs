import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import { CylinderGeometry } from 'three';
import { encodeToKTX2 } from 'ktx2-encoder';

const directory = fileURLToPath(new URL('../public/assets/fixtures/', import.meta.url));
await mkdir(directory, { recursive: true });

const width = 128;
const stone = new Uint8Array(width * width * 4);
const normal = new Uint8Array(width * width * 4);
for (let y = 0; y < width; y++) for (let x = 0; x < width; x++) {
  const i = (y * width + x) * 4;
  const grain = ((x * 73 + y * 151 + x * y * 17) % 29) - 14;
  const vein = Math.sin(x * 0.15 + Math.sin(y * 0.17) * 2) * 7;
  const value = Math.round(80 + grain + vein);
  stone.set([value - 8, value + 5, value + 3, 255], i);
  normal.set([128 + Math.round(Math.sin(x * 0.3) * 8), 128 + Math.round(Math.cos(y * 0.3) * 8), 254, 255], i);
}
for (const [name, data, srgb] of [['stone', stone, true], ['normal', normal, false]]) {
  const bytes = await encodeToKTX2(data, {
    imageDecoder: async () => ({ data, width, height: width }),
    isUASTC: true, isNormalMap: !srgb, isPerceptual: srgb,
    isSetKTX2SRGBTransferFunc: srgb, generateMipmap: true,
    needSupercompression: false,
  });
  await writeFile(`${directory}/${name}.ktx2`, bytes);
}

const doc = new Document();
Object.assign(doc.getRoot().getAsset(), { generator: 'VESPERWOUND original fixture generator', copyright: 'VESPERWOUND project' });
const buffer = doc.createBuffer();
const geometry = new CylinderGeometry(0.45, 0.7, 3, 12, 8, false);
geometry.translate(0, 1.5, 0);
const accessor = (name, type, array) => doc.createAccessor(name).setType(type).setArray(array).setBuffer(buffer);
const positions = new Float32Array(geometry.getAttribute('position').array);
const count = positions.length / 3;
const joints = new Uint16Array(count * 4);
const weights = new Float32Array(count * 4);
for (let i = 0; i < count; i++) {
  const height = Math.max(0, Math.min(3, positions[i * 3 + 1]));
  const segment = Math.min(1, Math.floor(height / 1.5));
  const blend = Math.min(1, height / 1.5 - segment);
  joints[i * 4] = segment; joints[i * 4 + 1] = segment + 1;
  weights[i * 4] = 1 - blend; weights[i * 4 + 1] = blend;
}
const material = doc.createMaterial('MAT_PreservedBrass').setBaseColorFactor([0.25, 0.31, 0.29, 1]).setMetallicFactor(0.6).setRoughnessFactor(0.5);
const primitive = doc.createPrimitive()
  .setAttribute('POSITION', accessor('positions', 'VEC3', positions))
  .setAttribute('NORMAL', accessor('normals', 'VEC3', new Float32Array(geometry.getAttribute('normal').array)))
  .setAttribute('TEXCOORD_0', accessor('uv', 'VEC2', new Float32Array(geometry.getAttribute('uv').array)))
  .setAttribute('JOINTS_0', accessor('joints', 'VEC4', joints))
  .setAttribute('WEIGHTS_0', accessor('weights', 'VEC4', weights))
  .setIndices(accessor('indices', 'SCALAR', new Uint16Array(geometry.index.array)))
  .setMaterial(material);
const root = doc.createNode('JOINT_Base');
const middle = doc.createNode('JOINT_Middle').setTranslation([0, 1.5, 0]);
const top = doc.createNode('JOINT_Top').setTranslation([0, 1.5, 0]);
root.addChild(middle); middle.addChild(top);
const matrices = new Float32Array(48);
for (let i = 0; i < 3; i++) { matrices[i * 16] = matrices[i * 16 + 5] = matrices[i * 16 + 10] = matrices[i * 16 + 15] = 1; matrices[i * 16 + 13] = -i * 1.5; }
const skin = doc.createSkin('SKIN_BreathingVessel').addJoint(root).addJoint(middle).addJoint(top).setSkeleton(root)
  .setInverseBindMatrices(accessor('bindMatrices', 'MAT4', matrices));
const vessel = doc.createNode('FIXTURE_BreathingVessel').setMesh(doc.createMesh('MESH_Vessel').addPrimitive(primitive)).setSkin(skin);
doc.createScene('SCENE_Fixture').addChild(root).addChild(vessel);
const animation = doc.createAnimation('ANIM_Breath');
const sampler = doc.createAnimationSampler().setInput(accessor('time', 'SCALAR', new Float32Array([0, 1.5, 3])))
  .setOutput(accessor('rotation', 'VEC4', new Float32Array([0, 0, -0.09, 0.9959418, 0, 0, 0.09, 0.9959418, 0, 0, -0.09, 0.9959418])));
animation.addSampler(sampler).addChannel(doc.createAnimationChannel().setSampler(sampler).setTargetNode(middle).setTargetPath('rotation'));
await MeshoptEncoder.ready;
await doc.transform(meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
await io.write(`${directory}/vessel.glb`, doc);
geometry.dispose();
await writeFile(`${directory}/manifest.json`, JSON.stringify({
  version: 1,
  assets: {
    vessel: { kind: 'model', url: '/assets/fixtures/vessel.glb' },
    stone: { kind: 'texture', url: '/assets/fixtures/stone.ktx2', colorSpace: 'srgb' },
    normal: { kind: 'texture', url: '/assets/fixtures/normal.ktx2', colorSpace: 'linear' },
  },
}, null, 2));
console.log('Generated original animated Meshopt GLB and mipmapped KTX2 fixtures.');
