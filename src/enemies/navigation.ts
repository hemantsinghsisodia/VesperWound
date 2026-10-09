import type { Position } from '../player/combat-definitions';
import { discBlocked, segmentBlocked, type CollisionBox } from '../player/collision-math';
/** Ground-floor shared distance field. Four-neighbour paths cannot cut corners. */
export class GroundNavigation {
  readonly step = .25;
  private readonly width = 61;
  private readonly origin = -7.5;
  private readonly cells = new Uint8Array(this.width * this.width);
  private readonly distances = new Int16Array(this.cells.length);
  private readonly queue = new Int32Array(this.cells.length);
  private target = -1;
  private nextPlan = 0;
  private readonly expanded: readonly CollisionBox[];
  constructor(boxes: readonly CollisionBox[]) {
    this.expanded=boxes.map(b=>({position:b.position,half:{x:b.half.x+.34,y:b.half.y,z:b.half.z+.34}}));
    for (let i=0;i<this.cells.length;i++) this.cells[i] = discBlocked(this.position(i), boxes) ? 0 : 1;
    this.distances.fill(-1);
  }
  private index(p: Position): number {
    if (Math.abs(p.y-.035)>.15) return -1;
    const x=Math.round((p.x-this.origin)/this.step), z=Math.round((p.z-this.origin)/this.step);
    return x<0||z<0||x>=this.width||z>=this.width ? -1 : z*this.width+x;
  }
  private position(i: number): Position { return {x:this.origin+i%this.width*this.step,y:.035,z:this.origin+Math.floor(i/this.width)*this.step}; }
  private neighbours(i: number): number[] {
    const x=i%this.width,z=Math.floor(i/this.width);
    return [x>0?i-1:-1,x+1<this.width?i+1:-1,z>0?i-this.width:-1,z+1<this.width?i+this.width:-1].filter(n=>n>=0&&this.cells[n]===1);
  }
  plan(p: Position, time: number): void {
    if(time<this.nextPlan) return; this.nextPlan=time+.1;
    const next=this.index(p); if(next===this.target) return; this.target=next; this.distances.fill(-1);
    if(next<0||!this.cells[next]) return;
    let start=0,end=1;this.queue[0]=next;this.distances[next]=0;
    while(start<end) {const i=this.queue[start++]!;for(const n of this.neighbours(i)) if(this.distances[n]===-1) {this.distances[n]=this.distances[i]!+1;this.queue[end++]=n;}}
  }
  reachable(p: Position): boolean { const i=this.index(p);return i>=0&&this.distances[i]!>=0; }
  direction(p: Position, goal: Position): {x:number;z:number}|null {
    const i=this.index(p); if(i<0||this.distances[i]!<0) return null;
    // A clear direct segment avoids zig-zagging in open space. Sweep clearance
    // still belongs to collision; a blocked move never teleports to another cell.
    if(!segmentBlocked({...p,y:1},{...goal,y:1},this.expanded)) return this.unit(p,goal);
    let best=i;for(const n of this.neighbours(i)) if(this.distances[n]!>=0&&this.distances[n]!<this.distances[best]!) best=n;
    return this.unit(p,this.position(best));
  }
  private unit(p: Position,q: Position) { const x=q.x-p.x,z=q.z-p.z,length=Math.hypot(x,z);return length<.02?{x:0,z:0}:{x:x/length,z:z/length}; }
}
