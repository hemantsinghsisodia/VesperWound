import { readdir, readFile, stat } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../dist/', import.meta.url));
let raw = 0, compressed = 0;
async function visit(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) await visit(path);
    else { const bytes = await readFile(path); raw += (await stat(path)).size; compressed += gzipSync(bytes).byteLength; }
  }
}
await visit(root);
console.log(JSON.stringify({ totalRawBytes: raw, totalGzipBytes: compressed, limitBytes: 5 * 1024 * 1024, passed: compressed <= 5 * 1024 * 1024 }, null, 2));
if (compressed > 5 * 1024 * 1024) process.exitCode = 1;
