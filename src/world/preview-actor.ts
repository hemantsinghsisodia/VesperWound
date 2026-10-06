import { AnimationMixer, Group, LoopOnce, LoopRepeat, Mesh, Vector3, type AnimationAction } from 'three/webgpu';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import type { PreviewClip } from './presentation';
import { MEDIC, type CharacterClip, type CharacterDefinition } from './character-definition';

/** Owns preview animation only. The asset handle owns meshes, skins and maps. */
export class PreviewActor {
  readonly group = new Group();
  clip: PreviewClip = { kind: 'pose' };
  clips: CharacterClip[] = [];
  paused = false;
  controlled = false;
  private mixer: AnimationMixer | null = null;
  private root: GLTF['scene'] | null = null;
  private readonly actions = new Map<string, AnimationAction>();
  constructor(readonly definition: CharacterDefinition = MEDIC) {}
  attach(gltf: Pick<GLTF, 'scene' | 'animations'>): void {
    this.root = gltf.scene; this.group.add(gltf.scene);
    gltf.scene.traverse((object) => {
      if (object instanceof Mesh) { object.castShadow = true; object.receiveShadow = true; object.frustumCulled = !('isSkinnedMesh' in object); }
    });
    this.mixer = new AnimationMixer(gltf.scene);
    const names = new Set<string>();
    this.clips = gltf.animations.map((clip) => {
      if (!clip.name || names.has(clip.name)) throw new Error('Character clips must have unique nonempty names.');
      names.add(clip.name); this.actions.set(clip.name, this.mixer!.clipAction(clip));
      return this.definition.clips.find((item) => item.name === clip.name) ?? { name: clip.name, loop: true };
    }).sort((a, b) => this.definition.clips.findIndex(c => c.name === a.name) - this.definition.clips.findIndex(c => c.name === b.name));
    for (const expected of this.definition.clips) if (!names.has(expected.name)) throw new Error(`Character animation is missing: ${expected.name}`);
    this.mixer.addEventListener('finished', this.finished); this.selectClip(this.defaultClip()); this.update(0);
  }
  private defaultClip(): PreviewClip {
    const idle = this.clips.find((clip) => /idle/i.test(clip.name));
    return idle ? { kind: 'clip', name: idle.name } : { kind: 'pose' };
  }
  private readonly finished = () => { if (!this.controlled) this.selectClip(this.defaultClip()); };
  playbackRate(rate: number): void { if (this.clip.kind === 'clip') this.actions.get(this.clip.name)?.setEffectiveTimeScale(rate); }
  selectClip(selection: PreviewClip): void {
    if (selection.kind === 'pose') {
      this.mixer?.stopAllAction();
      const idle = this.defaultClip();
      const first = (idle.kind === 'clip' ? this.actions.get(idle.name) : this.actions.values().next().value) as AnimationAction | undefined;
      if (first) { first.reset().play(); first.paused = false; this.mixer?.update(0); first.paused = true; }
      this.clip = { kind: 'pose' }; return;
    }
    const next = this.actions.get(selection.name); const descriptor = this.clips.find((item) => item.name === selection.name);
    if (!next || !descriptor) return;
    const idle = this.defaultClip();
    const previous = this.clip.kind === 'clip' ? this.actions.get(this.clip.name) : idle.kind === 'clip' ? this.actions.get(idle.name) : this.actions.values().next().value as AnimationAction | undefined;
    next.reset().setLoop(descriptor.loop ? LoopRepeat : LoopOnce, descriptor.loop ? Infinity : 1);
    next.paused = false; next.clampWhenFinished = true; next.enabled = true; next.setEffectiveTimeScale(1).setEffectiveWeight(1).play();
    if (previous && previous !== next) { previous.paused = false; next.crossFadeFrom(previous, 0.18, false); }
    this.clip = selection;
  }
  turn(): void { this.group.rotation.y += Math.PI / 4; }
  update(dt: number): void { if (!this.paused && this.clip.kind === 'clip') this.mixer?.update(dt); this.group.updateMatrixWorld(true); }
  inspection(): { feet: number[][]; gripDistances: number[] } {
    this.group.updateMatrixWorld(true);
    const feet = (this.definition.diagnostics?.feet ?? []).flatMap((name) => {
      const bone = this.group.getObjectByName(name); return bone ? [bone.getWorldPosition(new Vector3()).toArray()] : [];
    });
    return { feet, gripDistances: [] };
  }

  dispose(): void {
    this.mixer?.removeEventListener('finished', this.finished); this.mixer?.stopAllAction();
    if (this.root) this.mixer?.uncacheRoot(this.root);
    this.actions.clear(); this.clips = []; this.mixer = null; this.root = null; this.group.clear();
  }
}
