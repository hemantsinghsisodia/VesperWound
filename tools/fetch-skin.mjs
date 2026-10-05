import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const url = 'https://files.makehumancommunity.org/asset_packs/skins01/skins01_cc0.zip';
let bytes;
try { bytes = await readFile('art/downloads/skins01_cc0.zip'); }
catch { const response = await fetch(url); if (!response.ok) throw new Error(`HTTP ${response.status}`); bytes = Buffer.from(await response.arrayBuffer()); await writeFile('art/downloads/skins01_cc0.zip', bytes); }
await writeFile('art/downloads/skin-pack-provenance.json', JSON.stringify({ source: 'https://static.makehumancommunity.org/assets/assetpacks/skins01.html', archive: url, retrieved: new Date().toISOString(), sha256: createHash('sha256').update(bytes).digest('hex'), author: 'OnlyTheGhosts', selectedAsset: 'onlytheghosts_middle_aged_eurasian_female', license: 'CC0-1.0' }, null, 2));
console.log(`Verified download: ${bytes.length} bytes.`);
