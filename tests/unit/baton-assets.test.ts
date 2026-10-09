import {it,expect} from 'vitest';
import {readFile} from 'node:fs/promises';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'meshoptimizer';
import {BATON} from '../../src/player/weapon-definitions';
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
