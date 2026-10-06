import { describe, expect, it } from 'vitest';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { PLAYER_CLIPS } from '../../src/player/player-animation';
describe('retargeted CC0 player clips', () => {
  it('has complete valid tracks bound to Medic and preserves vertical motion only', async () => {
    const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
    const doc = await io.read('public/assets/showcase/shared/animations.glb');
    const medic = await io.read('public/assets/showcase/desktop/character.glb');
    const names = new Set(medic.getRoot().listSkins().flatMap(s => s.listJoints().map(n => n.getName())));
    expect(doc.getRoot().listAnimations().map(a => a.getName()).sort()).toEqual(Object.values(PLAYER_CLIPS).sort());
    for (const clip of doc.getRoot().listAnimations()) {
      expect(clip.listChannels().length).toBeGreaterThan(20);
      for (const channel of clip.listChannels()) {
        expect(names.has(channel.getTargetNode()!.getName())).toBe(true);
        const sampler = channel.getSampler()!; const t = sampler.getInput()!.getArray()!; const out = sampler.getOutput()!;
        expect(t.length).toBeGreaterThan(1); expect(out.getCount()).toBe(t.length);
        expect(Array.from(out.getArray()!).every(Number.isFinite)).toBe(true);
        if (channel.getTargetPath() === 'rotation') {
          const q: number[] = []; for (let i = 0; i < out.getCount(); i++) { out.getElement(i, q); expect(Math.hypot(...q)).toBeCloseTo(1, 2); }
        } else {
          expect(channel.getTargetNode()!.getName()).toBe('Hips'); const values: number[] = []; const first: number[] = []; out.getElement(0, first);
          for (let i = 0; i < out.getCount(); i++) { out.getElement(i, values); expect(Math.abs(values[0]! - first[0]!)).toBeLessThan(.001); expect(Math.abs(values[2]! - first[2]!)).toBeLessThan(.001); }
        }
      }
    }
  });
});
