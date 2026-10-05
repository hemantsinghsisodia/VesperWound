import { AnimationMixer, Group, LoopOnce, LoopRepeat, Mesh, Vector3, type AnimationAction } from 'three/webgpu';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import type { PreviewClip } from './presentation';

/** Owns preview animation only. The asset handle owns meshes, skins and maps. */
export class PreviewActor {
  readonly group = new Group();
  clip: PreviewClip = 'idle';
  paused = false;
  private mixer: AnimationMixer | null = null;
  private root: GLTF['scene'] | null = null;
  private readonly actions = new Map<PreviewClip, AnimationAction>();
  attach(gltf: GLTF): void {
    this.root = gltf.scene; this.group.add(gltf.scene);
    gltf.scene.traverse((object) => {
      if (object instanceof Mesh) { object.castShadow = true; object.receiveShadow = true; object.frustumCulled = !('isSkinnedMesh' in object); }
    });
    for (const name of ['socket_lantern', 'socket_wake_hook']) if (!gltf.scene.getObjectByName(name)) throw new Error(`Iona attachment is missing: ${name}`);
    this.mixer = new AnimationMixer(gltf.scene);
    for (const name of ['idle', 'walk', 'run', 'attack', 'dodge'] as const) {
      const clip = gltf.animations.find((value) => value.name === name);
      if (!clip) throw new Error(`Iona animation is missing: ${name}`);
      this.actions.set(name, this.mixer.clipAction(clip));
    }
    this.mixer.addEventListener('finished', this.finished); this.actions.get('idle')?.play(); this.update(0);
  }
  private readonly finished = () => this.selectClip('idle');
  selectClip(name: PreviewClip): void {
    const next = this.actions.get(name); if (!next) return;
    const previous = this.actions.get(this.clip);
    next.reset().setLoop(name === 'attack' || name === 'dodge' ? LoopOnce : LoopRepeat, Infinity);
    next.clampWhenFinished = true; next.enabled = true; next.setEffectiveWeight(1).play();
    if (previous && previous !== next) next.crossFadeFrom(previous, 0.18, false);
    this.clip = name;
  }
  turn(): void { this.group.rotation.y += Math.PI / 4; }
  update(dt: number): void { if (!this.paused) this.mixer?.update(dt); this.group.updateMatrixWorld(true); }
  inspection(): { feet: number[][]; gripDistances: number[] } {
    this.group.updateMatrixWorld(true);
    const position = (name: string) => {
      const object = this.group.getObjectByName(name); if (!object) throw new Error(`Rig node missing: ${name}`);
      return object.getWorldPosition(new Vector3());
    };
    return { feet: [position('footL').toArray(), position('footR').toArray()],
      gripDistances: [position('socket_lantern').distanceTo(position('handL')), position('socket_wake_hook').distanceTo(position('handR'))] };
  }
  dispose(): void {
    this.mixer?.removeEventListener('finished', this.finished); this.mixer?.stopAllAction();
    if (this.root) this.mixer?.uncacheRoot(this.root);
    this.actions.clear(); this.mixer = null; this.root = null; this.group.clear();
  }
}
