import { Group, SkinnedMesh, CanvasTexture, Sprite, SpriteMaterial, TorusGeometry, Mesh, MeshBasicNodeMaterial, SRGBColorSpace, type Skeleton } from 'three/webgpu';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import type { AssetHandle } from '../assets/resource-cache';
import type { AssetManager } from '../assets/asset-manager';
import type { EncounterSimulation, EnemyState } from '../enemies/encounter-simulation';
import { PreviewActor } from './preview-actor';
import type { CombatEvent } from '../player/combat-definitions';
interface View { actor: PreviewActor; label: Sprite; texture: CanvasTexture; canvas: HTMLCanvasElement; cue: Mesh; target: Mesh; generation:number; sequence: number; key: string; critical: number; hurt: number; damage: number }
/** Imported art only; clocks and attack windows come from the CPU encounter. */
export class EnemyPresentation {
  readonly group = new Group();
  private handle: AssetHandle<GLTF>|null = null;
  private readonly views: View[]=[];
  private readonly skeletons = new Set<Skeleton>();
  private readonly cueGeometry = new TorusGeometry(.48,.025,6,32);
  private readonly cueMaterial = new MeshBasicNodeMaterial({color:0xe4b360,transparent:true,opacity:.75,depthWrite:false});
  private readonly targetMaterial=new MeshBasicNodeMaterial({color:0xa1d5c4,transparent:true,opacity:.8,depthWrite:false});
  private disposed=false;
  constructor(private readonly encounter: EncounterSimulation) {}
  async load(assets: AssetManager): Promise<void> {
    const handle=await assets.model('enemy');if(this.disposed){handle.release();throw new Error('Enemy load cancelled');}this.handle=handle;
    const d=this.encounter.definition;
    for(let i=0;i<3;i++) {
      const scene=new Group();scene.add(clone(handle.value.scene));
      scene.traverse(o=>{if(o instanceof SkinnedMesh)this.skeletons.add(o.skeleton);});
      const actor=new PreviewActor({displayName:d.displayName,clips:Object.entries(d.clips).map(([kind,name])=>({name,loop:kind==='idle'||kind==='walk'})),cameras:{'full-body':{target:[0,.9,0],position:[0,1,3.5],near:1.7,far:6},portrait:{target:[0,1.55,0],position:[0,1.55,1],near:.3,far:2},equipment:{target:[0,1,0],position:[1,1,2],near:.5,far:3}},diagnostics:{feet:['mixamorigLeftFoot','mixamorigRightFoot']}});
      actor.controlled=true;actor.attach({scene,animations:handle.value.animations});
      const canvas=document.createElement('canvas');canvas.width=384;canvas.height=128;
      const texture=new CanvasTexture(canvas);texture.colorSpace=SRGBColorSpace;
      const label=new Sprite(new SpriteMaterial({map:texture,transparent:true,depthTest:false}));label.geometry=label.geometry.clone();label.scale.set(1.8,.6,1);
      const cue=new Mesh(this.cueGeometry,this.cueMaterial);cue.rotation.x=Math.PI/2;
      const target=new Mesh(this.cueGeometry,this.targetMaterial);target.rotation.x=Math.PI/2;target.scale.setScalar(.72);
      this.group.add(actor.group,label,cue,target);this.views.push({actor,label,texture,canvas,cue,target,generation:-1,sequence:-1,key:'',critical:0,hurt:0,damage:0});
    }
    this.update(0,true);this.interpolate(1);
  }
  event(event: CombatEvent):void {
    if(event.type!=='hit')return;
    const index=this.encounter.enemies.findIndex(e=>e.id===event.target&&e.generation===event.recipient?.generation);
    const view=this.views[index];if(view){view.hurt=.22;view.critical=event.critical?1:0;view.damage=event.damage;}
  }
  update(dt:number,reduced:boolean):void {
    const selected=this.encounter.player.state.target;
    const labelled=this.encounter.enemies.find(e=>e.health>0&&e.id===selected?.id&&e.generation===selected.generation)??this.encounter.enemies.find(e=>e.action==='windup'||e.action==='active')??this.encounter.enemies.find(e=>e.health>0)??this.encounter.enemies[0];
    for(let i=0;i<this.views.length;i++){
      const view=this.views[i]!,e=this.encounter.enemies[i];view.actor.group.visible=!!e;view.label.visible=!!e&&(this.encounter.kind==='single'||e===labelled);view.cue.visible=false;view.target.visible=false;if(!e)continue;
      if(view.generation!==e.generation){view.generation=e.generation;view.sequence=-1;view.key='';view.hurt=0;view.critical=0;view.damage=0;}
      const focus=this.encounter.player.state.target;view.target.visible=e.health>0&&focus?.id===e.id&&focus.generation===e.generation;
      const d=this.encounter.definition;
      const attacking=['windup','active','recovery'].includes(e.action);
      const moving=Math.hypot(e.position.x-e.previous.x,e.position.z-e.previous.z)>.0001;
      const name=attacking?d.clips.attack:e.action==='dead'?d.clips.death:e.action==='stagger'?d.clips.stagger:['approach','return'].includes(e.action)&&moving?d.clips.walk:d.clips.idle;
      if(view.actor.clip.kind!=='clip'||view.actor.clip.name!==name||(!attacking&&view.sequence!==e.sequence))view.actor.selectClip({kind:'clip',name});
      view.sequence=e.sequence;
      if(attacking){
        view.actor.playbackRate(0);view.actor.update(dt);
        const duration=view.actor.duration(name),contact=d.attack.clipContact??[.4,.55];
        const t=e.action==='windup'?e.actionTime/.65*contact[0]:e.action==='active'?contact[0]+e.actionTime/.12*(contact[1]-contact[0]):contact[1]+e.actionTime/.9*(1-contact[1]);
        view.actor.seek(Math.min(1,t)*duration);
      } else {view.actor.playbackRate(e.action==='stagger'?view.actor.duration(name)/2:['approach','return'].includes(e.action)?d.speed/d.walkCycleSpeed:1);view.actor.update(dt);}
      view.critical=Math.max(0,view.critical-dt);
      view.hurt=Math.max(0,view.hurt-dt);view.actor.group.rotation.z=reduced?0:Math.sin(view.hurt/.22*Math.PI)*.045;
      const status=view.critical>0?`CRITICAL · ${view.damage}`:e.action==='dead'?'DEFEATED':e.action==='stagger'?'EXPOSED · HEAVY':view.hurt>0?`HIT · ${view.damage}`:e.action==='windup'?'STRIKE INCOMING':e.label.toUpperCase();
      const key=`${status}/${e.health}/${e.posture}`;
      if(view.key!==key){const ctx=view.canvas.getContext('2d');if(ctx){ctx.clearRect(0,0,384,128);ctx.fillStyle='#102128e8';ctx.fillRect(0,0,384,128);ctx.fillStyle=e.action==='stagger'?'#f0c375':'#e8d4a7';ctx.font='24px Arial';ctx.textAlign='center';ctx.fillText(status,192,30);ctx.fillStyle='#283b3e';ctx.fillRect(16,46,352,18);ctx.fillRect(16,76,352,12);ctx.fillStyle='#a7b79a';ctx.fillRect(16,46,352*e.health/e.maxHealth,18);ctx.fillStyle='#d1a559';ctx.fillRect(16,76,352*e.posture/100,12);ctx.fillStyle='#d0d9cf';ctx.font='20px Arial';ctx.fillText(`HP ${e.health}/${e.maxHealth} · POSTURE ${e.posture}`,192,116);view.texture.needsUpdate=true;}view.key=key;}
      view.cue.visible=e.action==='windup';view.cue.scale.setScalar(reduced?1:1+e.actionTime*.25);
    }
  }
  interpolate(alpha:number):void {
    for(let i=0;i<this.views.length;i++){const e=this.encounter.enemies[i],v=this.views[i]!;if(!e)continue;this.position(v,e,alpha);}
  }
  private position(v:View,e:EnemyState,alpha:number):void {
    const x=e.previous.x+(e.position.x-e.previous.x)*alpha,z=e.previous.z+(e.position.z-e.previous.z)*alpha;
    v.actor.group.position.set(x,e.position.y,z);v.actor.group.rotation.y=e.facing;
    v.label.position.set(x,e.position.y+2.55,z);v.cue.position.set(x,e.position.y+.03,z);v.target.position.set(x,e.position.y+.025,z);
  }
  get ownedResources():number{return this.views.length*4+this.skeletons.size+3;}
  dispose():void {
    if(this.disposed)return;this.disposed=true;
    for(const v of this.views){v.actor.dispose();v.label.geometry.dispose();v.label.material.dispose();v.texture.dispose();}
    for(const s of this.skeletons)s.dispose();this.skeletons.clear();this.views.length=0;
    this.cueGeometry.dispose();this.cueMaterial.dispose();this.targetMaterial.dispose();this.group.clear();this.handle?.release();this.handle=null;
  }
}
