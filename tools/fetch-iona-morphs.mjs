import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const revision = 'a8bc2d54ff0ac92e78ff71431b1023eda42bf482';
const targets = ['macrodetails/caucasian-female-young', 'macrodetails/universal-female-young-averagemuscle-averageweight', 'head/head-oval', 'head/head-age-incr'];
await mkdir('art/downloads/iona-morphs', { recursive: true });
const files = [];
for (const target of targets) {
  const url = `https://raw.githubusercontent.com/makehumancommunity/makehuman/${revision}/makehuman/data/targets/${target}.target`;
  const response = await fetch(url); if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const filename = `art/downloads/iona-morphs/${target.split('/').at(-1)}.target`;
  await writeFile(filename, bytes);
  files.push({ filename, url, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
}
{
  const url = `https://raw.githubusercontent.com/makehumancommunity/makehuman/${revision}/makehuman/data/rigs/default_weights.mhw`;
  const response = await fetch(url); if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
  const bytes = Buffer.from(await response.arrayBuffer()); const filename = 'art/downloads/iona-morphs/default_weights.mhw';
  await writeFile(filename, bytes); files.push({ filename, url, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
}
await writeFile('art/downloads/iona-morphs/provenance.json', JSON.stringify({
  id: 'makehuman-iona-anatomy-morphs', revision, authors: ['MakeHuman Community'], license: 'CC0-1.0',
  source: 'https://github.com/makehumancommunity/makehuman',
  licenseEvidence: 'https://static.makehumancommunity.org/makehuman/faq/are_makehuman_files_free.html',
  modifications: 'Combined female anatomy targets and original facial sculpt adjustments; transferred landmark positions for rig and clothing authoring.',
  files,
}, null, 2));
