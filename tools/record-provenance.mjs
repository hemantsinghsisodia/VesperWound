import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const modifications = {
  cobblestone_floor_08: 'Projected and scaled UVs on original paving/steps; retained scanned AO and roughness; added baked geometric contact AO and wet overlays; compressed to mipmapped KTX2.',
  rusty_metal_04: 'Mapped onto original environment ironwork with soot tint and PBR settings; compressed to KTX2.',
  stone_brick_wall_001: 'Mapped onto original modular masonry and foundation; contact AO and material variation; KTX2 compression.',
  wooden_crate_01: 'Imported from the licensed Blender file with automatic script execution disabled; scaled, repositioned and joined only for export; compressed material textures.',
};
const imports = JSON.parse(await readFile('art/downloads/provenance.json', 'utf8'));
const sources = imports.filter((source) => Object.hasOwn(modifications, source.id)).map((source) => ({ ...source, modifications: modifications[source.id] }));
const medic = JSON.parse(await readFile('art/medic-provenance.json', 'utf8'));
sources.push({ ...medic, id: 'fab-scifi-medic', authors: [medic.author] });
const hash = async (path) => createHash('sha256').update(await readFile(path)).digest('hex');
const paths = ['art/source/medic-master.blend', ...['desktop', 'mobile', 'cinematic'].map((tier) => `public/assets/showcase/${tier}/character.glb`)];
for (const tier of ['desktop', 'mobile']) paths.push(`art/source/ash-quay-${tier}.blend`, `public/assets/showcase/${tier}/ash-quay.glb`);
const outputs = await Promise.all(paths.map(async (path) => ({ path, sha256: await hash(path) })));
const provenance = { schema: 1, recorded: new Date().toISOString(), sources,
  originalWork: 'VESPERWOUND courtyard modules, pressure-engine landmark, lamps, drainage, covers, debris, reflection lighting and contact-AO bake belong to the project owner. Medic and imported environment assets retain their stated licenses.',
  references: { source: 'Built-in imagegen tool', runtimeUse: false, prompts: 'art/references/generation-prompts.json' }, outputs };
await writeFile('art/provenance.json', JSON.stringify(provenance, null, 2));
await mkdir('public/assets/licenses', { recursive: true });
await writeFile('public/assets/licenses/art-provenance.json', JSON.stringify(provenance, null, 2));
await writeFile('public/assets/licenses/medic-provenance.json', JSON.stringify(medic, null, 2));
await writeFile('public/assets/licenses/ART-NOTICES.txt', 'SciFi Medic - Rigged by Tony Flanagan: CC BY 4.0. Source: https://www.fab.com/listings/2c775e7c-06e8-4b6c-96a0-c57c17987634\nLicense: https://creativecommons.org/licenses/by/4.0/\nModified through scale/ground normalization, Blender glTF re-export, Meshopt and KTX2 compression/mipmaps. No author endorsement is implied.\nImported environment assets: CC0-1.0; Poly Haven license: https://polyhaven.com/license\nAuthors, source hashes and modifications are recorded in art-provenance.json and medic-provenance.json. See /credits.html for accessible attribution.\nOriginal VESPERWOUND environment work belongs to the project owner.\n');
const report = JSON.parse(await readFile('art/asset-report.json', 'utf8'));
await writeFile('art/asset-report.json', JSON.stringify([
  ...report.filter((asset) => asset.name === 'ash-quay'),
  ...medic.exports.map(({ tier, ...asset }) => ({ variant: tier, name: 'character', ...asset })),
], null, 2));
console.log(`Recorded ${sources.length} retained imports and ${outputs.length} editable/runtime outputs.`);
