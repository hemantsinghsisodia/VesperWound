import type { Position } from '../player/combat-definitions';
import { discBlocked, discPathBlocked, segmentBlocked, type CollisionBox } from '../player/collision-math';
export interface NavigationBounds { minX: number; maxX: number; minZ: number; maxZ: number }
/** Ground-floor shared distance field. Four-neighbour paths cannot cut corners. */
export class GroundNavigation {
  readonly step = .25;
  private readonly width: number;
  private readonly height: number;
  private readonly cells: Uint8Array;
  private readonly edges: Uint8Array;
  private readonly distances: Int16Array;
  private readonly queue: Int32Array;
  private target = -1;
  private nextPlan = 0;
  private lastPlan = -Infinity;
  private readonly offsets: readonly number[];
  constructor(private readonly boxes: readonly CollisionBox[], private readonly bounds: NavigationBounds = { minX: -7.5, maxX: 7.5, minZ: -7.5, maxZ: 7.5 }, private readonly walkable: (p: Position) => boolean = () => true) {
    this.width = Math.round((bounds.maxX - bounds.minX) / this.step) + 1;
    this.height = Math.round((bounds.maxZ - bounds.minZ) / this.step) + 1;
    this.cells = new Uint8Array(this.width * this.height); this.distances = new Int16Array(this.cells.length); this.queue = new Int32Array(this.cells.length);
    this.edges = new Uint8Array(this.cells.length); this.offsets = [-1, 1, -this.width, this.width];
    for (let i=0;i<this.cells.length;i++) this.cells[i] = !walkable(this.position(i)) || discBlocked(this.position(i), boxes) ? 0 : 1;
    for (let i = 0; i < this.cells.length; i++) if (this.cells[i]) {
      const x = i % this.width, z = Math.floor(i / this.width);
      const valid = [x > 0, x + 1 < this.width, z > 0, z + 1 < this.height];
      for (let d = 0; d < 4; d++) {
        const n = i + this.offsets[d]!;
        if (valid[d] && this.cells[n] && this.clear(this.position(i), this.position(n))) this.edges[i]! |= 1 << d;
      }
    }
    this.distances.fill(-1);
  }
  private index(p: Position): number {
    if (Math.abs(p.y-.035)>.15) return -1;
    const x=Math.round((p.x-this.bounds.minX)/this.step), z=Math.round((p.z-this.bounds.minZ)/this.step);
    return x<0||z<0||x>=this.width||z>=this.height ? -1 : z*this.width+x;
  }
  private position(i: number): Position { return {x:this.bounds.minX+i%this.width*this.step,y:.035,z:this.bounds.minZ+Math.floor(i/this.width)*this.step}; }
  private clear(from: Position, to: Position): boolean {
    if (discPathBlocked(from, to, this.boxes)) return false;
    const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / (this.step / 2)));
    for (let n = 0; n <= steps; n++) if (!this.walkable({ x: from.x + (to.x - from.x) * n / steps, y: .035, z: from.z + (to.z - from.z) * n / steps })) return false;
    return true;
  }
  private cell(p: Position, goal = false): number {
    const rounded = this.index(p);
    if (rounded < 0 || !this.walkable(p)) return -1;
    const blocked = discBlocked(p, this.boxes);
    if (blocked && !goal) return -1;
    // A valid disc can round into a solid cell. Connect it through free space
    // to a nearby cell; this never moves the actor or crosses a wall.
    const x = rounded % this.width, z = Math.floor(rounded / this.width);
    let best = -1, distance = Infinity;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, nz = z + dz;
      if (nx < 0 || nz < 0 || nx >= this.width || nz >= this.height) continue;
      const i = nz * this.width + nx; if (!this.cells[i]) continue;
      const q = this.position(i), d = (q.x - p.x) ** 2 + (q.z - p.z) ** 2;
      if (d >= distance) continue;
      // Medic's narrower capsule can stand closer to walls. Project that goal
      // onto enemy-clear ground on the same side instead of losing the field.
      const connected = blocked && goal ? !segmentBlocked({ ...p, y: 1 }, { ...q, y: 1 }, this.boxes) : this.clear(p, q);
      if (connected) { best = i; distance = d; }
    }
    return best;
  }
  plan(p: Position, time: number): void {
    if(time>=this.lastPlan&&time<this.nextPlan) return; this.lastPlan=time;this.nextPlan=time+.1;
    const next=this.cell(p,true); if(next===this.target) return; this.target=next; this.distances.fill(-1);
    if(next<0) return;
    let start=0,end=1;this.queue[0]=next;this.distances[next]=0;
    while(start<end) {const i=this.queue[start++]!;for(let d=0;d<4;d++)if(this.edges[i]!&1<<d){const n=i+this.offsets[d]!;if(this.distances[n]===-1) {this.distances[n]=this.distances[i]!+1;this.queue[end++]=n;}}}
  }
  reachable(p: Position): boolean { const i=this.cell(p);return i>=0&&this.distances[i]!>=0; }
  direction(p: Position, goal: Position): {x:number;z:number}|null {
    const i=this.cell(p); if(i<0||this.distances[i]!<0) return null;
    // A clear direct segment avoids zig-zagging in open space. Sweep clearance
    // still belongs to collision; a blocked move never teleports to another cell.
    if(this.clear(p,goal)) return this.unit(p,goal);
    let best=i;for(let d=0;d<4;d++)if(this.edges[i]!&1<<d){const n=i+this.offsets[d]!;if(this.distances[n]!>=0&&this.distances[n]!<this.distances[best]!&&this.clear(p,this.position(n)))best=n;}
    return this.unit(p,this.position(best));
  }
  private unit(p: Position,q: Position) { const x=q.x-p.x,z=q.z-p.z,length=Math.hypot(x,z);return length<.02?{x:0,z:0}:{x:x/length,z:z/length}; }
}
