export type InputAction = 'pulse' | 'interact' | 'attack' | 'dodge' | 'run';
export interface InputFrame {
  movement: { x: number; y: number };
  aim: { x: number; y: number };
  pressed: ReadonlySet<InputAction>;
  held: ReadonlySet<InputAction>;
  aimActive?: boolean;
}
