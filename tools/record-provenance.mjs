import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const modifications = {
  cobblestone_floor_08: 'Projected and scaled UVs on original paving/steps; retained scanned AO and roughness; added baked geometric contact AO and wet overlays; resized and compressed to mipmapped KTX2.',
  rusty_metal_04: 'Mapped onto original ironwork/equipment, with a soot tint multiplier (0.30, 0.34, 0.32); PBR metallic/roughness settings; resized and compressed to KTX2.',
  denim_fabric: 'Used for the preserved original character baseline. The rebuilt master uses project-authored waxcloth textures and bakes.',
  stone_brick_wall_001: 'Mapped onto original modular masonry and foundation; contact AO and material variation; KTX2 compression.',
  wooden_crate_01: 'Imported mesh from the licensed .blend with auto-execution disabled; scaled, repositioned, duplicated and joined only for export; material textures compressed to KTX2.',
};
const sources = JSON.parse(await readFile('art/downloads/provenance.json', 'utf8')).map((source) => ({ ...source, modifications: modifications[source.id] }));
const hash = async (path) => createHash('sha256').update(await readFile(path)).digest('hex');
sources.push({ id: 'makehuman-hm08-base', source: 'https://raw.githubusercontent.com/makehumancommunity/makehuman/master/makehuman/data/3dobjs/base.obj', authors: ['Data Collection AB', 'Joel Palmius', 'Jonas Hauquier'], license: 'CC0-1.0', licenseEvidence: 'https://github.com/makehumancommunity/makehuman/blob/master/LICENSE.md', retrieved: '2026-10-05', sha256: await hash('art/downloads/base.obj'), modifications: 'Complete anatomy retained in the canonical master with original skin UVs and customized proportions/facial morphs. Covered anatomy removed only from exported derivatives. Original clothing, hair, boots, equipment and 63-bone rig; licensed base weights remapped and normalized with authored garment weights and five animation clips. No MakeHuman application source is included.' });
const skin = JSON.parse(await readFile('art/downloads/skin-pack-provenance.json', 'utf8'));
sources.push({ ...skin, id: skin.selectedAsset, authors: [skin.author], file: 'art/downloads/iona-skin/middleage_eurasian_female_diffuse.png', imageSha256: await hash('art/downloads/iona-skin/middleage_eurasian_female_diffuse.png'), modifications: 'Licensed 2K diffuse underlies original 4K tone/pores/roughness authoring; 3K cinematic runtime atlas, 2K desktop and 1K mobile. Added detail does not make the photographic source native 4K. Original base UVs retained; KTX2 compression. Other pack assets are not imported.' });
const outputs = [];
const anatomy = JSON.parse(await readFile('art/downloads/iona-morphs/provenance.json', 'utf8'));
anatomy.modifications += ' Default weights transferred to modified anatomy, remapped to the shared rig and normalized; finger weights retained rather than assigned by proximity.';
anatomy.files = anatomy.files.map((file) => file.filename.endsWith('default_weights.mhw') ? { ...file, authors: ['Data Collection AB', 'Joel Palmius', 'Jonas Hauquier'], license: 'CC0-1.0', licenseEvidence: 'License and copyright header in the source file' } : file);
sources.push(anatomy);
outputs.push({ path: 'art/source/iona-master.blend', sha256: await hash('art/source/iona-master.blend') });
outputs.push({ path: 'public/assets/showcase/cinematic/iona.glb', sha256: await hash('public/assets/showcase/cinematic/iona.glb') });
for (const variant of ['desktop', 'mobile']) for (const name of ['iona', 'ash-quay']) {
  const paths = name === 'iona' ? [`public/assets/showcase/${variant}/${name}.glb`] : [`art/source/${name}-${variant}.blend`, `public/assets/showcase/${variant}/${name}.glb`];
  for (const path of paths) outputs.push({ path, sha256: await hash(path) });
}
const provenance = { schema: 1, recorded: new Date().toISOString(), sources, originalWork: 'VESPERWOUND: Iona costume/hair/equipment, custom rig/weights/five clips, courtyard modules, pressure-engine landmark, lamps, drainage, covers, debris, reflection lighting and contact-AO bake. Original work belongs to the project owner; imported sources retain their stated licenses.', references: { source: 'Built-in imagegen tool', runtimeUse: false, prompts: 'art/references/generation-prompts.json' }, outputs };
await writeFile('art/provenance.json', JSON.stringify(provenance, null, 2));
await mkdir('public/assets/licenses', { recursive: true });
await copyFile('art/downloads/makehuman-CC0.md', 'public/assets/licenses/CC0-1.0.txt');
await writeFile('public/assets/licenses/art-provenance.json', JSON.stringify(provenance, null, 2));
await writeFile('public/assets/licenses/ART-NOTICES.txt', 'Imported visual assets are CC0-1.0. Authors, sources, hashes and modifications are recorded in art-provenance.json. Poly Haven license: https://polyhaven.com/license\nMakeHuman data license: https://github.com/makehumancommunity/makehuman/blob/master/LICENSE.md\nFemale skin license: https://static.makehumancommunity.org/assets/assetpacks/skins01.html\nOriginal VESPERWOUND work belongs to the project owner.\n');
console.log(`Recorded ${sources.length} imported sources and ${outputs.length} editable/runtime outputs.`);
