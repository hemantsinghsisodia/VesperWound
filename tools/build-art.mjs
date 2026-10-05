import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const blender = process.env.BLENDER_PATH ?? (process.platform === 'win32' ? 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' : 'blender');
const environment = { ...process.env }; delete environment.SSLKEYLOGFILE;
async function run(command, args) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', env: environment, windowsHide: true });
    child.on('error', reject); child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`${command} exited ${code}`)));
  });
}
// Authoring is separate. This command only reads the packed master and exports
// its intentionally constructed tiers; it never saves over an artist's work.
const fingerprint = async () => createHash('sha256').update(await readFile('art/source/iona-master.blend')).digest('hex');
const masterBefore = await fingerprint();
for (const variant of ['desktop', 'mobile', 'cinematic']) await run(blender, ['-b', '--factory-startup', '--disable-autoexec', '--python', 'tools/blender/export_iona.py', '--', variant]);
if (await fingerprint() !== masterBefore) throw new Error('The authored master changed during export.');
await run(process.execPath, ['tools/optimize-art.mjs']);
await run(process.execPath, ['tools/record-provenance.mjs']);
