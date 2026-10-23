// Explicit development acquisition; never imported by the game or normal art builds.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const id = 'cobblestone_floor_04', directory = `art/imports/chapter/${id}`;
const headers = { 'User-Agent': 'VESPERWOUND-ArtProof/1.0' };
const hash = (bytes, algorithm = 'sha256') => createHash(algorithm).update(bytes).digest('hex');
async function get(url) { const r = await fetch(url, { headers }); if (!r.ok) throw new Error(`${r.status}: ${url}`); return r; }
await mkdir(directory, { recursive: true });
const metadata = await (await get(`https://api.polyhaven.com/info/${id}`)).json();
const catalog = await (await get(`https://api.polyhaven.com/files/${id}`)).json();
await writeFile(`${directory}/metadata.json`, JSON.stringify(metadata, null, 2));
await writeFile(`${directory}/files.json`, JSON.stringify(catalog, null, 2));
const files = [];
for (const slot of ['Diffuse', 'nor_gl', 'Rough', 'AO']) {
  const source = catalog[slot]['1k'].jpg, path = `${directory}/${slot}.jpg`;
  let bytes;
  try { bytes = await readFile(path); } catch { /* First acquisition. */ }
  if (!bytes || hash(bytes, 'md5') !== source.md5) {
    bytes = Buffer.from(await (await get(source.url)).arrayBuffer());
    if (hash(bytes, 'md5') !== source.md5) throw new Error(`Hash mismatch: ${slot}`);
    await writeFile(path, bytes);
  }
  files.push({ path, url: source.url, bytes: bytes.length, md5: source.md5, sha256: hash(bytes) });
}
await writeFile('art/imports/chapter/acquisition.json', JSON.stringify([{ id, title: metadata.name, authors: Object.keys(metadata.authors), source: `https://polyhaven.com/a/${id}`, license: 'CC0-1.0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', verified: '2026-10-23', files }], null, 2));
console.log(`Verified ${id}: ${files.length} source maps`);
