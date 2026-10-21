import { Group, Mesh, CylinderGeometry, BoxGeometry, TorusGeometry, SphereGeometry, MeshStandardNodeMaterial, MeshBasicNodeMaterial, InstancedMesh, Object3D, type BufferGeometry, type Material } from 'three/webgpu';
import type { PlayerSimulation } from '../player/player-simulation';
import { PRESSURE_VENT } from '../player/player-simulation';
import { TRAINING_TARGETS, type CombatEvent } from '../player/combat-definitions';
import type { WorldLabel, WorldLabels } from './world-labels';

/** Owns a bounded visual pool; it never resolves hits or changes combat state. */
export class CombatPresentation {
  readonly group = new Group();
  private readonly geometries: BufferGeometry[] = [];
  private readonly materials: Material[] = [];
  private readonly targets: Array<{ group: Group; plate: Mesh; material: MeshStandardNodeMaterial; label: WorldLabel; flash: number; critical: number; damage: number }> = [];
  private readonly particles: InstancedMesh;
  private readonly pool = Array.from({ length: 48 }, () => ({ life: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 }));
  private cursor = 0; private readonly matrix = new Object3D();
  private readonly ward: Mesh; private readonly vent: Mesh;
  private readonly wardMaterial = new MeshBasicNodeMaterial({ color: 0x9fe2d5, transparent: true, opacity: .12, depthWrite: false });
  private readonly ventMaterial = new MeshStandardNodeMaterial({ color: 0xb37a3d, emissive: 0x68310a, emissiveIntensity: .5, roughness: .65 });
  constructor(private readonly player: PlayerSimulation, labels: WorldLabels) {
    const post = new CylinderGeometry(.09, .15, 1.6, 10); const plate = new BoxGeometry(.65, .7, .2);
    const ring = new TorusGeometry(.82, .035, 6, 32); const sphere = new SphereGeometry(.82, 16, 10); const spark = new SphereGeometry(.025, 6, 4);
    const iron = new MeshStandardNodeMaterial({ color: 0x343b3b, metalness: .65, roughness: .5 });
    const sparkMaterial = new MeshBasicNodeMaterial({ color: 0xe6c189 });
    this.geometries.push(post, plate, ring, sphere, spark); this.materials.push(iron, sparkMaterial, this.wardMaterial, this.ventMaterial);
    for (const t of TRAINING_TARGETS) {
      const group = new Group(); const material = new MeshStandardNodeMaterial({ color: t.id === 'heavy' ? 0x687574 : 0xb09b79, emissive: 0x8a6030, emissiveIntensity: .08, roughness: .8, metalness: t.id === 'heavy' ? .6 : 0 });
      this.materials.push(material); const pole = new Mesh(post, iron); pole.position.y = .8; pole.castShadow = true;
      const face = new Mesh(plate, material); face.position.y = 1.2; face.castShadow = true; group.add(pole, face);
      const label = labels.create('training'); label.position.y = 2.1;
      group.add(label); this.group.add(group); this.targets.push({ group, plate: face, material, label, flash: 0, critical: 0, damage: 0 });
    }
    this.ward = new Mesh(sphere, this.wardMaterial); this.ward.scale.set(1, 1.25, 1); this.group.add(this.ward);
    this.vent = new Mesh(ring, this.ventMaterial); this.vent.rotation.x = Math.PI / 2; this.vent.position.set(PRESSURE_VENT.x, .08, PRESSURE_VENT.z); this.group.add(this.vent);
    this.particles = new InstancedMesh(spark, sparkMaterial, this.pool.length); this.particles.frustumCulled = false; this.group.add(this.particles); this.update(0, true); this.interpolate(1);
  }
  event(event: CombatEvent, reduced: boolean): void {
    if (event.type === 'hit') {
      const index = this.player.targets.findIndex(t => t.id === event.target);
      if (index >= 0) { const target = this.targets[index]!; target.flash = reduced ? 0 : .16; if (event.critical) { target.critical = 1; target.damage = event.damage; } }
      if (!reduced) for (let i = 0; i < (event.critical ? 12 : event.attack === 'heavy' || event.attack === 'baton-heavy' ? 8 : 4); i++) {
        const p = this.pool[this.cursor++ % this.pool.length]!; const a = i * 2.4;
        Object.assign(p, { life: .25, x: event.position.x, y: event.position.y + 1.15, z: event.position.z, vx: Math.sin(a) * 1.8, vy: 1 + (i % 3) * .3, vz: Math.cos(a) * 1.8 });
      }
    } else if (event.type === 'reset') { const target = this.targets[this.player.targets.findIndex(t => t.id === event.target)]; if (target) { target.critical = 0; target.flash = 0; } }
  }
  update(dt: number, reduced: boolean): void {
    this.targets.forEach((view, i) => {
      view.group.visible = this.player.training;
      if (!this.player.training) return;
      const t = this.player.targets[i]!; view.flash = Math.max(0, view.flash - dt); view.critical = Math.max(0, view.critical - dt); view.material.emissiveIntensity = reduced ? .08 : view.flash > 0 ? 1.2 : t.exposedUntil > 0 ? .4 : .08;
      view.label.visible = t.posture > 0 || view.flash > 0 || Math.hypot(t.position.x - this.player.state.position.x, t.position.z - this.player.state.position.z) < 2.5;
      view.plate.rotation.z = t.health === 0 ? Math.PI / 2 : t.exposedUntil > 0 ? .2 : Math.min(.12, Math.hypot(t.velocity.x, t.velocity.z) * .06);
      view.plate.position.y = t.health === 0 ? .15 : 1.2;
      const label = view.critical > 0 ? `CRITICAL · ${view.damage}` : t.health === 0 ? 'DEFEATED · RESETTING' : t.exposedUntil > 0 ? 'EXPOSED · HEAVY' : t.label;
      view.label.combat(label,t.health,t.maxHealth,t.posture,view.critical>0?'mint':t.exposedUntil>0?'amber':'normal');
    });
    this.ward.visible = this.player.state.wardRemaining > 0; this.wardMaterial.opacity = reduced ? .06 : .12;
    this.vent.visible = this.player.training;
    this.ward.position.set(this.player.state.position.x, this.player.state.position.y + .9, this.player.state.position.z);
    this.ventMaterial.emissiveIntensity = reduced ? .5 : this.player.state.ventWarning ? 1.8 : .5;
    this.vent.scale.setScalar(this.player.state.ventWarning ? 1.05 : 1);
    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i]!; p.life = Math.max(0, p.life - dt);
      if (reduced) p.life = 0;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vy -= dt * 5;
      this.matrix.position.set(p.x, p.y, p.z); this.matrix.scale.setScalar(p.life > 0 ? p.life / .25 : 0); this.matrix.updateMatrix(); this.particles.setMatrixAt(i, this.matrix.matrix);
    }
    this.particles.instanceMatrix.needsUpdate = true;
  }
  interpolate(alpha: number): void { if (this.player.training) this.targets.forEach((v, i) => { const t = this.player.targets[i]!; v.group.position.set(t.previous.x + (t.position.x - t.previous.x) * alpha, t.position.y, t.previous.z + (t.position.z - t.previous.z) * alpha); }); }
  get ownedResources(): number { return this.geometries.length + this.materials.length + this.targets.length; }
  dispose(): void { this.particles.dispose(); this.targets.forEach(t => t.label.dispose()); this.group.clear(); this.geometries.forEach(g => g.dispose()); this.materials.forEach(m => m.dispose()); }
}
