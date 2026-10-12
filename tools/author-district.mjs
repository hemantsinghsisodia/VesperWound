import { spawn } from 'node:child_process';
const environment = { ...process.env }; delete environment.SSLKEYLOGFILE;
const child = spawn(process.env.BLENDER_PATH ?? 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe', ['-b', '--factory-startup', '--disable-autoexec', '--python', 'tools/blender/author_district.py'], { windowsHide: true, env: environment, stdio: 'inherit' });
child.on('error', error => { console.error(error); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
