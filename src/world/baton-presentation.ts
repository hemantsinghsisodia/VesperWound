import { Group, Mesh, RingGeometry, OctahedronGeometry, MeshBasicNodeMaterial, MeshStandardMaterial, Vector3, type Material, type AnimationClip, type Object3D } from 'three/webgpu';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import type { PreviewActor } from './preview-actor';
import { BATON_PICKUP } from '../player/weapon-definitions';
import grip from './baton-grip.json';
/** Shared asset handle owns model GPU resources; this view owns marker and clones. */
export class BatonPresentation {
  readonly ground=new Group();
  private readonly marker=new Mesh(new RingGeometry(.43,.50,48),new MeshBasicNodeMaterial({color:0xffc65c,toneMapped:false,depthWrite:false}));
  private readonly beacon=new Mesh(new OctahedronGeometry(.105),this.marker.material);
  private readonly pickupMaterials:Material[]=[];
  private readonly held:Group;
  private readonly hand:Object3D;
  private disposed=false;
  constructor(private readonly actor:PreviewActor,model:GLTF,private readonly studio=false) {
    const hand=actor.group.getObjectByName(grip.bone);if(!hand)throw new Error('Medic is missing the baton hand');this.hand=hand;
    this.held=model.scene.clone(true);this.hand.add(this.held);
    this.held.position.fromArray(grip.position);this.held.quaternion.fromArray(grip.quaternion);
    const copy=model.scene.clone(true);copy.rotation.z=Math.PI/2;copy.position.y=.055;this.ground.add(copy);
    // Only the ground copy glows: held and shared asset materials stay unchanged.
    const highlights=new Map<Material,Material>();
    copy.traverse(o=>{if(o instanceof Mesh){
      const highlight=(source:Material):Material=>{
        let material=highlights.get(source);
        if(!material){material=source.clone();if(material instanceof MeshStandardMaterial){material.emissive.setHex(0xffbd55);material.emissiveIntensity=.65;}highlights.set(source,material);this.pickupMaterials.push(material);}
        return material;
      };
      o.material=Array.isArray(o.material)?o.material.map(highlight):highlight(o.material);
    }});
    // Lift clear of the authored paving; retain depth testing against walls.
    this.marker.rotation.x=-Math.PI/2;this.marker.position.y=.065;
    this.beacon.position.y=.65;this.ground.add(this.marker,this.beacon);
    this.ground.position.set(BATON_PICKUP.x,BATON_PICKUP.y,BATON_PICKUP.z);this.update(false);
    for(const root of [copy,this.held])root.traverse(o=>{if(o instanceof Mesh){o.castShadow=true;o.receiveShadow=true;}});
  }
  equip(clips:readonly AnimationClip[]):void {this.actor.addClips(clips,'Baton_Idle');this.update(true);}
  get equipped():boolean {return this.held.visible;}
  get ownedResources():number {return 3+this.pickupMaterials.length;}
  update(equipped:boolean):void {this.held.visible=equipped;this.ground.visible=!equipped&&!this.studio;}
  inspection():number[] {this.held.updateWorldMatrix(true,true);return this.held.localToWorld(new Vector3(0,.12,0)).toArray();}
  diagnostics():{base:number[];tip:number[];grip:number} {this.held.updateWorldMatrix(true,true);return {base:this.held.localToWorld(new Vector3(0,.025,0)).toArray(),tip:this.held.localToWorld(new Vector3(0,.423,0)).toArray(),grip:this.held.getWorldPosition(new Vector3()).distanceTo(this.hand.getWorldPosition(new Vector3()))};}
  dispose():void {if(this.disposed)return;this.disposed=true;this.held.removeFromParent();this.ground.removeFromParent();this.ground.clear();this.marker.geometry.dispose();this.beacon.geometry.dispose();this.marker.material.dispose();for(const material of this.pickupMaterials)material.dispose();this.pickupMaterials.length=0;}
}
