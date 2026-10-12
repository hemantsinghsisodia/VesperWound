import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const headers = { 'User-Agent': 'VESPERWOUND-EnvironmentBuild/1.0' };
const ids = ['modular_factory_facade', 'modular_industrial_pipes_01'];
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const records = [];
for (const id of ids) {
  const directory = `art/imports/environment/${id}`;
  await mkdir(directory, { recursive: true });
  const metadataResponse = await fetch(`https://api.polyhaven.com/info/${id}`, { headers });
  const filesResponse = await fetch(`https://api.polyhaven.com/files/${id}`, { headers });
  if (!metadataResponse.ok || !filesResponse.ok) throw new Error(`Could not read ${id} catalog`);
  const metadata = await metadataResponse.json(), files = await filesResponse.json();
  await writeFile(`${directory}/metadata.json`, JSON.stringify(metadata, null, 2));
  await writeFile(`${directory}/files.json`, JSON.stringify(files, null, 2));
  const source = files.blend['1k'].blend;
  const downloads = [];
  for (const [name, file] of [['source.blend', source], ...Object.entries(source.include)]) {
    const destination = `${directory}/${name}`;
    await mkdir(path.dirname(destination), { recursive: true });
    let bytes;
    try { bytes = await readFile(destination); } catch { /* Download absent originals. */ }
    if (!bytes || createHash('md5').update(bytes).digest('hex') !== file.md5) {
      const response = await fetch(file.url, { headers });
      if (!response.ok) throw new Error(`${response.status}: ${file.url}`);
      bytes = Buffer.from(await response.arrayBuffer());
      if (createHash('md5').update(bytes).digest('hex') !== file.md5) throw new Error(`Source hash mismatch: ${name}`);
      await writeFile(destination, bytes);
    }
    downloads.push({ path: destination, url: file.url, bytes: bytes.length, md5: file.md5, sha256: sha256(bytes) });
  }
  records.push({ id, title: metadata.name, authors: Object.keys(metadata.authors), source: `https://polyhaven.com/a/${id}`, license: 'CC0-1.0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', acquired: new Date().toISOString().slice(0, 10), files: downloads });
  console.log(`Verified ${id}: ${downloads.length} original files`);
}
await writeFile('art/imports/environment/acquisition.json', JSON.stringify(records, null, 2));
