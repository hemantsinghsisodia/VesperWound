import type { SectorId } from './definition';
export interface SectorResource<T> {value:T;dispose():void}
export interface SectorLease<T> {ready:Promise<T>;release():void}
interface Entry<T> {refs:number;controller:AbortController;ready:Promise<T>;resource:SectorResource<T>|null}
/** Explicit reference-counted readiness; late results never attach after release. */
export class SectorLoader<T> {
  private readonly entries=new Map<SectorId,Entry<T>>();
  private disposed=false;
  constructor(private readonly load:(id:SectorId,signal:AbortSignal)=>Promise<SectorResource<T>>){}
  acquire(id:SectorId):SectorLease<T>{
    if(this.disposed)throw new Error('Chapter sectors disposed');
    let entry=this.entries.get(id);
    if(!entry){
      const controller=new AbortController();const created:Entry<T>={refs:0,controller,ready:Promise.resolve(null as T),resource:null};
      created.ready=this.load(id,controller.signal).then(resource=>{
        if(controller.signal.aborted||this.disposed){resource.dispose();throw new Error('Sector readiness cancelled');}
        let released=false;created.resource={value:resource.value,dispose:()=>{if(released)return;released=true;resource.dispose();}};return resource.value;
      });entry=created;this.entries.set(id,entry);
    }
    entry.refs++;let released=false;const retained=entry;
    return {ready:entry.ready,release:()=>{if(released)return;released=true;if(--retained.refs===0){retained.controller.abort();retained.resource?.dispose();if(this.entries.get(id)===retained)this.entries.delete(id);}}};
  }
  get count():number{return this.entries.size;}
  dispose():void{if(this.disposed)return;this.disposed=true;for(const e of this.entries.values()){e.controller.abort();e.resource?.dispose();}this.entries.clear();}
}
