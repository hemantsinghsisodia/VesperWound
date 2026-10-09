import { Group, Mesh, CircleGeometry, MeshStandardNodeMaterial, Vector3, type AnimationClip, type Object3D } from 'three/webgpu';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import type { PreviewActor } from './preview-actor';
import { BATON_PICKUP } from '../player/weapon-definitions';
import grip from './baton-grip.json';
/** Shared asset handle owns model GPU resources; this view owns marker and clones. */
export class BatonPresentation {
  readonly ground=new Group();
  private readonly marker=new Mesh(new CircleGeometry(.38,32),new MeshStandardNodeMaterial({color:0xa3b9b0,emissive:0x294b43,roughness:.8,transparent:true,opacity:.38,depthWrite:false}));
  private readonly held:Group;
  private readonly hand:Object3D;
  private disposed=false;
  constructor(private readonly actor:PreviewActor,model:GLTF,private readonly studio=false) {
    const hand=actor.group.getObjectByName(grip.bone);if(!hand)throw new Error('Medic is missing the baton hand');this.hand=hand;
    this.held=model.scene.clone(true);this.hand.add(this.held);
    this.held.position.fromArray(grip.position);this.held.quaternion.fromArray(grip.quaternion);
    const copy=model.scene.clone(true);copy.rotation.z=Math.PI/2;copy.position.y=.055;this.ground.add(copy);
    this.marker.rotation.x=-Math.PI/2;this.marker.position.y=.003;this.ground.add(this.marker);
    this.ground.position.set(BATON_PICKUP.x,BATON_PICKUP.y,BATON_PICKUP.z);this.update(false);
    for(const root of [copy,this.held])root.traverse(o=>{if(o instanceof Mesh){o.castShadow=true;o.receiveShadow=true;}});
  }
  equip(clips:readonly AnimationClip[]):void {this.actor.addClips(clips,'Baton_Idle');this.update(true);}
  get equipped():boolean {return this.held.visible;}
  update(equipped:boolean):void {this.held.visible=equipped;this.ground.visible=!equipped&&!this.studio;}
  inspection():number[] {this.held.updateWorldMatrix(true,true);return this.held.localToWorld(new Vector3(0,.12,0)).toArray();}
  diagnostics():{base:number[];tip:number[];grip:number} {this.held.updateWorldMatrix(true,true);return {base:this.held.localToWorld(new Vector3(0,.025,0)).toArray(),tip:this.held.localToWorld(new Vector3(0,.423,0)).toArray(),grip:this.held.getWorldPosition(new Vector3()).distanceTo(this.hand.getWorldPosition(new Vector3()))};}
  dispose():void {if(this.disposed)return;this.disposed=true;this.held.removeFromParent();this.ground.removeFromParent();this.ground.clear();this.marker.geometry.dispose();this.marker.material.dispose();}
}
