import {it,expect} from 'vitest';
import {readFile} from 'node:fs/promises';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'meshoptimizer';
import {BATON} from '../../src/player/weapon-definitions';
import {Quaternion} from 'three';
import type {Animation} from '@gltf-transform/core';
it('delivers bounded original geometry and a separate, valid armed animation pack',async()=>{
  const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
  const model=await io.read('public/assets/weapons/baton/baton.glb'),doc=await io.read('public/assets/weapons/baton/animations.glb'),medic=await io.read('public/assets/showcase/mobile/character.glb');
  const count=(d:typeof doc)=>d.getRoot().listMeshes().reduce((n,m)=>n+m.listPrimitives().reduce((v,p)=>v+(p.getIndices()?.getCount()??0)/3,0),0);
  expect(count(model)).toBeLessThanOrEqual(1000);expect(count(model)+count(medic)).toBeLessThanOrEqual(20000);expect(model.getRoot().listMaterials()).toHaveLength(2);expect(model.getRoot().listTextures()).toHaveLength(0);
  expect((await readFile('public/assets/weapons/baton/baton.glb')).length).toBeLessThanOrEqual(32768);expect((await readFile('public/assets/weapons/baton/animations.glb')).length).toBeLessThanOrEqual(524288);
  const expected=[...Object.values(BATON.animations),...Object.values(BATON.attacks).map(a=>a!.clip)].sort();expect(doc.getRoot().listAnimations().map(a=>a.getName()).sort()).toEqual(expected);
  const names=new Set(medic.getRoot().listSkins().flatMap(s=>s.listJoints().map(n=>n.getName())));
  for(const clip of doc.getRoot().listAnimations())for(const channel of clip.listChannels()){
    expect(names.has(channel.getTargetNode()!.getName())).toBe(true);const output=channel.getSampler()!.getOutput()!,values:number[]=[];
    if(channel.getTargetPath()==='rotation')for(let i=0;i<output.getCount();i++){output.getElement(i,values);expect(Math.hypot(...values)).toBeCloseTo(1,2);}
    else{expect(channel.getTargetNode()!.getName()).toBe('Hips');const first:number[]=[];output.getElement(0,first);for(let i=0;i<output.getCount();i++){output.getElement(i,values);expect(values[0]).toBeCloseTo(first[0]!,3);expect(values[2]).toBeCloseTo(first[2]!,3);}}
  }
});

function rotationAt(clip:Animation,bone:string,fraction:number):Quaternion{
  const sampler=clip.listChannels().find(c=>c.getTargetNode()!.getName()===bone&&c.getTargetPath()==='rotation')!.getSampler()!;
  const times=sampler.getInput()!,values=sampler.getOutput()!,startTime=times.getScalar(0),end=times.getScalar(times.getCount()-1),time=startTime+(end-startTime)*fraction;
  let next=1;while(next<times.getCount()-1&&times.getScalar(next)<time)next++;
  const previous=Math.max(0,next-1),start=times.getScalar(previous),span=times.getScalar(next)-start;
  const a=new Quaternion().fromArray(values.getElement(previous,[])).normalize(),b=new Quaternion().fromArray(values.getElement(next,[])).normalize();
  return a.slerp(b,span>0?(time-start)/span:0);
}

it('preserves the complete source gait, including the second half of each armed cycle',async()=>{
  const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
  const armed=(await io.read('public/assets/weapons/baton/animations.glb')).getRoot().listAnimations();
  const original=(await io.read('public/assets/showcase/shared/animations.glb')).getRoot().listAnimations();
  for(const [name,source] of [['Baton_Walk','Walk_Loop'],['Baton_Run','Jog_Fwd_Loop']]){
    const clip=armed.find(c=>c.getName()===name)!,reference=original.find(c=>c.getName()===source)!;
    // The walk has an integer source-frame range in both exports. The run's
    // fractional final source frame is preserved by the armed 60 Hz bake but
    // rounded by the older 24 Hz unarmed export, so compare the walk directly.
    if(name==='Baton_Walk')for(const bone of ['LeftUpLeg','LeftLeg','LeftFoot','RightUpLeg','RightLeg','RightFoot']){
      for(const fraction of [.1,.25,.5,.65,.8,.95])expect(rotationAt(clip,bone,fraction).angleTo(rotationAt(reference,bone,fraction)),`${name} ${bone} at ${fraction}`).toBeLessThan(.04);
    }
    for(const bone of ['LeftUpLeg','LeftLeg','RightUpLeg','RightLeg']){
      const first=rotationAt(clip,bone,.5);
      const excursion=Math.max(...[.6,.7,.8,.9].map(t=>first.angleTo(rotationAt(clip,bone,t))));
      expect(excursion,`${name} ${bone} must not hold the first source frame`).toBeGreaterThan(.2);
    }
  }
});

it('keeps the baked attack arm continuous without elbow or wrist flips',async()=>{
  const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
  const clips=(await io.read('public/assets/weapons/baton/animations.glb')).getRoot().listAnimations();
  for(const attack of Object.values(BATON.attacks)){
    const clip=clips.find(c=>c.getName()===attack!.clip)!,frames=Math.round(attack!.duration*60);
    for(const bone of ['RightArm','RightForeArm','RightHand']){
      let previous=rotationAt(clip,bone,0);
      for(let frame=1;frame<=frames;frame++){
        const current=rotationAt(clip,bone,frame/frames);
        expect(previous.angleTo(current),`${clip.getName()} ${bone}, frame ${frame}`).toBeLessThan(bone==='RightHand'?.5:.8);
        previous=current;
      }
    }
  }
});
