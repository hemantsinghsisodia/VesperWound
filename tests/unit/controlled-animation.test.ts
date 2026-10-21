import { it, expect } from 'vitest';
import { AnimationClip, Group, QuaternionKeyframeTrack, Quaternion } from 'three/webgpu';
import { PreviewActor } from '../../src/world/preview-actor';

it('samples a controlled strike at CPU time regardless of mixer advancement and restarts the same clip', () => {
  const root = new Group(), hand = new Group(); hand.name = 'RightHand'; root.add(hand);
  const q = new Quaternion().setFromAxisAngle({ x: 0, y: 1, z: 0 }, 1);
  const actor = new PreviewActor({ displayName: 'test', clips: [], cameras: { 'full-body': { target: [0,0,0], position: [0,0,1], near: 0, far: 2 }, portrait: { target: [0,0,0], position: [0,0,1], near: 0, far: 2 }, equipment: { target: [0,0,0], position: [0,0,1], near: 0, far: 2 } } });
  actor.attach({ scene: root, animations: [] });
  actor.addClips([new AnimationClip('Baton_Heavy', 1, [new QuaternionKeyframeTrack('RightHand.quaternion', [0,1], [0,0,0,1,...q.toArray()])])]);
  actor.selectClip({ kind: 'clip', name: 'Baton_Heavy' }, .05);
  for (const delta of [.001,.04,.1,.003]) {
    actor.update(delta); actor.sampleControlled(.4, 0);
    expect(hand.quaternion.angleTo(new Quaternion().slerp(q, .4))).toBeLessThan(.0001);
    expect(actor.sampledTime).toBe(.4);
  }
  actor.releaseControlled(); actor.update(.1);
  expect(hand.quaternion.clone().normalize().angleTo(new Quaternion().slerp(q, .5))).toBeLessThan(.0001);
  actor.selectClip({ kind: 'clip', name: 'Baton_Heavy' }, .05); actor.sampleControlled(0, 0);
  expect(hand.quaternion.angleTo(new Quaternion())).toBeLessThan(.0001);
  actor.dispose();
});
