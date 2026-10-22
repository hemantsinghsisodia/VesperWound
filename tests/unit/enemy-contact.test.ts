import { it, expect } from 'vitest';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { AnimationMixer, LoopOnce, Vector3 } from 'three';
import { ENEMY_MOTION, enemyClipTime } from '../../src/enemies/enemy-attack';
import { ZOMBIE7 } from '../../src/enemies/enemy-definition';
import { sampleWeaponContact, sweptContact } from '../../src/player/weapon-contact';

it.each(['desktop','mobile'])('matches compressed %s hand poses to contact within 3 cm and retains planted feet', async tier => {
  const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
  const doc=await io.read(`public/assets/encounter/${tier}/zombie7.glb`);
  // Decode compressed tracks through the same GLTF loader, omitting materials
  // only because this Node test has no image decoder or GPU.
  for(const material of doc.getRoot().listMaterials())material.dispose();
  for(const texture of doc.getRoot().listTextures())texture.dispose();
  for(const extension of doc.getRoot().listExtensionsUsed())extension.dispose();
  const bytes=await io.writeBinary(doc);
  const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength) as ArrayBuffer,'');
  const clip=gltf.animations.find(c=>c.name==='Attack')!;
  expect(clip.duration).toBeCloseTo(ENEMY_MOTION.clipDuration,4);
  const mixer=new AnimationMixer(gltf.scene),action=mixer.clipAction(clip).setLoop(LoopOnce,1).play();action.clampWhenFinished=true;
  mixer.update(0);gltf.scene.updateMatrixWorld(true);
  const feet=['mixamorigLeftFoot','mixamorigRightFoot'].map(name=>gltf.scene.getObjectByName(name)!);
  const planted=feet.map(b=>b.getWorldPosition(new Vector3()));
  for(let time=0;time<ENEMY_MOTION.duration;time+=1/120){
    action.time=enemyClipTime(time);mixer.update(0);gltf.scene.updateMatrixWorld(true);
    feet.forEach((bone,i)=>expect(bone.getWorldPosition(new Vector3()).distanceTo(planted[i]!)).toBeLessThan(.01));
    if(time<.65||time>.77)continue;
    const sampled=sampleWeaponContact(ZOMBIE7.attack.contact!,time);
    for(const [key,name] of [['base',ENEMY_MOTION.bone],['tip',ENEMY_MOTION.tipBone]] as const){
      const p=sampled[key],actual=gltf.scene.getObjectByName(name)!.getWorldPosition(new Vector3());
      expect(actual.distanceTo(new Vector3(p.x,p.y,p.z)),`${tier} ${key} at ${time}`).toBeLessThan(.03);
    }
  }
  mixer.stopAllAction();mixer.uncacheRoot(gltf.scene);
});

it('bounds hand contact in time and space without extending reach',()=>{
  const origin={x:0,y:0,z:0},a=ZOMBIE7.attack;
  const hit=(x:number,z:number,from=.65,to=.77,blocked=false,y=0)=>sweptContact(a,origin,0,{x,y,z},to,from,()=>blocked,.28);
  expect(hit(0,.8)).not.toBeNull();expect(hit(0,1.4)).toBeNull();
  expect(hit(1,.8)).toBeNull();expect(hit(-1,.8)).toBeNull();expect(hit(0,-.8)).toBeNull();
  expect(hit(0,.8,.1,.64)).toBeNull();expect(hit(0,.8,.8,1)).toBeNull();
  expect(hit(0,.8,.65,.77,true)).toBeNull();expect(hit(0,.8,.65,.77,false,2)).toBeNull();
});
