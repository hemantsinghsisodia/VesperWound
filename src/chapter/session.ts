import { ChapterSaveStore, type ChapterStorage } from './save-store';
import { ChapterSimulation } from './simulation';
import { freshProgress, type ChapterProgress } from './progress';
import type { EncounterSimulation } from '../enemies/encounter-simulation';
import type { PlayerCollision } from '../player/player-simulation';
/** Session-owned persistence and CPU state survive scene/quality replacement. */
export class ChapterSession {
  readonly simulation:ChapterSimulation;
  message='';
  saved:ChapterProgress|null=null;
  private revision=-1;
  private generation=0;
  private disposed=false;
  constructor(encounter:EncounterSimulation,collision:PlayerCollision,private readonly storage:ChapterStorage=new ChapterSaveStore()){this.simulation=new ChapterSimulation(encounter,collision);}
  async read():Promise<void>{try{const result=await this.storage.read();if(this.disposed)return;this.saved=result.progress;this.message=result.recovered?'Recovered previous valid chapter save.':'';}catch(error){if(!this.disposed)this.message=error instanceof Error?error.message:String(error);}}
  async progress(fresh:boolean):Promise<ChapterProgress>{if(fresh)return freshProgress();await this.read();if(!this.saved)throw new Error(this.message||'No saved chapter is available');return structuredClone(this.saved);}
  start(progress:ChapterProgress):void{this.generation++;this.simulation.start(progress);this.revision=-1;this.update();}
  update():void{if(!this.simulation.active||this.revision===this.simulation.revision)return;this.revision=this.simulation.revision;this.save();}
  save():void{
    if(!this.simulation.active||this.disposed)return;const progress=structuredClone(this.simulation.progress),generation=this.generation;
    this.message='Saving chapter…';
    void this.storage.write(progress).then(()=>{if(!this.disposed&&generation===this.generation){this.saved=progress;this.message='Chapter saved locally';}}).catch(()=>{if(!this.disposed&&generation===this.generation)this.message='Progress could not be saved. This session is still playable.';});
  }
  leave():void{this.save();this.simulation.leave();}
  dispose():void{this.disposed=true;this.generation++;this.storage.close();}
}
