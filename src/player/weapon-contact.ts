import type { AttackDefinition, ContactPose, Position } from './combat-definitions';
const interpolate = (a: readonly number[], b: readonly number[], t: number): Position => ({ x:a[0]!+(b[0]!-a[0]!)*t,y:a[1]!+(b[1]!-a[1]!)*t,z:a[2]!+(b[2]!-a[2]!)*t });
function sample(rows: readonly ContactPose[], time: number): { base: Position; tip: Position } {
  const index=Math.min(rows.length-2,Math.max(0,Math.floor(time*60)));
  const a=rows[index]!,b=rows[index+1]!;const t=Math.max(0,Math.min(1,(time-a.time)/(b.time-a.time)));
  return {base:interpolate(a.base,b.base,t),tip:interpolate(a.tip,b.tip,t)};
}
function world(p: Position,origin:Position,facing:number):Position { return {x:origin.x+p.x*Math.cos(facing)+p.z*Math.sin(facing),y:origin.y+p.y,z:origin.z+p.z*Math.cos(facing)-p.x*Math.sin(facing)}; }
function overlaps(a:Position,b:Position,target:Position,radius:number):boolean {
  const dx=b.x-a.x,dz=b.z-a.z,len=dx*dx+dz*dz;
  const t=len?Math.max(0,Math.min(1,((target.x-a.x)*dx+(target.z-a.z)*dz)/len)):0;
  const y=a.y+(b.y-a.y)*t;
  return y>=target.y+.35-radius&&y<=target.y+1.65+radius&&Math.hypot(a.x+dx*t-target.x,a.z+dz*t-target.z)<=radius;
}
/** Offline sampled poses only. Substeps bound a swept segment between fixed ticks. */
export function weaponTouches(attack:AttackDefinition,origin:Position,facing:number,target:Position,time:number,previousTime:number,blocked?:(a:Position,b:Position)=>boolean):boolean {
  if(!attack.contact)return false;
  const from=Math.max(attack.active[0],previousTime),to=Math.min(attack.active[1],time);
  if(to<from||time<attack.active[0]||previousTime>=attack.active[1])return false;
  for(let i=0;i<=4;i++) {
    const pose=sample(attack.contact,from+(to-from)*i/4),base=world(pose.base,origin,facing),tip=world(pose.tip,origin,facing);
    if(!overlaps(base,tip,target,attack.radius+.3))continue;
    const chest={x:origin.x,y:base.y,z:origin.z};
    if(!blocked?.(chest,base)&&!blocked?.(base,tip)&&!blocked?.(base,{x:target.x,y:base.y,z:target.z}))return true;
  }
  return false;
}
