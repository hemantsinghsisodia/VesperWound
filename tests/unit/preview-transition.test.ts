import { expect, it } from 'vitest';
import { AnimationClip, Group, NumberKeyframeTrack } from 'three/webgpu';
import { PreviewActor } from '../../src/world/preview-actor';
import { MEDIC } from '../../src/world/character-definition';
it('does not let a fading old one-shot replace the selected animation',()=>{
  const actor=new PreviewActor({...MEDIC,clips:[{name:'Idle',loop:true},{name:'Hit',loop:false},{name:'Death',loop:false}]});
  const clip=(name:string,duration:number)=>new AnimationClip(name,duration,[new NumberKeyframeTrack('.rotation[x]',[0,duration],[0,.2])]);
  actor.attach({scene:new Group(),animations:[clip('Idle',2),clip('Hit',.3),clip('Death',2)]});
  actor.selectClip({kind:'clip',name:'Hit'});actor.update(.2);actor.selectClip({kind:'clip',name:'Death'});actor.update(.15);
  expect(actor.clip).toEqual({kind:'clip',name:'Death'});actor.update(2);expect(actor.clip).toEqual({kind:'clip',name:'Idle'});actor.dispose();
});
