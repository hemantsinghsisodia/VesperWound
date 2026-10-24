import {expect,type Page} from '@playwright/test';
import type {ChapterProgress} from '../../src/chapter/progress';
import {walkTo} from './district-driver';
export async function seedChapter(page:Page,progress:ChapterProgress):Promise<void>{
  await page.evaluate(async progress=>{await new Promise<void>((resolve,reject)=>{const r=indexedDB.open('vesperwound-chapter',1);r.onupgradeneeded=()=>r.result.createObjectStore('progress');r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,tx=db.transaction('progress','readwrite');tx.objectStore('progress').put(progress,'current');tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};});},progress);
}
export async function continueChapter(page:Page):Promise<number>{
  await page.reload();await expect(page.locator('#app')).toHaveAttribute('data-state','ready');await page.locator('#start').click();const started=Date.now();await page.locator('#chapter-continue').click();await expect(page.locator('#app')).toHaveAttribute('data-chapter-loading','false');await expect(page.locator('#app')).not.toHaveAttribute('data-chapter','inactive');return Date.now()-started;
}
export async function districtCircuit(page:Page):Promise<void>{
  for(const [x,z] of [[0,5],[0,14],[12,14],[25,14],[28,19],[28,23],[31,24],[38,27],[45,29],[46,31],[50,31],[52,33],[52,44],[49,47],[46,47],[30,47],[30,40],[23,38],[23,23],[22,21],[22,18],[22,14],[12,14],[0,14],[0,5]])await walkTo(page,{x:x!,z:z!});
}

