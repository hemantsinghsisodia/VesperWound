import type { Scene, Vector3 } from 'three/webgpu';
import type { AssetManager } from '../assets/asset-manager';
import type { QualityProfile } from '../performance/quality';
import type { InputFrame } from '../core/input-frame';

export type ArtVariant = 'desktop' | 'mobile';
export type CharacterTier = ArtVariant | 'cinematic';
export type InspectionView = 'full-body' | 'portrait' | 'equipment';
export type InspectionLighting = 'neutral' | 'ash-quay';
export type InspectionState =
  | { status: 'courtyard' }
  | { status: 'loading' }
  | { status: 'failed'; message: string }
  | { status: 'active'; view: InspectionView; lighting: InspectionLighting; paused: boolean };
export type PreviewClip = 'idle' | 'walk' | 'run' | 'attack' | 'dodge';
export type CameraView = 'courtyard' | 'character';
export interface WorldPresentation {
  readonly scene: Scene;
  readonly target: Vector3;
  readonly ownedResources: number;
  load(assets: AssetManager, missingFixture: boolean): Promise<void>;
  configure(profile: QualityProfile): void;
  update(dt: number, input: InputFrame, reducedMotion: boolean): boolean;
  interpolate(alpha: number): void;
  dispose(): void;
}
export function artVariant(quality: string): ArtVariant { return quality === 'Mobile' || quality === 'Low' ? 'mobile' : 'desktop'; }
