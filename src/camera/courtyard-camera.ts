import { PerspectiveCamera, Vector3 } from 'three/webgpu';
import type { CameraView } from '../world/presentation';

export class CourtyardCamera {
  readonly camera = new PerspectiveCamera(38, 1, 0.1, 100);
  private readonly lookAt = new Vector3(0, 0.6, -1.8);
  private readonly offset = new Vector3(15, 19, 15);
  private showcase = false;
  view: CameraView = 'courtyard';
  constructor() { this.camera.position.copy(this.lookAt).add(this.offset); this.camera.lookAt(this.lookAt); }
  update(target: Vector3, dt: number): void {
    const follow = this.showcase ? this.view === 'character' ? new Vector3(target.x, 0.98, target.z) : new Vector3(0, 0.8, -0.7) : new Vector3(target.x * 0.22, 0.6, target.z * 0.15 - 2.5);
    this.lookAt.lerp(follow, 1 - Math.exp(-dt * 8));
    this.camera.position.copy(this.lookAt).add(this.offset); this.camera.lookAt(this.lookAt);
  }
  selectView(view: CameraView, target: Vector3, showcase: boolean): void {
    this.showcase = showcase; this.view = view;
    const offset: [number, number, number] = showcase ? view === 'character' ? [2.1, 1.0, 3.2] : [11.7, 13, 14] : [15, 19, 15];
    this.offset.set(...offset);
    this.update(target, 1);
  }
  resize(width: number, height: number): void { this.camera.aspect = width / Math.max(1, height); this.camera.updateProjectionMatrix(); }
}
