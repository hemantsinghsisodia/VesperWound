import { parseProgress, type ChapterProgress } from './progress';
export interface ChapterStorage { read():Promise<{progress:ChapterProgress|null;recovered:boolean}>; write(progress:ChapterProgress):Promise<void>; close():void }
/** Serialized transactions retain the last valid committed record as backup. */
export class ChapterSaveStore implements ChapterStorage {
  private database:Promise<IDBDatabase>|null=null;
  private queue:Promise<void>=Promise.resolve();
  private closed=false;
  constructor(private readonly factory:IDBFactory|null=typeof indexedDB==='undefined'?null:indexedDB){}
  private open():Promise<IDBDatabase>{
    if(this.closed||!this.factory)return Promise.reject(new Error('Local chapter storage is unavailable'));
    return this.database??=new Promise((resolve,reject)=>{
      const request=this.factory!.open('vesperwound-chapter',1);
      request.onupgradeneeded=()=>{request.result.createObjectStore('progress');};
      request.onerror=()=>reject(request.error??new Error('Could not open chapter storage'));
      request.onblocked=()=>reject(new Error('Close other game tabs to access chapter storage'));
      request.onsuccess=()=>{if(this.closed){request.result.close();reject(new Error('Save owner closed'));}else {request.result.onversionchange=()=>request.result.close();resolve(request.result);}};
    });
  }
  async read():Promise<{progress:ChapterProgress|null;recovered:boolean}>{
    await this.queue.catch(()=>{});const db=await this.open();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction('progress','readonly'),store=tx.objectStore('progress'),primary=store.get('current'),backup=store.get('backup');
      tx.onabort=tx.onerror=()=>reject(tx.error??new Error('Could not read chapter save'));
      tx.oncomplete=()=>{const current=parseProgress(primary.result),previous=parseProgress(backup.result);if(!current&&!previous&&(primary.result!==undefined||backup.result!==undefined)){reject(new Error('Chapter saves are damaged; retained for recovery. Start a new chapter explicitly to replace them.'));return;}resolve({progress:current??previous,recovered:!current&&!!previous});};
    });
  }
  write(progress:ChapterProgress):Promise<void>{
    const copy=parseProgress(progress);if(!copy)return Promise.reject(new Error('Invalid chapter save'));
    const task=this.queue.catch(()=>{}).then(async()=>{
      const db=await this.open();await new Promise<void>((resolve,reject)=>{
        const tx=db.transaction('progress','readwrite'),store=tx.objectStore('progress'),request=store.get('current');
        request.onsuccess=()=>{const current=parseProgress(request.result);if(current)store.put(current,'backup');store.put(copy,'current');};
        tx.oncomplete=()=>resolve();tx.onabort=tx.onerror=()=>reject(tx.error??new Error('Progress could not be saved'));
      });
    });this.queue=task;return task;
  }
  close():void {this.closed=true;void this.database?.then(db=>db.close()).catch(()=>{});}
}
