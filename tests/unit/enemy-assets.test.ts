import { expect,it } from 'vitest';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { readFile } from 'node:fs/promises';
import { ZOMBIE7 } from '../../src/enemies/enemy-definition';
it('retains the supplied skeleton and clips with normalized skinning and tier ceilings',async()=>{
  const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
  const source=await io.read('art/imports/zombie7/original/source/zom_7.glb');
  const supplied=source.getRoot().listAnimations().map(a=>a.getName()).sort();
  for(const tier of ['desktop','mobile']) {
    const path=`public/assets/encounter/${tier}/zombie7.glb`,doc=await io.read(path),skins=doc.getRoot().listSkins();
    expect(skins[0]!.listJoints()).toHaveLength(65);expect(doc.getRoot().listAnimations().map(a=>a.getName()).sort()).toEqual(supplied);
    for(const name of Object.values(ZOMBIE7.clips))expect(supplied).toContain(name);
    const triangleCount=doc.getRoot().listMeshes().reduce((sum,m)=>sum+m.listPrimitives().reduce((n,p)=>n+p.getIndices()!.getCount()/3,0),0);
    expect(triangleCount).toBeLessThanOrEqual(tier==='mobile'?2000:6000);expect((await readFile(path)).length).toBeLessThanOrEqual((tier==='mobile'?4:8)*1024*1024);
    for(const n of doc.getRoot().listNodes())if(n.getMesh())for(const p of n.getMesh()!.listPrimitives()) {
      const weights=p.getAttribute('WEIGHTS_0')!,joints=p.getAttribute('JOINTS_0')!;expect(weights).not.toBeNull();expect(joints).not.toBeNull();
      const w:number[]=[],j:number[]=[];for(let i=0;i<weights.getCount();i++){weights.getElement(i,w);joints.getElement(i,j);expect(w.reduce((s,v)=>s+v,0)).toBeCloseTo(1,2);expect(w.every(v=>v>=0&&Number.isFinite(v))).toBe(true);expect(j.every(v=>Number.isInteger(v)&&v>=0&&v<n.getSkin()!.listJoints().length)).toBe(true);}
    }
    for(const t of doc.getRoot().listTextures()){const b=t.getImage()!,v=new DataView(b.buffer,b.byteOffset,b.byteLength);expect(v.getUint32(20,true)).toBeLessThanOrEqual(tier==='mobile'?1024:2048);expect(v.getUint32(24,true)).toBeLessThanOrEqual(tier==='mobile'?1024:2048);}
  }
});
