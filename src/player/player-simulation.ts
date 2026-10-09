import type { InputFrame } from '../core/input-frame';
import { UNARMED, TRAINING_TARGETS, attackTouches, type AttackId, type CombatEvent, type CombatEventPayload, type EntityHandle, type CombatantState, type CombatStyleDefinition, type Position, type WeaponId } from './combat-definitions';
import { BATON, BATON_PICKUP } from './weapon-definitions';
import { weaponTouches } from './weapon-contact';
export type { Position } from './combat-definitions';
export interface PlayerCollision {
  move(position: Position, displacement: Position): { position: Position; grounded: boolean };
  blocked?(from: Position, to: Position): boolean;
  moveTarget?(id: string, position: Position, displacement: Position): Position;
  syncTargets?(targets: readonly CombatantState[]): void;
  reset(position: Position): void; dispose(): void;
}
export type PlayerAction = 'idle' | 'walk' | 'run' | 'attack' | 'heavy' | 'ward' | 'dodge' | 'hit' | 'dead';
export interface PlayerState {
  weapon: WeaponId; position: Position; previous: Position; facing: number; health: number; pressure: number;
  action: PlayerAction; actionTime: number; actionSequence: number; attack: AttackId | null;
  grounded: boolean; strikes: number; targetHits: number; invulnerable: boolean;
  wardRemaining: number; combo: number; criticals: number; blocks: number; defeats: number;
  ventWarning: boolean; ventRemaining: number;
}
export const PLAYER_SPAWN: Position = { x: -1.6, y: .035, z: 3.4 };
export const PRACTICE_TARGET: Position = { ...TRAINING_TARGETS[0].position };
export const PRESSURE_VENT: Position = { x: -4.2, y: 0, z: 1.2 };
const DURATIONS = { dodge: .72, hit: .42, ward: .8 };
export class PlayerSimulation {
  readonly state: PlayerState = {
    weapon: 'unarmed', position: { ...PLAYER_SPAWN }, previous: { ...PLAYER_SPAWN }, facing: 0, health: 100, pressure: 100,
    action: 'idle', actionTime: 0, actionSequence: 0, attack: null, grounded: false,
    strikes: 0, targetHits: 0, invulnerable: false, wardRemaining: 0, combo: 0,
    criticals: 0, blocks: 0, defeats: 0, ventWarning: false, ventRemaining: 2,
  };
  readonly targets: CombatantState[] = TRAINING_TARGETS.map(t => ({ ...t, generation: 0, position: { ...t.position }, previous: { ...t.position }, spawn: { ...t.position }, health: t.maxHealth, posture: 0, exposedUntil: 0, defeatedUntil: 0, velocity: { x: 0, z: 0 }, hits: 0 }));
  generation = 0;
  training = true;
  get time(): number { return this.clock; }
  get handle(): EntityHandle { return { id: 'medic', generation: this.generation }; }
  private emit(event: CombatEventPayload, source = this.handle, incomingInstance: number | null = null): void {
    const target = 'target' in event ? this.targets.find(t => t.id === event.target) : null;
    const recipient = target ? { id: target.id, generation: target.generation } : event.type === 'block' || event.type === 'damage' ? this.handle : null;
    const attackInstance = 'instance' in event ? event.instance : incomingInstance ?? (source.id === 'medic' && this.state.attack ? this.state.actionSequence : null);
    this.events.push({ ...event, source, recipient, attackInstance });
  }
  clearQueued(): void { this.queued.clear(); }
  private clock = 0; private quietSince = 0; private chainUntil = -1;
  private readonly queued = new Map<'attack' | 'heavy' | 'ward' | 'dodge', number>();
  private readonly hitTargets = new Set<string>(); private pressureAwarded = false;
  private readonly events: CombatEvent[] = [];
  private dodgeDirection = { x: 0, z: 1 }; private verticalSpeed = 0;
  private ventAt = 2; private warned = false; private disposed = false;
  constructor(private readonly collision: PlayerCollision, private readonly baseStyle: CombatStyleDefinition = UNARMED) { if (!baseStyle.light.length) throw new Error('Combat style requires a light chain.'); collision.syncTargets?.(this.targets); }
  get style(): CombatStyleDefinition { return this.state.weapon === 'baton' ? BATON : this.baseStyle; }
  attackDefinition(id: AttackId) { const attack = this.style.attacks[id]; if (!attack) throw new Error(`Unknown style attack ${id}`); return attack; }
  canPickupBaton(): boolean { const s=this.state; return s.weapon==='unarmed' && s.health>0 && ['idle','walk','run'].includes(s.action) && Math.hypot(s.position.x-BATON_PICKUP.x,s.position.y-BATON_PICKUP.y,s.position.z-BATON_PICKUP.z)<=1.25 && !this.collision.blocked?.({...s.position,y:s.position.y+.6},{...BATON_PICKUP,y:BATON_PICKUP.y+.6}); }
  equipBaton(): boolean { if(!this.canPickupBaton())return false; this.state.weapon='baton'; this.state.combo=0; this.clearQueued(); this.state.actionSequence++; return true; }
  drainEvents(): CombatEvent[] { return this.events.splice(0); }
  nearestTarget(range = 1.8): Position | undefined {
    return this.targets.filter(t => t.health > 0).sort((a, b) => this.distance(a.position) - this.distance(b.position)).find(t => this.distance(t.position) < range)?.position;
  }
  private distance(p: Position): number { return Math.hypot(p.x - this.state.position.x, p.z - this.state.position.z); }
  update(dt: number, input: InputFrame, aim?: { x: number; z: number }, deferHits = false): void {
    if (dt <= 0 || this.disposed) return;
    const s = this.state; s.previous = { ...s.position }; this.clock += dt;
    this.updateTargets(dt);
    if (s.action === 'dead') return;
    for (const action of ['attack', 'heavy', 'ward', 'dodge'] as const) if (input.pressed.has(action)) this.queued.set(action, this.clock + this.style.buffer);
    for (const [action, until] of this.queued) if (until < this.clock) this.queued.delete(action);
    s.actionTime += dt; s.wardRemaining = Math.max(0, s.wardRemaining - dt);
    const attack = s.attack ? this.attackDefinition(s.attack) : null;
    if (attack && s.actionTime >= attack.duration) { this.chainUntil = this.clock + this.style.chainTimeout; this.action('idle'); }
    else if ((s.action === 'dodge' || s.action === 'hit' || s.action === 'ward') && s.actionTime >= DURATIONS[s.action]) this.action('idle');
    if (this.clock > this.chainUntil && s.action !== 'attack') s.combo = 0;
    let x = (input.movement.x + input.movement.y) * Math.SQRT1_2;
    let z = (input.movement.y - input.movement.x) * Math.SQRT1_2;
    const length = Math.hypot(x, z); if (length > 1) { x /= length; z /= length; }
    const magnitude = Math.min(1, Math.hypot(x, z));
    let free = ['idle', 'walk', 'run'].includes(s.action);
    const recovery = (s.action === 'attack' || s.action === 'heavy') && s.attack !== null && s.actionTime >= this.attackDefinition(s.attack).active[1];
    if ((free || recovery) && this.queued.has('dodge')) {
      this.queued.clear(); s.combo = 0; this.action('dodge');
      this.dodgeDirection = magnitude > .08 ? { x: x / magnitude, z: z / magnitude } : { x: Math.sin(s.facing), z: Math.cos(s.facing) };
      s.facing = Math.atan2(this.dodgeDirection.x, this.dodgeDirection.z); free = false;
    }
    if (free) {
      if (magnitude > .08) { const desired = Math.atan2(x, z); s.facing += Math.atan2(Math.sin(desired - s.facing), Math.cos(desired - s.facing)) * Math.min(1, dt * 16); }
      if (this.queued.has('ward')) {
        this.queued.delete('ward');
        if (s.pressure >= 25) { s.pressure -= 25; s.wardRemaining = .8; s.combo = 0; this.action('ward'); this.emit({ type: 'ward', position: { ...s.position } }); }
      } else if (this.queued.has('heavy') || this.queued.has('attack')) {
        const heavy = this.queued.has('heavy'); this.queued.clear();
        if (aim && Math.hypot(aim.x - s.position.x, aim.z - s.position.z) > .1) s.facing = Math.atan2(aim.x - s.position.x, aim.z - s.position.z);
        const id = heavy ? this.style.heavy : this.style.light[s.combo % this.style.light.length]!;
        s.combo = heavy ? 0 : s.combo % this.style.light.length + 1; this.action(heavy ? 'heavy' : 'attack'); s.attack = id;
        this.hitTargets.clear(); this.pressureAwarded = false; s.strikes++; this.quietSince = this.clock;
        this.emit({ type: 'swing', attack: id, instance: s.actionSequence, position: { ...s.position } });
      } else this.action(magnitude > .08 ? input.held.has('run') ? 'run' : 'walk' : 'idle');
    }
    s.invulnerable = s.action === 'dodge' && s.actionTime >= .04 && s.actionTime < .16;
    let dx = 0; let dz = 0;
    if (s.action === 'walk' || s.action === 'run') { const speed = s.action === 'run' ? 5 : 2.4; dx = x * speed * dt; dz = z * speed * dt; }
    if (s.action === 'dodge' && s.actionTime < .25) { const travel = Math.min(dt, .25 - s.actionTime) * 12; dx = this.dodgeDirection.x * travel; dz = this.dodgeDirection.z * travel; }
    this.verticalSpeed = Math.max(-12, this.verticalSpeed - 22 * dt);
    const moved = this.collision.move(s.position, { x: dx, y: this.verticalSpeed * dt, z: dz }); s.position = moved.position; s.grounded = moved.grounded;
    if (s.grounded) this.verticalSpeed = -.5;
    if (!deferHits) this.resolveAttack();
    if (this.training) {
    s.ventRemaining = Math.max(0, this.ventAt - this.clock); s.ventWarning = s.ventRemaining <= .6;
    if (s.ventWarning && !this.warned) { this.warned = true; this.emit({ type: 'vent-warning', position: { ...PRESSURE_VENT } }); }
    if (this.clock >= this.ventAt) {
      this.emit({ type: 'vent-pulse', position: { ...PRESSURE_VENT } });
      if (this.distance(PRESSURE_VENT) < .85) this.damage(20);
      this.ventAt = this.clock + 2; this.warned = false;
    }
    } else { s.ventWarning = false; s.ventRemaining = 0; }
    if (this.clock - this.quietSince >= 3) s.pressure = Math.min(100, s.pressure + 5 * dt);
  }
  resolveAttack(): void {
    const s = this.state; if (!s.attack) return;
    const a = this.attackDefinition(s.attack); if (s.actionTime < a.active[0] || s.actionTime - 1/60 >= a.active[1]) return;
    for (const t of this.targets) {
      const key = `${t.id}:${t.generation}`;
      if (t.health <= 0 || this.hitTargets.has(key) || !(a.contact ? weaponTouches(a,s.position,s.facing,t.position,s.actionTime,s.actionTime-1/60,this.collision.blocked?.bind(this.collision)) : attackTouches(a, s.position, s.facing, t.position))) continue;
      if (this.collision.blocked?.({ ...s.position, y: s.position.y + 1 }, { ...t.position, y: t.position.y + 1 })) continue;
      this.hitTargets.add(key); const critical = a.kind === 'heavy' && t.exposedUntil > this.clock;
      const damage = a.damage * (critical ? 2 : 1); t.health = Math.max(0, t.health - damage); t.hits++; s.targetHits++;
      if (!this.pressureAwarded) { s.pressure = Math.min(100, s.pressure + 10); this.pressureAwarded = true; }
      const position = { ...t.position };
      this.emit({ type: 'hit', attack: a.id, target: t.id, instance: s.actionSequence, damage, posture: a.posture, critical, position });
      if (critical) { t.exposedUntil = 0; t.posture = 0; s.criticals++; this.emit({ type: 'critical', target: t.id, position }); }
      else if (t.exposedUntil <= this.clock) { t.posture = Math.min(100, t.posture + a.posture); if (t.posture === 100 && t.health > 0) { t.exposedUntil = this.clock + 2; this.emit({ type: 'stagger', target: t.id, position }); } }
      const distance = Math.max(.01, this.distance(t.position));
      t.velocity = { x: (t.position.x - s.position.x) / distance * a.knockback * 8 / t.mass, z: (t.position.z - s.position.z) / distance * a.knockback * 8 / t.mass };
      if (!t.health) { t.exposedUntil = 0; t.defeatedUntil = this.clock + 4; s.defeats++; this.emit({ type: 'defeat', target: t.id, position }); }
    }
  }
  private updateTargets(dt: number): void {
    for (const t of this.targets) {
      t.previous = { ...t.position };
      if (!t.health) { if (this.training && this.clock >= t.defeatedUntil) this.resetTarget(t); continue; }
      if (t.exposedUntil && this.clock >= t.exposedUntil) { t.exposedUntil = 0; t.posture = 0; }
      const d = { x: t.velocity.x * dt, y: 0, z: t.velocity.z * dt };
      if (Math.hypot(d.x, d.z) > .0001) t.position = this.collision.moveTarget?.(t.id, t.position, d) ?? { x: t.position.x + d.x, y: t.position.y, z: t.position.z + d.z };
      t.velocity.x *= Math.exp(-dt * 8); t.velocity.z *= Math.exp(-dt * 8);
    }
    this.collision.syncTargets?.(this.targets);
  }
  private action(action: PlayerAction): void { if (this.state.action !== action) { this.state.action = action; this.state.actionTime = 0; this.state.actionSequence++; this.state.attack = null; } }
  damage(amount: number, source: EntityHandle = { id: 'vent', generation: 0 }, attackInstance: number | null = null): boolean {
    const s = this.state;
    if (s.invulnerable || s.action === 'dead' || !Number.isFinite(amount) || amount <= 0) return false;
    this.quietSince = this.clock;
    if (s.wardRemaining > 0) { s.wardRemaining = 0; s.blocks++; this.emit({ type: 'block', position: { ...s.position } }, source, attackInstance); return false; }
    s.health = Math.max(0, s.health - amount); s.invulnerable = false; s.combo = 0; s.wardRemaining = 0;
    this.queued.clear(); this.action(s.health ? 'hit' : 'dead'); this.emit({ type: 'damage', position: { ...s.position } }, source, attackInstance); return true;
  }
  private resetTarget(t: CombatantState): void { t.generation++; Object.assign(t, { position: { ...t.spawn }, previous: { ...t.spawn }, health: t.maxHealth, posture: 0, exposedUntil: 0, defeatedUntil: 0, velocity: { x: 0, z: 0 }, hits: 0 }); this.emit({ type: 'reset', target: t.id, position: { ...t.position } }); }
  resetTargets(): void { for (const t of this.targets) this.resetTarget(t); this.collision.syncTargets?.(this.targets); }
  reset(): void {
    this.generation++;
    Object.assign(this.state, { position: { ...PLAYER_SPAWN }, previous: { ...PLAYER_SPAWN }, facing: 0, health: 100, pressure: 100, action: 'idle', actionTime: 0, actionSequence: this.state.actionSequence + 1, attack: null, grounded: false, strikes: 0, targetHits: 0, invulnerable: false, wardRemaining: 0, combo: 0, criticals: 0, blocks: 0, defeats: 0, ventWarning: false, ventRemaining: 2 });
    this.verticalSpeed = 0; this.queued.clear(); this.hitTargets.clear(); this.chainUntil = -1; this.quietSince = this.clock; this.ventAt = this.clock + 2; this.warned = false;
    this.resetTargets(); this.events.length = 0; this.collision.reset(PLAYER_SPAWN);
  }
  dispose(): void { if (!this.disposed) { this.disposed = true; this.events.length = 0; this.collision.dispose(); } }
}
