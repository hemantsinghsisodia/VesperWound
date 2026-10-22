import { Group, SkinnedMesh, TorusGeometry, RingGeometry, Mesh, MeshBasicNodeMaterial, Vector3, type Skeleton } from 'three/webgpu';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import type { AssetHandle } from '../assets/resource-cache';
import type { AssetManager } from '../assets/asset-manager';
import type { EncounterSimulation, EnemyState } from '../enemies/encounter-simulation';
import { PreviewActor } from './preview-actor';
import type { CombatEvent } from '../player/combat-definitions';
import type { WorldLabel, WorldLabels } from './world-labels';
import { enemyClipTime, ENEMY_MOTION } from '../enemies/enemy-attack';
interface View { actor: PreviewActor; label: WorldLabel; cue: Mesh; target: Mesh; generation:number; sequence: number; instance:number; fadeDelta:number; sampledElapsed:number; critical: number; hurt: number; damage: number }
/** Imported art only; clocks and attack windows come from the CPU encounter. */
export class EnemyPresentation {
  readonly group = new Group();
  private handle: AssetHandle<GLTF>|null = null;
  private readonly views: View[]=[];
  private readonly skeletons = new Set<Skeleton>();
  private readonly cueGeometry = new TorusGeometry(.48,.025,6,32);
  private readonly warningGeometry = new RingGeometry(.68,.77,28,1,-Math.PI*.8,Math.PI*.6).rotateX(-Math.PI/2);
  private readonly cueMaterial = new MeshBasicNodeMaterial({color:0xe4b360,transparent:true,opacity:.75,depthWrite:false});
  private readonly targetMaterial=new MeshBasicNodeMaterial({color:0xa1d5c4,transparent:true,opacity:.8,depthWrite:false});
  private disposed=false;
  constructor(private readonly encounter: EncounterSimulation, private readonly labels: WorldLabels) {}
  async load(assets: AssetManager): Promise<void> {
    const handle=await assets.model('enemy');if(this.disposed){handle.release();throw new Error('Enemy load cancelled');}this.handle=handle;
    const d=this.encounter.definition;
    for(let i=0;i<3;i++) {
      const scene=new Group();scene.add(clone(handle.value.scene));
      scene.traverse(o=>{if(o instanceof SkinnedMesh)this.skeletons.add(o.skeleton);});
      const actor=new PreviewActor({displayName:d.displayName,clips:Object.entries(d.clips).map(([kind,name])=>({name,loop:kind==='idle'||kind==='walk'})),cameras:{'full-body':{target:[0,.9,0],position:[0,1,3.5],near:1.7,far:6},portrait:{target:[0,1.55,0],position:[0,1.55,1],near:.3,far:2},equipment:{target:[0,1,0],position:[1,1,2],near:.5,far:3}},diagnostics:{feet:['mixamorigLeftFoot','mixamorigRightFoot']}});
      actor.controlled=true;actor.attach({scene,animations:handle.value.animations});
      const label=this.labels.create('enemy');
      const cue=new Mesh(this.warningGeometry,this.cueMaterial);
      const target=new Mesh(this.cueGeometry,this.targetMaterial);target.rotation.x=Math.PI/2;target.scale.setScalar(.72);
      this.group.add(actor.group,label,cue,target);this.views.push({actor,label,cue,target,generation:-1,sequence:-1,instance:-1,fadeDelta:0,sampledElapsed:0,critical:0,hurt:0,damage:0});
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
      if(view.generation!==e.generation){view.generation=e.generation;view.sequence=-1;view.instance=-1;view.fadeDelta=0;view.hurt=0;view.critical=0;view.damage=0;}
      const focus=this.encounter.player.state.target;view.target.visible=e.health>0&&focus?.id===e.id&&focus.generation===e.generation;
      const d=this.encounter.definition;
      const attacking=['windup','active','recovery'].includes(e.action);
      const moving=Math.hypot(e.position.x-e.previous.x,e.position.z-e.previous.z)>.0001;
      const name=attacking?d.clips.attack:e.action==='dead'?d.clips.death:e.action==='stagger'?d.clips.stagger:['approach','return'].includes(e.action)&&moving?d.clips.walk:d.clips.idle;
      if(view.actor.clip.kind!=='clip'||view.actor.clip.name!==name||(attacking?view.instance!==e.attackInstance:view.sequence!==e.sequence))view.actor.selectClip({kind:'clip',name},attacking?.08:.18);
      view.instance=e.attackInstance;
      view.sequence=e.sequence;
      if(attacking)view.fadeDelta+=dt;
      else {view.fadeDelta=0;view.actor.releaseControlled();view.actor.playbackRate(e.action==='stagger'?view.actor.duration(name)/2:['approach','return'].includes(e.action)?d.speed/d.walkCycleSpeed:1);view.actor.update(dt);}
      view.critical=Math.max(0,view.critical-dt);
      view.hurt=Math.max(0,view.hurt-dt);view.actor.group.rotation.z=reduced||attacking?0:Math.sin(view.hurt/.22*Math.PI)*.045;
      const status=view.critical>0?`CRITICAL · ${view.damage}`:e.action==='dead'?'DEFEATED':e.action==='stagger'?'EXPOSED · HEAVY':view.hurt>0?`HIT · ${view.damage}`:e.action==='windup'?'STRIKE INCOMING':'RESTLESS';
      view.label.combat(status,e.health,e.maxHealth,e.posture,e.action==='stagger'?'amber':'normal');
      view.cue.visible=e.action==='windup'||e.action==='active';
      const locked=e.attackElapsed>=d.attack.active[0]-ENEMY_MOTION.directionLock;
      view.cue.scale.setScalar(reduced||locked?1:.92+.08*e.attackElapsed/(d.attack.active[0]-ENEMY_MOTION.directionLock));
    }
  }
  interpolate(alpha:number):void {
    for(let i=0;i<this.views.length;i++){const e=this.encounter.enemies[i],v=this.views[i]!;if(!e)continue;this.position(v,e,alpha);
      if(['windup','active','recovery'].includes(e.action)){
        v.sampledElapsed=Math.min(this.encounter.definition.attack.duration,e.attackElapsed+Math.max(0,Math.min(1,alpha))/60);
        v.actor.sampleControlled(enemyClipTime(v.sampledElapsed),v.fadeDelta);v.fadeDelta=0;
      }
    }
  }
  private position(v:View,e:EnemyState,alpha:number):void {
    const x=e.previous.x+(e.position.x-e.previous.x)*alpha,z=e.previous.z+(e.position.z-e.previous.z)*alpha;
    v.actor.group.position.set(x,e.position.y,z);v.actor.group.rotation.y=e.facing;
    v.cue.rotation.y=e.facing;
    v.label.position.set(x,e.position.y+2.55,z);v.cue.position.set(x,e.position.y+.03,z);v.target.position.set(x,e.position.y+.025,z);
  }
  diagnostics():Array<{id:string;generation:number;instance:number;time:number;base:number[];tip:number[]}> {
    return this.views.flatMap((view,i)=>{
      const e=this.encounter.enemies[i];if(!e)return [];
      view.actor.group.updateMatrixWorld(true);
      const base=view.actor.group.getObjectByName(ENEMY_MOTION.bone),tip=view.actor.group.getObjectByName(ENEMY_MOTION.tipBone);
      return base&&tip?[{id:e.id,generation:e.generation,instance:e.attackInstance,time:view.sampledElapsed,base:base.getWorldPosition(new Vector3()).toArray(),tip:tip.getWorldPosition(new Vector3()).toArray()}]:[];
    });
  }
  get ownedResources():number{return this.views.length+this.skeletons.size+4;}
  dispose():void {
    if(this.disposed)return;this.disposed=true;
    for(const v of this.views){v.actor.dispose();v.label.dispose();}
    for(const s of this.skeletons)s.dispose();this.skeletons.clear();this.views.length=0;
    this.cueGeometry.dispose();this.warningGeometry.dispose();this.cueMaterial.dispose();this.targetMaterial.dispose();this.group.clear();this.handle?.release();this.handle=null;
  }
}
