export type InputAction = 'pulse' | 'interact';
export interface InputFrame {
  movement: { x: number; y: number };
  aim: { x: number; y: number };
  pressed: ReadonlySet<InputAction>;
  held: ReadonlySet<InputAction>;
}
