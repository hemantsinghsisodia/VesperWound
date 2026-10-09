import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const blender = process.env.BLENDER_PATH ?? (process.platform === 'win32' ? 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' : 'blender');
const environment = { ...process.env }; delete environment.SSLKEYLOGFILE;
async function run(command, args) {
  await new Promise((resolve, reject) => {
    let output = '';
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'inherit'], env: environment, windowsHide: true });
    child.stdout.on('data', (chunk) => { output += chunk.toString(); process.stdout.write(chunk); });
    child.on('error', reject); child.on('exit', (code) => code === 0 && (command !== blender || /MEDIC_EXPORT_COMPLETE|PLAYER_ANIMATION_EXPORT_COMPLETE/.test(output)) ? resolve() : reject(new Error(`${command} exited ${code}`)));
  });
}
// Authoring is separate. This command only reads the packed master and exports
// equivalent runtime tiers; it never saves over an artist's work.
const fingerprint = async () => createHash('sha256').update(await readFile('art/source/medic-master.blend')).digest('hex');
const masterBefore = await fingerprint();
await run(blender, ['-b', '--factory-startup', '--disable-autoexec', '--python', 'tools/blender/export_medic.py']);
if (await fingerprint() !== masterBefore) throw new Error('The authored master changed during export.');
await run(process.execPath, ['tools/optimize-medic.mjs']);
const animationBefore = createHash('sha256').update(await readFile('art/source/medic-player-animations.blend')).digest('hex');
await run(blender, ['-b', '--factory-startup', '--disable-autoexec', '--python', 'tools/blender/export_player_animations.py']);
if (createHash('sha256').update(await readFile('art/source/medic-player-animations.blend')).digest('hex') !== animationBefore) throw new Error('The saved animation source changed during export.');
await run(process.execPath, ['tools/optimize-player-animations.mjs']);
await run(process.execPath, ['tools/record-provenance.mjs']);
await run(process.execPath, ['tools/build-enemy.mjs']);
