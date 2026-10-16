import { Group, Mesh, BoxGeometry, CylinderGeometry, RingGeometry, MeshStandardNodeMaterial, MeshBasicNodeMaterial, Sprite, SpriteMaterial, CanvasTexture, type Material } from 'three/webgpu';
import { MISSION_POINTS, type FirstMission } from '../mission/first-mission';

/** Original small mission props; all geometry/materials have this scene owner. */
export class MissionPresentation {
  readonly group=new Group();
  private readonly quay=new Group();
  private readonly ferry=new Group();
  private readonly winch=new Group();
  private readonly needle=new Group();
  private readonly wake=new Group();
  private readonly labelTexture=new CanvasTexture(document.createElement('canvas'));
  private readonly labelMaterial=new SpriteMaterial({map:this.labelTexture,transparent:true,depthTest:false});
  private readonly label=new Sprite(this.labelMaterial);
  private labelText='';
  private readonly labelGeometry=this.label.geometry.clone();
  private readonly ramp=new Group();
  private readonly regulator=new Group();
  private readonly drum=new Group();
  private readonly box=new BoxGeometry(1,1,1);
  private readonly cylinder=new CylinderGeometry(1,1,1,16);
  private readonly ring=new RingGeometry(.48,.55,40);
  private readonly steel=new MeshStandardNodeMaterial({color:0x425353,metalness:.75,roughness:.62});
  private readonly brass=new MeshStandardNodeMaterial({color:0x9b8050,metalness:.72,roughness:.5});
  private readonly dark=new MeshStandardNodeMaterial({color:0x172c31,metalness:.5,roughness:.7});
  private readonly wood=new MeshStandardNodeMaterial({color:0x615540,roughness:.9});
  private readonly amber=new MeshBasicNodeMaterial({color:0xf6c36b,toneMapped:false});
  private readonly wakeMaterial=new MeshBasicNodeMaterial({color:0x9abbae,transparent:true,opacity:.14,depthWrite:false});
  private readonly lamp=new MeshBasicNodeMaterial({color:0x917c4a,toneMapped:false});
  private readonly marker=new Mesh(this.ring,this.amber);
  private disposed=false;
  constructor(private readonly mission:FirstMission){
    const box=(parent:Group,x:number,y:number,z:number,sx:number,sy:number,sz:number,material:Material)=>{
      const mesh=new Mesh(this.box,material);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
    };
    this.group.add(this.quay);this.quay.add(this.regulator,this.ramp,this.winch,this.marker,this.ferry,this.wake,this.label);this.winch.add(this.drum,this.needle);
    this.label.geometry=this.labelGeometry;this.label.scale.set(2.8,.4,1);this.label.renderOrder=8;
    const r=MISSION_POINTS.regulator,w=MISSION_POINTS.winch;
    // Open service case and brass pressure cartridge under the existing canopy.
    box(this.quay,r.x,.25,r.z-.55,.9,.45,.6,this.dark);
    box(this.quay,r.x,.49,r.z-.83,.9,.5,.05,this.steel);
    this.regulator.position.set(r.x,.63,r.z-.55);
    const canister=new Mesh(this.cylinder,this.brass);canister.scale.set(.14,.38,.14);this.regulator.add(canister);
    for(const y of [-.15,.15])box(this.regulator,0,y,0,.35,.05,.32,this.steel);
    box(this.regulator,0,.27,0,.08,.16,.08,this.brass);
    box(this.regulator,0,.35,0,.27,.045,.12,this.amber);
    // Mount equipment on the existing collidable crane plinth. The interaction
    // point remains on clear ground beside it, outside the machinery.
    box(this.winch,w.x+1.1,1.12,w.z,.42,.64,.42,this.steel);
    const face=box(this.winch,w.x+1.1,1.5,w.z,.45,.1,.42,this.brass);face.rotation.x=.18;
    box(this.winch,w.x+1.1,1.57,w.z-.06,.12,.04,.17,this.lamp);
    this.drum.position.set(w.x+1.8,1.1,w.z+.6);
    const spool=new Mesh(this.cylinder,this.dark);spool.rotation.z=Math.PI/2;spool.scale.set(.27,.7,.27);this.drum.add(spool);
    for(const x of [-.37,.37]){const flange=new Mesh(this.cylinder,this.brass);flange.rotation.z=Math.PI/2;flange.position.x=x;flange.scale.set(.37,.06,.37);this.drum.add(flange);}
    box(this.drum,0,.24,0,.65,.06,.09,this.brass);
    // A non-traversable ferry backdrop beyond the existing harbour boundary.
    box(this.ferry,0,-.17,33.1,3.9,.7,3.2,this.dark);
    for(let x=-1.6;x<=1.6;x+=.4)box(this.ferry,x,.2,33.1,.37,.1,2.85,this.wood);
    box(this.ferry,0,1.05,34,.95,1.6,.9,this.steel);
    box(this.ferry,0,1.25,33.52,.65,.45,.04,this.lamp);
    for(const x of [-1.75,1.75]){
      box(this.ferry,x,.9,33.1,.06,.06,2.8,this.brass);
      for(const z of [31.8,33,34.4])box(this.ferry,x,.55,z,.07,.9,.07,this.steel);
    }
    // Gauge and keyed socket have distinct construction even without the marker.
    const gauge=new Mesh(this.cylinder,this.brass);gauge.rotation.x=Math.PI/2;gauge.position.set(w.x+1.1,1.9,w.z+.23);gauge.scale.set(.25,.06,.25);this.winch.add(gauge);
    this.needle.position.set(w.x+1.1,1.9,w.z+.27);box(this.needle,0,.08,0,.025,.17,.025,this.amber);
    box(this.winch,w.x+1.1,1.15,w.z+.24,.23,.3,.07,this.dark);
    for(const x of [-.14,.14])box(this.winch,w.x+1.1+x,1.15,w.z+.28,.035,.34,.04,this.lamp);
    for(const x of [-1,1]){const mesh=new Mesh(this.ring,this.wakeMaterial);mesh.rotation.x=-Math.PI/2;mesh.position.set(x,-.38,32);mesh.scale.set(1,3,1);this.wake.add(mesh);}
    this.ramp.position.set(0,.1,29);
    box(this.ramp,0,0,1.4,1.8,.1,2.8,this.steel);
    for(let z=.15;z<2.8;z+=.25)box(this.ramp,0,.07,z,1.7,.025,.045,this.brass);
    for(const x of [-.93,.93])box(this.ramp,x,.08,1.4,.08,.15,2.8,this.brass);
    // Amber trail continues the authored south-passage sign, without a screen arrow.
    for(const z of [7,11,15]){
      const a=box(this.group,-.12,.075,z,.06,.02,.4,this.brass);a.rotation.y=-.55;
      const b=box(this.group,.12,.075,z,.06,.02,.4,this.brass);b.rotation.y=.55;
    }
    this.marker.rotation.x=-Math.PI/2;this.update(false);
  }
  update(quayReady:boolean):void {
    this.group.visible=this.mission.active;this.quay.visible=quayReady;
    this.regulator.visible=['introduction','prepare','quay','passage-fight','regulator'].includes(this.mission.stage);
    const target=this.mission.target;this.marker.visible=!!target;
    this.label.visible=!!target;
    if(target){
      this.marker.position.set(target.x,.1,target.z);this.label.position.set(target.x,1.55,target.z);
      const text=this.mission.stage==='regulator'?'REGULATOR · SAFE BAY':this.mission.stage==='board'?'BOARD FERRY':'WINCH SOCKET';
      if(text!==this.labelText){
        this.labelText=text;const canvas=this.labelTexture.image as HTMLCanvasElement;canvas.width=512;canvas.height=72;
        const ctx=canvas.getContext('2d');if(ctx){ctx.fillStyle='#102329e8';ctx.fillRect(0,0,512,72);ctx.fillStyle=this.mission.stage==='board'?'#9ae0c7':'#f6c36b';ctx.font='bold 25px Arial';ctx.textAlign='center';ctx.fillText(text,256,46);this.labelTexture.needsUpdate=true;}
      }
    }
    this.ramp.rotation.x=-(1-this.mission.ramp)*Math.PI/2;
    this.drum.rotation.x=Math.max(0,this.mission.powerTime-2)*2.5;
    this.needle.rotation.z=.9-Math.min(1,this.mission.powerTime/3)*1.8;
    const departure=this.mission.departureProgress,travel=Math.max(0,(departure-.3)/.7);
    this.ferry.position.z=travel*8;this.wake.visible=travel>0&&departure<1;this.wake.scale.set(1+travel*.8,1,1);this.wake.position.z=travel*5;
    this.marker.material.color.setHex(this.mission.stage==='board'?0x9ae0c7:0xf6c36b);
    this.lamp.color.setHex(this.mission.powerTime>=6?0x9ae0c7:this.mission.powerTime>0?0xf6c36b:0x917c4a);
  }
  get ownedResources():number{return 13;}
  dispose():void{if(this.disposed)return;this.disposed=true;this.group.removeFromParent();this.group.clear();this.labelGeometry.dispose();this.labelTexture.dispose();this.labelMaterial.dispose();this.box.dispose();this.cylinder.dispose();this.ring.dispose();for(const material of [this.steel,this.brass,this.dark,this.wood,this.amber,this.lamp,this.wakeMaterial])material.dispose();}
}
