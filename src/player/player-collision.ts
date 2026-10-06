import RAPIER from '@dimforge/rapier3d-compat';
import { PLAYER_SPAWN, type PlayerCollision, type Position } from './player-simulation';

export interface CollisionBox { position: Position; half: Position }
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
  constructor() {
    // The existing raised landing overlaps its narrow stair meshes. A capsule
    // encounters a 0.53 m rise there, so retain clearance for that authored lip.
    this.controller.enableAutostep(0.6, 0.15, false); this.controller.enableSnapToGround(0.2);
    this.controller.setMaxSlopeClimbAngle(Math.PI / 4); this.controller.setMinSlopeSlideAngle(Math.PI / 3);
    this.world.timestep = 1 / 60;
  }
  install(boxes: readonly CollisionBox[]): void {
    if (this.installed) return; this.installed = true;
    for (const { position: p, half: h } of boxes) this.world.createCollider(RAPIER.ColliderDesc.cuboid(h.x, h.y, h.z).setTranslation(p.x, p.y, p.z));
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
  dispose(): void { if (!this.disposed) { this.disposed = true; this.world.free(); } }
}
