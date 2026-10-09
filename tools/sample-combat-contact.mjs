import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { Quaternion } from 'three';
import { writeFile } from 'node:fs/promises';
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
const report=[];
for(const [actor,path,names] of [['medic','public/assets/showcase/shared/animations.glb',['Punch_Jab','Punch_Cross']],['enemy','art/source/zombie7/source.glb',['Attack','Walk','Death','Idle']]]) {
  const doc=await io.read(path),nodes=doc.getRoot().listNodes();
  const rest=new Map(nodes.map(n=>[n,{t:n.getTranslation(),r:n.getRotation(),s:n.getScale()}]));
  for(const name of names) {
    const a=doc.getRoot().listAnimations().find(a=>a.getName()===name);
    const duration=Math.max(...a.listSamplers().map(s=>s.getInput().getMax([])[0]));const frames=[];
    for(let t=0;t<=duration;t+=1/30) {
      for(const [n,r]of rest)n.setTranslation(r.t).setRotation(r.r).setScale(r.s);
      for(const c of a.listChannels()) {
        const s=c.getSampler(),input=s.getInput().getArray(),output=s.getOutput().getArray(),path=c.getTargetPath(),size=path==='rotation'?4:3;
        let i=0;while(i<input.length-2&&input[i+1]<=t)i++;const j=Math.min(i+1,input.length-1),f=input[j]>input[i]?(t-input[i])/(input[j]-input[i]):0;
        const v0=Array.from(output.slice(i*size,(i+1)*size)),v1=Array.from(output.slice(j*size,(j+1)*size));
        const value=path==='rotation'?new Quaternion().fromArray(v0).slerp(new Quaternion().fromArray(v1),Math.max(0,Math.min(1,f))).toArray():v0.map((v,k)=>v+(v1[k]-v)*f);
        const node=c.getTargetNode();if(path==='rotation')node.setRotation(value);else if(path==='translation')node.setTranslation(value);else if(path==='scale')node.setScale(value);
      }
      const pose={time:t,fraction:t/duration};
      for(const semantic of ['Hips','LeftHand','RightHand','LeftFoot','RightFoot']){const n=nodes.find(n=>n.getName()===semantic||n.getName()===`mixamorig:${semantic}`);if(n)pose[semantic]=n.getWorldMatrix().slice(12,15);}
      frames.push(pose);
    }
    report.push({actor,clip:name,duration,frames});
  }
}
await writeFile('docs/qa/phase4a/contact-samples.json',JSON.stringify(report,null,2));
for(const r of report){const hips=r.frames.map(f=>f.Hips);const range=[0,1,2].map(i=>Math.max(...hips.map(p=>p[i]))-Math.min(...hips.map(p=>p[i])));console.log(r.actor,r.clip,'hip range',range,'hands',r.frames.filter(f=>f.fraction>.25&&f.fraction<.6).map(f=>({fraction:f.fraction.toFixed(2),left:f.LeftHand,right:f.RightHand})).slice(0,12));}
