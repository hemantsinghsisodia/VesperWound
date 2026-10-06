import type { InspectionView } from './presentation';

export interface CharacterClip { name: string; loop: boolean }
export interface CameraTarget { target: [number, number, number]; position: [number, number, number]; near: number; far: number }
export interface CharacterDefinition {
  displayName: string;
  clips: readonly CharacterClip[];
  cameras: Record<InspectionView, CameraTarget>;
  diagnostics?: { feet: readonly string[] };
}
export const MEDIC: CharacterDefinition = {
  displayName: 'Medic', clips: [], diagnostics: { feet: ['LeftFoot', 'RightFoot'] },
  cameras: {
    'full-body': { target: [0, 0.9, 0], position: [0, 1.05, 3.5], near: 1.7, far: 6 },
    portrait: { target: [0, 1.65, 0], position: [0, 1.65, 0.85], near: 0.3, far: 2 },
    equipment: { target: [0.18, 0.9, 0], position: [1, 1.05, 1.5], near: 0.5, far: 3 },
  },
};
