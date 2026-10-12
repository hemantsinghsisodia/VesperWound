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

it('gameplay framing makes the standing player readable on desktop and landscape', () => {
  const target = new Vector3(-1.6, .035, 3.4);
  for (const [width, height, minimum] of [[1440, 900, .13], [915, 412, .14]]) {
    const camera = new CourtyardCamera(); camera.resize(width!, height!); camera.selectView('player', target, true);
    camera.camera.updateMatrixWorld(true);
    const feet = target.clone().project(camera.camera);
    const head = target.clone().add(new Vector3(0, 1.8, 0)).project(camera.camera);
    const proportion = Math.abs(head.y - feet.y) / 2;
    expect(proportion).toBeGreaterThan(minimum!); expect(proportion).toBeLessThan(.2);
  }
});
