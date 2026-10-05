import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const directory = new URL('../art/downloads/', import.meta.url);
const catalog = JSON.parse(await readFile(new URL('poly-assets.json', directory), 'utf8'));
const provenance = [];
async function save(url, name, expected) {
  const response = await fetch(url); if (!response.ok) throw new Error(`${response.status}: ${url}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const md5 = createHash('md5').update(bytes).digest('hex');
  if (expected && md5 !== expected) throw new Error(`Hash mismatch: ${name}`);
  await writeFile(new URL(name, directory), bytes);
  return { filename: name, url, bytes: bytes.length, md5 };
}
for (const id of ['cobblestone_floor_08', 'rusty_metal_04', 'denim_fabric', 'stone_brick_wall_001', 'wooden_crate_01']) {
  await mkdir(new URL(`${id}/`, directory), { recursive: true });
  const files = await fetch(`https://api.polyhaven.com/files/${id}`).then((r) => r.json());
  await writeFile(new URL(`${id}/files.json`, directory), JSON.stringify(files, null, 2));
  const records = [];
  if (id === 'wooden_crate_01') {
    const blend = files.blend['1k'].blend;
    records.push(await save(blend.url, `${id}/${id}.blend`, blend.md5));
    for (const [name, item] of Object.entries(blend.include)) {
      await mkdir(new URL(`${id}/textures/`, directory), { recursive: true });
      records.push(await save(item.url, `${id}/${name}`, item.md5));
    }
  } else {
    for (const size of ['1k', '2k']) for (const [key, suffix] of [['Diffuse', 'diff'], ['nor_gl', 'normal'], ['Rough', 'rough'], ['AO', 'ao']]) {
      const entry = files[key]?.[size]?.jpg; if (!entry) continue;
      records.push(await save(entry.url, `${id}/${suffix}_${size}.jpg`, entry.md5));
    }
  }
  provenance.push({ id, source: `https://polyhaven.com/a/${id}`, authors: Object.keys(catalog[id].authors), license: 'CC0-1.0', retrieved: new Date().toISOString(), files: records });
  console.log(`Downloaded ${id}: ${records.length} files`);
}
await save('https://raw.githubusercontent.com/makehumancommunity/makehuman/master/LICENSE.ASSETS.md', 'makehuman-CC0.md');
await writeFile(new URL('provenance.json', directory), JSON.stringify(provenance, null, 2));
