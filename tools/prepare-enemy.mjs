// Explicit one-time source preparation; never called by assets:build.
import { spawn } from 'node:child_process';
const environment={...process.env};delete environment.SSLKEYLOGFILE;
await new Promise((resolve,reject)=>{
  let output='';const child=spawn(process.env.BLENDER_PATH??'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe',['-b','--factory-startup','--disable-autoexec','--python','tools/blender/prepare_enemy.py'],{env:environment,windowsHide:true,stdio:['ignore','pipe','inherit']});
  child.stdout.on('data',chunk=>{output+=chunk;process.stdout.write(chunk);});child.on('error',reject);child.on('exit',code=>code===0&&output.includes('ENEMY_MASTER_SAVED')?resolve():reject(new Error('Enemy preparation failed')));
});
