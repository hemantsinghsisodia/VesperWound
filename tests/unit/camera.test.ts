import { expect, it } from 'vitest';
import { Vector3 } from 'three/webgpu';
import { CourtyardCamera } from '../../src/camera/courtyard-camera';

it('camera feedback cannot change the combat aiming ray', () => {
  const quiet = new CourtyardCamera(); const feedback = new CourtyardCamera(); const target = new Vector3(1, .035, 3.4);
  for (const camera of [quiet, feedback]) { camera.resize(1440, 900); camera.selectView('player', target, true); }
  feedback.impulse(.14);
  for (let frame = 0; frame < 20; frame++) {
    for (const camera of [quiet, feedback]) camera.update(target, 1 / 60);
    expect(feedback.aim({ x: .2, y: -.1 }, .035)).toEqual(quiet.aim({ x: .2, y: -.1 }, .035));
  }
  expect(feedback.camera.position.equals(quiet.camera.position)).toBe(false);
});
