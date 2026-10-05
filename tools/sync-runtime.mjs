import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const target = new URL('public/assets/decoders/basis/', root);
await mkdir(target, { recursive: true });
for (const name of ['basis_transcoder.js', 'basis_transcoder.wasm']) {
  await copyFile(new URL(`node_modules/three/examples/jsm/libs/basis/${name}`, root), new URL(name, target));
}
await mkdir(new URL('public/assets/licenses/', root), { recursive: true });
await copyFile(new URL('node_modules/three/LICENSE', root), new URL('public/assets/licenses/three-MIT.txt', root));
await copyFile(new URL('node_modules/meshoptimizer/LICENSE.md', root), new URL('public/assets/licenses/meshoptimizer-MIT.txt', root));
await copyFile(new URL('node_modules/three/examples/jsm/libs/basis/README.md', root), new URL('public/assets/licenses/basis-upstream-readme.txt', root));
const notices = await readFile(new URL('node_modules/ktx2-encoder/THIRD_PARTY_NOTICES.md', root), 'utf8');
await writeFile(new URL('public/assets/licenses/basis-notices.txt', root), notices);
console.log(`Synchronized runtime transcoder and notices to ${fileURLToPath(target)}`);
