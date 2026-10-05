// Explicit legacy operation. The authored master is never touched.
import { spawn } from 'node:child_process';
const blender = process.env.BLENDER_PATH ?? 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe';
const environment = { ...process.env }; delete environment.SSLKEYLOGFILE;
for (const variant of ['desktop', 'mobile']) {
  await new Promise((resolve, reject) => {
    const child = spawn(blender, ['-b', '--factory-startup', '--disable-autoexec', '--python', 'tools/blender/build_visual.py', '--', variant], { stdio: 'inherit', env: environment, windowsHide: true });
    child.on('error', reject); child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`Legacy authoring exited ${code}`)));
  });
}
