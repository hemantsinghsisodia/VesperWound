import { it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { AnimationMixer, LoopOnce, Quaternion, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'meshoptimizer';
import { BATON } from '../../src/player/weapon-definitions';
import { sampleWeaponContact } from '../../src/player/weapon-contact';
import grip from '../../src/world/baton-grip.json';

it('matches compressed runtime shaft poses to CPU contact data within 3 cm', async () => {
  const bytes = await readFile('public/assets/weapons/baton/animations.glb');
  const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  const mixer = new AnimationMixer(gltf.scene), hand = gltf.scene.getObjectByName('RightHand')!;
  const rotation = new Quaternion().fromArray(grip.quaternion), offset = new Vector3().fromArray(grip.position);
  for (const attack of Object.values(BATON.attacks)) {
    const clip = gltf.animations.find(c => c.name === attack!.clip)!;
    expect(clip.duration).toBeCloseTo(attack!.duration, 5);
    mixer.stopAllAction();
    const action = mixer.clipAction(clip).reset().setLoop(LoopOnce, 1).play(); action.clampWhenFinished = true;
    action.time = 0; mixer.update(0); gltf.scene.updateMatrixWorld(true);
    const feet = ['RightFoot', 'LeftFoot'].map(name => gltf.scene.getObjectByName(name)!);
    const planted = feet.map(foot => foot.getWorldPosition(new Vector3()));
    for (let time = 0; time < attack!.duration; time += 1 / 120) {
      action.time = time; mixer.update(0); gltf.scene.updateMatrixWorld(true);
      for (let i = 0; i < feet.length; i++) expect(feet[i]!.getWorldPosition(new Vector3()).distanceTo(planted[i]!), `${clip.name} planted foot`).toBeLessThan(.01);
      if (time < attack!.active[0] || time >= attack!.active[1]) continue;
      const expected = sampleWeaponContact(attack!.contact!, time);
      for (const [name, distance] of [['base', .025], ['tip', .423]] as const) {
        const actual = hand.localToWorld(new Vector3(0, distance, 0).applyQuaternion(rotation).add(offset));
        const p = expected[name];
        expect(actual.distanceTo(new Vector3(p.x, p.y, p.z)), `${clip.name} ${name} at ${time}`).toBeLessThan(.03);
      }
    }
  }
  mixer.stopAllAction(); mixer.uncacheRoot(gltf.scene);
});

it('uses contact timestamps rather than assuming uniform frame spacing', () => {
  const rows = [{ time: 0, base: [0, 0, 0], tip: [0, 1, 0] }, { time: .1, base: [1, 0, 0], tip: [1, 1, 0] }, { time: .5, base: [3, 0, 0], tip: [3, 1, 0] }];
  expect(sampleWeaponContact(rows, .3).base.x).toBeCloseTo(2);
  expect(sampleWeaponContact(rows, -1).base.x).toBe(0);
  expect(sampleWeaponContact(rows, 1).base.x).toBe(3);
});
