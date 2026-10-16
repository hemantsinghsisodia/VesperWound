import { Vector3, type PerspectiveCamera } from 'three/webgpu';
import type { MissionSnapshot } from '../mission/first-mission';

/** Scene-owned rendered-camera override. It never changes the combat aiming camera. */
export class MissionCamera {
  readonly focus=new Vector3();
  private readonly position=new Vector3();
  apply(camera:PerspectiveCamera,state:MissionSnapshot,reducedMotion:boolean):boolean {
    if(!state.cinematic&&state.stage!=='complete')return false;
    const departure=state.stage!=='introduction',p=reducedMotion?.5:state.progress;
    if(departure){this.focus.set(0,.6,33+(reducedMotion?3:state.progress*7));this.position.set(8-p*2,10,23+p*4);}
    else {this.focus.set(1,.8,28+p);this.position.set(12-p*2,13-p,18+p*1.5);}
    camera.position.copy(this.position);camera.lookAt(this.focus);camera.updateMatrixWorld(true);return true;
  }
}
