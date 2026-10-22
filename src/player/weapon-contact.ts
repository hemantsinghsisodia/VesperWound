import type { AttackDefinition, ContactPose, Position } from './combat-definitions';
const interpolate = (a: readonly number[], b: readonly number[], t: number): Position => ({ x:a[0]!+(b[0]!-a[0]!)*t,y:a[1]!+(b[1]!-a[1]!)*t,z:a[2]!+(b[2]!-a[2]!)*t });
export function sampleWeaponContact(rows: readonly ContactPose[], time: number): { base: Position; tip: Position } {
  let low=0,high=rows.length-1;
  while(high-low>1){const middle=(low+high)>>>1;if(rows[middle]!.time<=time)low=middle;else high=middle;}
  const a=rows[low]!,b=rows[high]!;const t=Math.max(0,Math.min(1,(time-a.time)/(b.time-a.time)));
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
  return sweptContact(attack,origin,facing,target,time,previousTime,blocked)!==null;
}
export function sweptContact(attack:AttackDefinition,origin:Position,facing:number,target:Position,time:number,previousTime:number,blocked?:(a:Position,b:Position)=>boolean,hurtRadius=.3,previousTarget=target):Position|null {
  if(!attack.contact)return null;
  const from=Math.max(attack.active[0],previousTime),to=Math.min(attack.active[1],time);
  if(to<from||time<attack.active[0]||previousTime>=attack.active[1])return null;
  for(let i=0;i<=4;i++) {
    const sampleTime=from+(to-from)*i/4;
    const pose=sampleWeaponContact(attack.contact,sampleTime),base=world(pose.base,origin,facing),tip=world(pose.tip,origin,facing);
    const fraction=time>previousTime?Math.max(0,Math.min(1,(sampleTime-previousTime)/(time-previousTime))):1;
    const recipient={x:previousTarget.x+(target.x-previousTarget.x)*fraction,y:previousTarget.y+(target.y-previousTarget.y)*fraction,z:previousTarget.z+(target.z-previousTarget.z)*fraction};
    if(!overlaps(base,tip,recipient,attack.radius+hurtRadius))continue;
    const chest={x:origin.x,y:base.y,z:origin.z};
    if(!blocked?.(chest,base)&&!blocked?.(base,tip)&&!blocked?.(base,{x:recipient.x,y:base.y,z:recipient.z}))return {x:(base.x+tip.x)/2,y:(base.y+tip.y)/2,z:(base.z+tip.z)/2};
  }
  return null;
}
