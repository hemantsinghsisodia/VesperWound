import type { PlayerSimulation } from './player-simulation';
export type PickupStatus = 'available' | 'loading' | 'ready' | 'equipped' | 'failed';
/** Owns interaction generations. Async results become equipment only on a fixed tick. */
export class WeaponPickup {
  status: PickupStatus='available'; error=''; private token=0; private playerGeneration=-1;
  get requestId():number {return this.token;}
  cancel():void {this.token++;if(this.status!=='equipped')this.status='available';this.error='';}
  complete(token:number):void {if(token===this.token&&this.status==='loading')this.status='ready';}
  failed(token:number,error:string):void {if(token===this.token&&this.status==='loading'){this.status='failed';this.error=error;}}
  update(player:PlayerSimulation,pressed:boolean,allowed:boolean):number|null {
    if(player.state.weapon==='baton'){this.status='equipped';return null;}
    if((this.status==='loading'||this.status==='ready')&&(!allowed||!player.canPickupBaton()||this.playerGeneration!==player.generation))this.cancel();
    if(this.status==='ready'){if(player.equipBaton())this.status='equipped';return null;}
    if(pressed&&allowed&&player.canPickupBaton()&&this.status!=='loading'){this.status='loading';this.error='';this.playerGeneration=player.generation;return ++this.token;}
    return null;
  }
}
