import { readdir, readFile, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../dist/', import.meta.url));
const groups = { bootstrap: { raw: 0, gzip: 0, limit: 5 * 1024 * 1024 }, desktop: { raw: 0, gzip: 0, limit: 20 * 1024 * 1024 }, mobile: { raw: 0, gzip: 0, limit: 10 * 1024 * 1024 }, cinematic: { raw: 0, gzip: 0, limit: 40 * 1024 * 1024 } };
async function visit(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) await visit(path);
    else {
      const bytes = await readFile(path);
      if (path.includes('/showcase/shared/')) {
        // Shared animation delivery counts against each art tier, not bootstrap.
        for (const tier of ['desktop', 'mobile', 'cinematic']) { groups[tier].raw += bytes.length; groups[tier].gzip += gzipSync(bytes).byteLength; }
        continue;
      }
      const group = path.includes('/showcase/desktop/') ? groups.desktop : path.includes('/showcase/mobile/') ? groups.mobile : path.includes('/showcase/cinematic/') ? groups.cinematic : groups.bootstrap;
      group.raw += bytes.length; group.gzip += gzipSync(bytes).byteLength;
    }
  }
}
await visit(root);
const report = Object.fromEntries(Object.entries(groups).map(([name, value]) => [name, { rawBytes: value.raw, gzipBytes: value.gzip, limitBytes: value.limit, passed: name === 'bootstrap' ? value.gzip <= value.limit : value.raw <= value.limit }]));
console.log(JSON.stringify(report, null, 2));
await writeFile('docs/qa/visual-delivery.json', JSON.stringify(report, null, 2));
if (Object.values(report).some((group) => !group.passed)) process.exitCode = 1;
