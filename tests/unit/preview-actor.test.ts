import { describe, expect, it } from 'vitest';
import { AnimationClip, Group, VectorKeyframeTrack } from 'three/webgpu';
import { PreviewActor } from '../../src/world/preview-actor';

describe('supplied character previews', () => {
  it('accepts a static-only model without required equipment sockets and releases its root', () => {
    const scene = new Group(); const actor = new PreviewActor();
    actor.attach({ scene, animations: [] }); actor.update(1);
    expect(actor.clip).toEqual({ kind: 'pose' }); expect(actor.clips).toEqual([]);
    actor.selectClip({ kind: 'clip', name: 'missing' }); expect(actor.clip).toEqual({ kind: 'pose' });
    actor.dispose(); expect(scene.parent).toBeNull(); expect(actor.group.children).toHaveLength(0);
  });
  it('freezes the first supplied frame, plays the real name, and respects pause', () => {
    const scene = new Group(); const joint = new Group(); joint.name = 'joint'; scene.add(joint);
    const clip = new AnimationClip('Supplied Walk', 1, [new VectorKeyframeTrack('joint.position', [0, 1], [1, 0, 0, 2, 0, 0])]);
    const actor = new PreviewActor(); actor.attach({ scene, animations: [clip] });
    expect(joint.position.x).toBe(1); actor.update(.4); expect(joint.position.x).toBe(1);
    actor.selectClip({ kind: 'clip', name: clip.name }); actor.update(.4); expect(joint.position.x).toBeCloseTo(1.4);
    actor.paused = true; actor.update(.4); expect(joint.position.x).toBeCloseTo(1.4);
    actor.selectClip({ kind: 'pose' }); expect(joint.position.x).toBe(1); actor.dispose();
  });
  it('defaults to a supplied idle and rejects duplicate clip names', () => {
    const actor = new PreviewActor(); actor.attach({ scene: new Group(), animations: [new AnimationClip('Medic Idle', 1, [])] });
    expect(actor.clip).toEqual({ kind: 'clip', name: 'Medic Idle' }); actor.dispose();
    const duplicate = new PreviewActor(); expect(() => duplicate.attach({ scene: new Group(), animations: [new AnimationClip('Walk', 1, []), new AnimationClip('Walk', 1, [])] })).toThrow('unique'); duplicate.dispose();
  });
});
