import type { CombatantState, EntityHandle, Position } from './combat-definitions';

/** CPU-owned focus. Pointer aim remains free for sweeps; touch retains a reachable target. */
export class CombatTargeting {
  selected: EntityHandle | null = null;
  private explicit = false;

  clear(): void { this.selected = null; this.explicit = false; }

  resolve(targets: readonly CombatantState[], origin: Position, blocked?: (a: Position, b: Position) => boolean,
    pointer?: { x: number; z: number }, cycle = false): { x: number; z: number } | undefined {
    const distance = (target: CombatantState) => Math.hypot(target.position.x - origin.x, target.position.z - origin.z);
    const visible = targets.filter(target => target.health > 0 && Math.abs(target.position.y - origin.y) < .65 && distance(target) <= 6 &&
      !blocked?.({ ...origin, y: origin.y + 1 }, { ...target.position, y: target.position.y + 1 }));
    const current = visible.find(target => target.id === this.selected?.id && target.generation === this.selected.generation);
    let next: CombatantState | undefined;
    if (cycle) {
      const ordered = [...visible].sort((a, b) => a.id.localeCompare(b.id));
      next = current ? ordered[(ordered.indexOf(current) + 1) % ordered.length] : [...visible].sort((a, b) => distance(a) - distance(b))[0];
      this.explicit = true;
    } else if (pointer) {
      next = [...visible].sort((a, b) => Math.hypot(a.position.x - pointer.x, a.position.z - pointer.z) - Math.hypot(b.position.x - pointer.x, b.position.z - pointer.z))
        .find(target => Math.hypot(target.position.x - pointer.x, target.position.z - pointer.z) <= .75);
      this.explicit = false;
    } else {
      const nearest = [...visible].filter(target => distance(target) < 1.8).sort((a, b) => distance(a) - distance(b))[0];
      // Hysteresis prevents adjacent hurt volumes alternating during movement.
      next = current && (this.explicit || distance(current) < 1.8) && (!nearest || this.explicit || distance(current) <= distance(nearest) + .3) ? current : nearest;
    }
    this.selected = next ? { id: next.id, generation: next.generation } : null;
    if (!next) this.explicit = false;
    return pointer && !cycle ? pointer : next?.position;
  }
}
