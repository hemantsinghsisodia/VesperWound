import RAPIER from '@dimforge/rapier3d-compat';
import { PLAYER_SPAWN, type PlayerCollision, type Position } from './player-simulation';
import type { CombatantState } from './combat-definitions';
import { segmentBlocked, discBlocked, type CollisionBox } from './collision-math';

export type { CollisionBox } from './collision-math';
let initialized: Promise<void> | null = null;
export async function initializePhysics(): Promise<void> { initialized ??= RAPIER.init(); await initialized; }

/** One session owns the world. Art reloads share the same collision/controller. */
export class RapierPlayerCollision implements PlayerCollision {
  private readonly world = new RAPIER.World({ x: 0, y: -22, z: 0 });
  private readonly body = this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(PLAYER_SPAWN.x, PLAYER_SPAWN.y + 0.87, PLAYER_SPAWN.z));
  private readonly capsule = this.world.createCollider(RAPIER.ColliderDesc.capsule(0.57, 0.28).setFriction(0), this.body);
  private readonly controller = this.world.createCharacterController(0.015);
  private installed = false;
  private disposed = false;
  private boxes: readonly CollisionBox[] = [];
  private readonly targets = new Map<string, { collider: RAPIER.Collider; position: Position; active: boolean }>();
  constructor() {
    // The existing raised landing overlaps its narrow stair meshes. A capsule
    // encounters a 0.53 m rise there, so retain clearance for that authored lip.
    this.controller.enableAutostep(0.6, 0.15, false); this.controller.enableSnapToGround(0.2);
    this.controller.setMaxSlopeClimbAngle(Math.PI / 4); this.controller.setMinSlopeSlideAngle(Math.PI / 3);
    this.world.timestep = 1 / 60;
  }
  install(boxes: readonly CollisionBox[]): void {
    if (this.installed) return; this.installed = true;
    // The legacy practice-post collider is replaced by live target colliders.
    this.boxes = boxes.filter(b => !(b.position.x === 1.5 && b.position.z === 3.4 && b.half.x === .24));
    for (const { position: p, half: h } of this.boxes) this.world.createCollider(RAPIER.ColliderDesc.cuboid(h.x, h.y, h.z).setTranslation(p.x, p.y, p.z));
    this.world.step();
  }
  move(position: Position, displacement: Position): { position: Position; grounded: boolean } {
    this.body.setTranslation({ x: position.x, y: position.y + 0.87, z: position.z }, true);
    this.controller.computeColliderMovement(this.capsule, displacement);
    const movement = this.controller.computedMovement();
    const next = { x: position.x + movement.x, y: position.y + movement.y, z: position.z + movement.z };
    this.body.setNextKinematicTranslation({ x: next.x, y: next.y + 0.87, z: next.z }); this.world.step();
    return { position: next, grounded: this.controller.computedGrounded() };
  }
  reset(position: Position): void { this.body.setTranslation({ x: position.x, y: position.y + 0.87, z: position.z }, true); this.world.step(); }
  blocked(from: Position, to: Position): boolean { return segmentBlocked(from, to, this.boxes); }
  syncTargets(states: readonly CombatantState[]): void {
    for (const t of states) {
      let entry = this.targets.get(t.id);
      if (!entry) { entry = { collider: this.world.createCollider(RAPIER.ColliderDesc.cylinder(.8, .3)), position: { ...t.position }, active: true }; this.targets.set(t.id, entry); }
      entry.position = { ...t.position }; entry.active = t.health > 0;
      entry.collider.setTranslation({ x: t.position.x, y: t.position.y + .8, z: t.position.z }); entry.collider.setEnabled(entry.active);
    }
  }
  moveTarget(id: string, position: Position, displacement: Position): Position {
    const p = { ...position }; const steps = Math.max(1, Math.ceil(Math.hypot(displacement.x, displacement.z) / .08));
    const blocked = (next: Position) => discBlocked(next, this.boxes) || [...this.targets].some(([other, t]) => other !== id && t.active && Math.hypot(t.position.x - next.x, t.position.z - next.z) < .6) || Math.hypot(this.body.translation().x - next.x, this.body.translation().z - next.z) < .58;
    for (let i = 0; i < steps; i++) {
      const x = { ...p, x: p.x + displacement.x / steps }; if (!blocked(x)) p.x = x.x;
      const z = { ...p, z: p.z + displacement.z / steps }; if (!blocked(z)) p.z = z.z;
    }
    return p;
  }
  dispose(): void { if (!this.disposed) { this.disposed = true; this.world.free(); } }
}
