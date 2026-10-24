import { BoxGeometry, CylinderGeometry, Group, Mesh, MeshStandardNodeMaterial, type Material, type BufferGeometry } from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CHECKPOINTS, POINTS, PORTALS, SECTORS, hoistCargo, portalBox, type SectorId } from './definition';
import type { CollisionBox } from '../player/collision-math';
import type { ArtVariant } from '../world/presentation';
import type { WorldLabel, WorldLabels } from '../world/world-labels';
import type { ChapterSimulation } from './simulation';
import { SectorLoader, type SectorLease } from './sector-loader';
interface SectorPayload {version:1;id:SectorId;boxes:CollisionBox[]}
export class ChapterPresentation {
  readonly group=new Group();
  private readonly loader:SectorLoader<Group>;
  private readonly leases=new Map<SectorId,SectorLease<Group>>();
  readonly ready=new Set<SectorId>();
  readonly errors=new Map<SectorId,string>();
  private readonly geometry=new BoxGeometry(1,1,1);
  private readonly markerGeometry=new CylinderGeometry(.45,.45,.05,16);
  private readonly amber=new MeshStandardNodeMaterial({color:0xc8a15f,emissive:0x65421c,roughness:.6});
  private readonly mint=new MeshStandardNodeMaterial({color:0x93c8b1,emissive:0x244b3b,roughness:.6});
  private readonly cargo=new Mesh(this.geometry,new MeshStandardNodeMaterial({color:0x705946}));
  private readonly gates=new Map<string,Mesh>();
  private readonly label:WorldLabel;
  private readonly props=new Map<string,Mesh>();
  private readonly names:WorldLabel[]=[];
  private readonly interactionLabel:WorldLabel;
  private readonly rail=new Group();
  private disposed=false;
  constructor(readonly chapter:ChapterSimulation,readonly variant:ArtVariant,labels:WorldLabels){
    this.label=labels.create('mission');this.group.add(this.label,this.cargo);
    this.interactionLabel=labels.create('mission');this.group.add(this.interactionLabel,this.rail);
    for(let i=0;i<3;i++){const track=new Mesh(this.geometry,this.amber);track.position.set(40,.025,35-i*2);track.scale.set(3.5,.025,.08);this.rail.add(track);const label=labels.create('mission');label.text(['I · access blocked','II · transit','III · access clear'][i]!);label.position.set(42,.15,35-i*2);this.rail.add(label);this.names.push(label);}
    for(const p of PORTALS){const gate=new Mesh(this.geometry,this.amber);this.applyBox(gate,portalBox(p));this.gates.set(p.id,gate);this.group.add(gate);}
    for(const [id,p] of [...Object.entries(POINTS),...Object.entries(CHECKPOINTS).map(([k,c])=>[`checkpoint:${k}`,c.position] as const)]){
      const mesh=new Mesh(this.markerGeometry,id.startsWith('checkpoint')?this.mint:this.amber);mesh.position.set(p.x,.04,p.z);this.group.add(mesh);this.props.set(id,mesh);
    }
    for(const s of SECTORS){const label=labels.create('mission');label.text(s.name);label.position.set((s.bounds.minX+s.bounds.maxX)/2,3,s.bounds.minZ+2);this.names.push(label);this.group.add(label);}
    this.loader=new SectorLoader(async(id,signal)=>{
      const response=await fetch(`/assets/chapter/${variant}/${id}.json`,{signal});if(!response.ok)throw new Error(`Could not load ${id}`);
      const payload:unknown=await response.json();if(!this.valid(payload,id))throw new Error('Invalid chapter section');
      const group=new Group(),materials:Material[]=[],geometries:BufferGeometry[]=[];
      const base=SECTORS.find(s=>s.id===id)!;
      for(const ground of [true,false]){
        const pieces=payload.boxes.filter(b=>(b.position.y<0)===ground).map(b=>{const mesh=new Mesh(this.geometry);this.applyBox(mesh,b);mesh.updateMatrix();return this.geometry.clone().applyMatrix4(mesh.matrix);});
        if(!pieces.length)continue;const merged=mergeGeometries(pieces)!;pieces.forEach(g=>g.dispose());geometries.push(merged);
        const material=new MeshStandardNodeMaterial({color:ground?base.color:0x554e43,roughness:ground?.87:.72});materials.push(material);
        const mesh=new Mesh(merged,material);mesh.castShadow=!ground;mesh.receiveShadow=true;group.add(mesh);
      }
      let disposed=false;return {value:group,dispose:()=>{if(disposed)return;disposed=true;group.removeFromParent();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
    });
  }
  private valid(p:unknown,id:SectorId):p is SectorPayload {
    if(!p||typeof p!=='object')return false;const v=p as Partial<SectorPayload>;
    return v.version===1&&v.id===id&&Array.isArray(v.boxes)&&v.boxes.length<200&&v.boxes.every(b=>b&&[b.position,b.half].every(p=>p&&[p.x,p.y,p.z].every(n=>typeof n==='number'&&Number.isFinite(n)))&&[b.half.x,b.half.y,b.half.z].every(n=>n>0&&n<80));
  }
  private applyBox(mesh:Mesh,b:CollisionBox):void{mesh.position.set(b.position.x,b.position.y,b.position.z);mesh.scale.set(b.half.x*2,b.half.y*2,b.half.z*2);}
  async prepare(id:SectorId):Promise<void>{
    if(this.ready.has(id))return;
    let lease=this.leases.get(id);if(!lease){lease=this.loader.acquire(id);this.leases.set(id,lease);}
    const expected=lease;
    try {const group=await lease.ready;if(this.disposed||this.leases.get(id)!==expected)return;this.group.add(group);this.ready.add(id);this.errors.delete(id);}
    catch(error){if(!this.disposed&&this.leases.get(id)===expected)this.errors.set(id,error instanceof Error?error.message:String(error));throw error;}
  }
  retry():void {for(const id of this.errors.keys()){this.leases.get(id)?.release();this.leases.delete(id);this.errors.delete(id);}this.update();}
  async destination(id:SectorId):Promise<void>{
    for(const [key,lease] of this.leases)if(key!==this.chapter.sector&&key!==id){lease.release();this.leases.delete(key);this.ready.delete(key);this.errors.delete(key);}
    if(this.errors.has(id)){this.leases.get(id)?.release();this.leases.delete(id);this.errors.delete(id);}
    await this.prepare(id);
  }
  update():void {
    if(this.disposed)return;
    const c=this.chapter,p=c.encounter.player.state.position;
    const portals=PORTALS.filter(q=>(q.a===c.sector||q.b===c.sector)&&(!q.shortcut||c.progress.shortcuts.includes(q.shortcut))).sort((a,b)=>Math.hypot(a.position.x-p.x,a.position.z-p.z)-Math.hypot(b.position.x-p.x,b.position.z-p.z));
    const closest=portals[0],adjacent=closest&&(closest.a===c.sector?closest.b:closest.a);
    const wanted=new Set<SectorId>([c.sector]);if(adjacent&&closest&&Math.hypot(closest.position.x-p.x,closest.position.z-p.z)<9)wanted.add(adjacent);
    for(const [id,lease] of this.leases)if(!wanted.has(id)){lease.release();this.leases.delete(id);this.ready.delete(id);this.errors.delete(id);}
    for(const id of wanted)if(!this.leases.has(id))void this.prepare(id).catch(()=>{});
    for(const q of PORTALS)this.gates.get(q.id)!.visible=!this.ready.has(q.a)||!this.ready.has(q.b)||!!q.shortcut&&!c.progress.shortcuts.includes(q.shortcut);
    this.applyBox(this.cargo,hoistCargo(c.hoistPosition));this.cargo.visible=this.ready.has('warehouse');
    for(const [id,mesh] of this.props){const position={x:mesh.position.x,y:.035,z:mesh.position.z};const visible=SECTORS.find(s=>position.x>s.bounds.minX&&position.x<s.bounds.maxX&&position.z>s.bounds.minZ&&position.z<s.bounds.maxZ);mesh.visible=!!visible&&this.ready.has(visible.id);if(id==='regulator')mesh.visible&&=!c.progress.regulator;if(id==='upgrade')mesh.visible&&=!c.progress.upgrade;if(id==='board')mesh.material=c.progress.installed?this.mint:this.amber;}
    this.rail.visible=this.ready.has('warehouse');
    this.names.slice(3).forEach((l,i)=>{l.visible=this.ready.has(SECTORS[i]!.id);});
    const interaction=c.interaction;this.interactionLabel.visible=!!interaction;if(interaction){this.interactionLabel.text(interaction.label,'mint');this.interactionLabel.position.set(interaction.position.x,2.6,interaction.position.z);}
    const objective=c.objective;this.label.text(objective.title,'amber');this.label.position.set(objective.position.x,1.8,objective.position.z);
    this.label.visible=!interaction&&Math.hypot(objective.position.x-p.x,objective.position.z-p.z)<12;
  }
  get blockers():CollisionBox[]{return [...PORTALS.filter(p=>this.gates.get(p.id)!.visible).map(portalBox),hoistCargo(this.chapter.hoistPosition)];}
  get count():number{return this.loader.count;}
  get ownedResources():number{return 5+this.loader.count*4;}
  dispose():void {if(this.disposed)return;this.disposed=true;for(const lease of this.leases.values())lease.release();this.leases.clear();this.loader.dispose();this.ready.clear();this.errors.clear();this.label.dispose();this.interactionLabel.dispose();this.names.forEach(n=>n.dispose());this.geometry.dispose();this.markerGeometry.dispose();this.amber.dispose();this.mint.dispose();(this.cargo.material as Material).dispose();this.group.removeFromParent();this.group.clear();}
}
