import { PerspectiveCamera, Vector3 } from 'three/webgpu';

export class CourtyardCamera {
  readonly camera = new PerspectiveCamera(38, 1, 0.1, 100);
  private readonly lookAt = new Vector3(0, 0.6, -1.8);
  private readonly offset = new Vector3(15, 19, 15);
  constructor() { this.camera.position.copy(this.lookAt).add(this.offset); this.camera.lookAt(this.lookAt); }
  update(target: Vector3, dt: number): void {
    const follow = new Vector3(target.x * 0.22, 0.6, target.z * 0.15 - 2.5);
    this.lookAt.lerp(follow, 1 - Math.exp(-dt * 8));
    this.camera.position.copy(this.lookAt).add(this.offset); this.camera.lookAt(this.lookAt);
  }
  resize(width: number, height: number): void { this.camera.aspect = width / Math.max(1, height); this.camera.updateProjectionMatrix(); }
}
