import type { InputFrame } from '../core/input-frame';

export interface Position { x: number; y: number; z: number }
export interface PlayerCollision {
  move(position: Position, displacement: Position): { position: Position; grounded: boolean };
  reset(position: Position): void;
  dispose(): void;
}
export type PlayerAction = 'idle' | 'walk' | 'run' | 'attack' | 'dodge' | 'hit' | 'dead';
export interface PlayerState {
  position: Position; previous: Position; facing: number; health: number;
  action: PlayerAction; actionTime: number; grounded: boolean;
  strikes: number; targetHits: number; invulnerable: boolean;
}
export const PLAYER_SPAWN: Position = { x: -1.6, y: 0.035, z: 3.4 };
export const PRACTICE_TARGET: Position = { x: 1.5, y: 0, z: 3.4 };
export const PRESSURE_VENT: Position = { x: -4.2, y: 0, z: 1.2 };
const DURATIONS = { attack: 0.65, dodge: 0.72, hit: 0.42 };
const SQRT_HALF = Math.SQRT1_2;

/** Fixed-clock CPU state. Rendering and animation never decide movement/damage. */
export class PlayerSimulation {
  readonly state: PlayerState = {
    position: { ...PLAYER_SPAWN }, previous: { ...PLAYER_SPAWN }, facing: 0,
    health: 100, action: 'idle', actionTime: 0, grounded: false,
    strikes: 0, targetHits: 0, invulnerable: false,
  };
  private clock = 0;
  private attackUntil = -1;
  private dodgeUntil = -1;
  private nextVentDamage = 0;
  private strikeResolved = false;
  private dodgeDirection = { x: 0, z: 1 };
  private verticalSpeed = 0;
  private disposed = false;
  constructor(private readonly collision: PlayerCollision) {}
  update(dt: number, input: InputFrame, aim?: { x: number; z: number }): boolean {
    if (dt <= 0 || this.disposed) return false;
    const s = this.state; s.previous = { ...s.position }; this.clock += dt;
    if (s.action === 'dead') return false;
    if (input.pressed.has('attack')) this.attackUntil = this.clock + 0.12;
    if (input.pressed.has('dodge')) this.dodgeUntil = this.clock + 0.12;
    s.actionTime += dt;
    if ((s.action === 'attack' || s.action === 'dodge' || s.action === 'hit') && s.actionTime >= DURATIONS[s.action]) this.action('idle');
    let x = (input.movement.x + input.movement.y) * SQRT_HALF;
    let z = (input.movement.y - input.movement.x) * SQRT_HALF;
    const length = Math.hypot(x, z); if (length > 1) { x /= length; z /= length; }
    const magnitude = Math.min(1, Math.hypot(x, z));
    const free = s.action === 'idle' || s.action === 'walk' || s.action === 'run';
    if (free) {
      if (magnitude > 0.08) {
        const desired = Math.atan2(x, z); const difference = Math.atan2(Math.sin(desired - s.facing), Math.cos(desired - s.facing));
        s.facing += difference * Math.min(1, dt * 16);
      }
      if (this.dodgeUntil >= this.clock) {
        this.dodgeUntil = -1; this.action('dodge');
        this.dodgeDirection = magnitude > 0.08 ? { x: x / magnitude, z: z / magnitude } : { x: Math.sin(s.facing), z: Math.cos(s.facing) };
        s.facing = Math.atan2(this.dodgeDirection.x, this.dodgeDirection.z);
      } else if (this.attackUntil >= this.clock) {
        this.attackUntil = -1;
        if (aim && Math.hypot(aim.x - s.position.x, aim.z - s.position.z) > 0.1) s.facing = Math.atan2(aim.x - s.position.x, aim.z - s.position.z);
        this.action('attack'); this.strikeResolved = false; s.strikes++;
      } else this.action(magnitude > 0.08 ? input.held.has('run') ? 'run' : 'walk' : 'idle');
    }
    s.invulnerable = s.action === 'dodge' && s.actionTime >= 0.04 && s.actionTime < 0.16;
    let dx = 0; let dz = 0;
    if (s.action === 'walk' || s.action === 'run') { const speed = s.action === 'run' ? 5 : 2.4; dx = x * speed * dt; dz = z * speed * dt; }
    if (s.action === 'dodge' && s.actionTime < 0.25) {
      const travel = Math.min(dt, 0.25 - s.actionTime) * 12;
      dx = this.dodgeDirection.x * travel; dz = this.dodgeDirection.z * travel;
    }
    this.verticalSpeed = Math.max(-12, this.verticalSpeed - 22 * dt);
    const moved = this.collision.move(s.position, { x: dx, y: this.verticalSpeed * dt, z: dz });
    s.position = moved.position; s.grounded = moved.grounded;
    if (s.grounded) this.verticalSpeed = -0.5;
    let impact = false;
    if (s.action === 'attack' && s.actionTime >= 0.22 && !this.strikeResolved) {
      this.strikeResolved = true;
      const toX = PRACTICE_TARGET.x - s.position.x; const toZ = PRACTICE_TARGET.z - s.position.z; const distance = Math.hypot(toX, toZ);
      if (distance < 1.25 && (toX * Math.sin(s.facing) + toZ * Math.cos(s.facing)) / Math.max(0.01, distance) > 0.45) { s.targetHits++; impact = true; }
    }
    if (Math.hypot(s.position.x - PRESSURE_VENT.x, s.position.z - PRESSURE_VENT.z) < 0.85 && this.clock >= this.nextVentDamage) {
      if (this.damage(20)) this.nextVentDamage = this.clock + 0.7;
    }
    return impact;
  }
  private action(action: PlayerAction): void { if (this.state.action !== action) { this.state.action = action; this.state.actionTime = 0; } }
  damage(amount: number): boolean {
    if (this.state.invulnerable || this.state.action === 'dead' || !Number.isFinite(amount) || amount <= 0) return false;
    this.state.health = Math.max(0, this.state.health - amount); this.state.invulnerable = false;
    this.attackUntil = this.dodgeUntil = -1; this.action(this.state.health ? 'hit' : 'dead'); return true;
  }
  reset(): void {
    Object.assign(this.state, { position: { ...PLAYER_SPAWN }, previous: { ...PLAYER_SPAWN }, facing: 0, health: 100, action: 'idle', actionTime: 0, grounded: false, strikes: 0, targetHits: 0, invulnerable: false });
    this.verticalSpeed = 0; this.attackUntil = this.dodgeUntil = -1; this.nextVentDamage = this.clock + 0.7;
    this.collision.reset(PLAYER_SPAWN);
  }
  dispose(): void { if (!this.disposed) { this.disposed = true; this.collision.dispose(); } }
}
