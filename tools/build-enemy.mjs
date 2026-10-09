import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const blender = process.env.BLENDER_PATH ?? 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe';
const environment = {...process.env}; delete environment.SSLKEYLOGFILE;
const hash = async()=>createHash('sha256').update(await readFile('art/source/zombie7-master.blend')).digest('hex');
const before = await hash();
await new Promise((resolve,reject)=>{
  let output=''; const child=spawn(blender,['-b','--factory-startup','--disable-autoexec','--python','tools/blender/export_enemy.py'],{env:environment,windowsHide:true,stdio:['ignore','pipe','inherit']});
  child.stdout.on('data',chunk=>{output+=chunk;process.stdout.write(chunk);}); child.on('error',reject);
  child.on('exit',code=>code===0&&output.includes('ENEMY_EXPORT_COMPLETE')?resolve():reject(new Error('Enemy export failed')));
});
if (await hash()!==before) throw new Error('Authored enemy master changed during export');
await import('./optimize-enemy.mjs');
