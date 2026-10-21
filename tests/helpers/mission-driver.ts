import { expect,type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { projectGround } from './scene-menu';
import { walkTo, observedPosition } from './district-driver';
import { discPathBlocked, type CollisionBox } from '../../src/player/collision-math';

interface Enemy {x:number;z:number;health:number;action:string;actionTime:number}
const solids=(JSON.parse(readFileSync(new URL('../../src/world/district-layout.json',import.meta.url),'utf8')) as (CollisionBox&{kind:string})[]).filter(box=>box.kind!=='cutaway');
/** Choose an authored clear escape lane instead of dodging into cargo. */
function escapeDirection(p:readonly number[],enemy:Enemy):{x:number;z:number}{
  const dx=p[0]!-enemy.x,dz=p[2]!-enemy.z,length=Math.hypot(dx,dz)||1;
  const candidates=[{x:dx/length,z:dz/length},{x:-dz/length,z:dx/length},{x:dz/length,z:-dx/length}];
  const from={x:p[0]!,y:.035,z:p[2]!};
  return candidates.map(direction=>{let clearance=0;for(let d=.25;d<=3;d+=.25){const to={x:from.x+direction.x*d,y:from.y,z:from.z+direction.z*d};if(Math.abs(to.x)>7.7||to.z<17.2||to.z>30.8||discPathBlocked(from,to,solids))break;clearance=d;}return {direction,clearance};}).sort((a,b)=>b.clearance-a.clearance)[0]!.direction;
}
/** Real desktop or touch controls; observations never alter game state. */
export async function winMissionFight(page:Page,touch=false):Promise<void>{
  const keys=new Set<string>();const session=touch?await page.context().newCDPSession(page):null;
  const stick=touch?(await page.locator('#movement-stick').boundingBox())!:null;
  const center=stick?{x:stick.x+stick.width/2,y:stick.y+stick.height/2}:null;
  let touching=false;
  const stop=async()=>{for(const key of keys)await page.keyboard.up(key);keys.clear();if(session&&touching){await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});touching=false;}};
  const move=async(dx:number,dz:number)=>{
    const x=dx-dz,y=dx+dz,l=Math.hypot(x,y);
    if(session&&center&&stick){if(!touching){await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...center,id:0}]});touching=true;}await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:center.x+x/l*stick.width*.4,y:center.y+y/l*stick.height*.4,id:0}]});}
    else{const threshold=Math.max(Math.abs(x),Math.abs(y))*.35,wanted=[...(Math.abs(x)>threshold?[x>0?'d':'a']:[]),...(Math.abs(y)>threshold?[y>0?'s':'w']:[])];for(const key of keys)if(!wanted.includes(key)){await page.keyboard.up(key);keys.delete(key);}for(const key of wanted)if(!keys.has(key)){await page.keyboard.down(key);keys.add(key);}}
  };
  let won=false,lastWardAt=-Infinity;
  const trace:unknown[]=[];
  try{
    for(let i=0;i<1800;i++){
      const s=await page.evaluate(()=>{const c=document.querySelector('canvas')!;return {p:c.dataset.playerPosition!.split(',').map(Number),enemies:JSON.parse(c.dataset.enemyRoster!) as Enemy[],action:c.dataset.playerAction!,health:document.querySelector<HTMLProgressElement>('#health')!.value,pressure:document.querySelector<HTMLProgressElement>('#pressure')!.value,hits:c.dataset.combatHits,blocks:c.dataset.combatBlocks,strikes:c.dataset.combatStrikes};});
      trace.push(s);if(trace.length>24)trace.shift();
      expect(s.health,`Medic must survive the mission fight: ${JSON.stringify(trace)}`).toBeGreaterThan(0);
      const living=s.enemies.filter(e=>e.health>0);if(!living.length){won=true;break;}
      const distance=(e:Enemy)=>Math.hypot(e.x-s.p[0]!,e.z-s.p[2]!);
      const enemy=[...living].sort((a,b)=>Number(b.action==='stagger')-Number(a.action==='stagger')||distance(a)-distance(b))[0]!;
      const free=['idle','walk','run'].includes(s.action);
      const threat=living.find(e=>e.action==='windup'&&distance(e)<1.3);
      if(free&&threat&&s.pressure<25&&threat.actionTime>.35){
        const {x:dx,z:dz}=escapeDirection(s.p,threat);await move(dx,dz);
        if(session&&center&&stick){const b=(await page.locator('#dodge').boundingBox())!,x=dx-dz,y=dx+dz,l=Math.hypot(x,y);await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:center.x+x/l*stick.width*.4,y:center.y+y/l*stick.height*.4,id:0},{x:b.x+b.width/2,y:b.y+b.height/2,id:1}]});await page.waitForTimeout(100);}
        else await page.keyboard.press('Space');
      }
      else if(free&&threat&&s.pressure>=25&&Date.now()-lastWardAt>800){await stop();if(touch)await page.locator('#ward').tap();else await page.keyboard.press('q');lastWardAt=Date.now();}
      else if(free&&distance(enemy)>.8){
        await move(enemy.x-s.p[0]!,enemy.z-s.p[2]!);
      }else{
        await stop();
        // A heavy has committed windup: punish the attack slot's recovery rather
        // than initiating into an approaching enemy's fresh windup.
        // Stagger releases the shared attack slot. Another nearby guard can
        // immediately wind up, so the opening alone is not a safe heavy.
        const isolatedOpening=['stagger','return'].includes(enemy.action)&&living.every(e=>e===enemy||distance(e)>2.2||['stagger','return'].includes(e.action));
        const safeWindow=living.some(e=>e.action==='recovery'&&e.actionTime<.42)||isolatedOpening;
        if(free&&safeWindow&&!living.some(e=>['windup','active'].includes(e.action)&&distance(e)<1.3)){
          if(touch)await page.locator('#heavy').tap();else{const p=await projectGround(page,{x:enemy.x,y:s.p[1]!,z:enemy.z});await page.mouse.click(p.x,p.y,{button:'right'});}
        }
      }
      await page.waitForTimeout(70);
    }
  }finally{await stop();await session?.detach();}
  expect(won,`Mission fight timed out: ${JSON.stringify(trace)}`).toBe(true);
}

/** Route around the crane plinth and west canopy pier after combat dispersal. */
export async function walkToMissionWinch(page:Page,touch=false):Promise<void>{
  const p=await observedPosition(page);
  if(p.x>3.5){const z=p.z>=24.4?27:22.5;await walkTo(page,{x:p.x,z},touch);await walkTo(page,{x:3,z},touch);}
  else if(p.x<-3.2){const z=p.z>=24.9?27:22.8;await walkTo(page,{x:p.x,z},touch);await walkTo(page,{x:3,z},touch);}
  await walkTo(page,{x:3,z:24.4},touch);
}

export async function playMissionRoute(page:Page):Promise<void>{
  if(await page.locator('#app').getAttribute('data-mission')==='prepare'){await page.keyboard.press('f');await expect(page.locator('#app')).toHaveAttribute('data-mission','quay');}
  await walkTo(page,{x:0,z:6.8});await expect(page.locator('#app')).toHaveAttribute('data-district','ready');await walkTo(page,{x:0,z:17.9});
  await winMissionFight(page);await expect(page.locator('#app')).toHaveAttribute('data-mission','regulator');
  await walkTo(page,{x:-2,z:22.8});await walkTo(page,{x:-5,z:22.8});await expect.poll(()=>page.locator('#pressure').evaluate((p:HTMLProgressElement)=>p.value),{timeout:30000}).toBe(100);
  await page.keyboard.press('f');await expect(page.locator('#app')).toHaveAttribute('data-mission','winch-approach');await walkTo(page,{x:-1.2,z:23.5});await expect(page.locator('#app')).toHaveAttribute('data-mission','winch-fight');await winMissionFight(page);
  await expect(page.locator('#app')).toHaveAttribute('data-mission','install');await walkToMissionWinch(page);await page.keyboard.press('f');await expect(page.locator('#app')).toHaveAttribute('data-mission','board');
  await walkTo(page,{x:0,z:28});await walkTo(page,{x:0,z:30});await page.keyboard.press('f');await expect(page.locator('#app')).toHaveAttribute('data-mission','complete');
}
