import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const directory = 'art/imports/environment/concrete_floor_worn_02';
const files = JSON.parse(await readFile(`${directory}/files.json`, 'utf8'));
const records = [];
for (const map of ['Diffuse', 'nor_gl', 'Rough']) {
  const source = files[map]['1k'].jpg;
  const response = await fetch(source.url);
  if (!response.ok) throw new Error(`Download failed: ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const md5 = createHash('md5').update(bytes).digest('hex');
  if (md5 !== source.md5) throw new Error(`Source hash mismatch: ${map}`);
  const path = `${directory}/${map}.jpg`;
  await writeFile(path, bytes);
  records.push({ path, url: source.url, bytes: bytes.length, md5, sha256: createHash('sha256').update(bytes).digest('hex') });
}
const path = 'art/imports/environment/acquisition.json';
const inventory = JSON.parse(await readFile(path, 'utf8')).filter(s => s.id !== 'concrete_floor_worn_02');
inventory.push({ id: 'concrete_floor_worn_02', title: 'Concrete Floor Worn 02', authors: ['Dimitrios Savva'], source: 'https://polyhaven.com/a/concrete_floor_worn_02', license: 'CC0-1.0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', acquired: '2026-10-12', files: records, modifications: ['Metre-scaled UV projection, subtle material tint, tier compression and mipmaps'] });
await writeFile(path, JSON.stringify(inventory, null, 2));
console.log(records.map(r => ({ path: r.path, bytes: r.bytes })));
