import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import sharp from 'sharp';

const out = 'docs/qa/iona-rebuild';
await mkdir(out, { recursive: true });
const caption = (label, width = 440) => Buffer.from(`<svg width="${width}" height="48"><rect width="100%" height="100%" fill="#182325"/><text x="18" y="31" fill="#e9e2d2" font-family="sans-serif" font-size="19">${label}</text></svg>`);
const panels = [];
for (const [i, [path, label]] of [
  ['art/references/iona-design.png', 'Original concept · illustration'],
  [`${out}/baseline/front-neutral.png`, 'Previous model · neutral render'],
  [`${out}/front-neutral.png`, 'Rebuild · awaiting art review'],
].entries()) {
  panels.push({ input: caption(label), left: i * 440, top: 0 });
  panels.push({ input: await sharp(path).resize(440, 520, { fit: 'contain', background: '#202626' }).png().toBuffer(), left: i * 440, top: 48 });
}
await sharp({ create: { width: 1320, height: 568, channels: 4, background: '#202626' } }).composite(panels).png().toFile(`${out}/comparison.png`);

const figure = (path, label) => `<figure><a href="${path}" target="_blank"><img loading="lazy" src="${path}" alt="${label}"></a><figcaption>${label}</figcaption></figure>`;
let body = '<h1>Iona — review candidate</h1><p class="gate">Awaiting art review. Technical verification does not approve concept fidelity.</p><p>The concept is a 2D illustration sheet, not a neutral render or calibrated orthographic reference. Baseline and rebuild Blender captures use the same camera, lighting and pose. Browser captures demonstrate the actual runtime shaders; their perspective and scale differ from the Blender views. Click any capture for full size.</p>';
body += '<h2>Identity and silhouette</h2>' + figure('comparison.png', 'Original concept / previous model / rebuild');
body += figure('../../../art/references/iona-design.png', 'Original concept sheet: front, back, profile and equipment');
for (const mode of ['neutral', 'clay']) {
  body += `<h2>Matched ${mode} views</h2><div class="grid">`;
  for (const angle of ['front', 'profile', 'back', 'three-quarter']) {
    body += `<article><h3>${angle}</h3>${figure(`baseline/${angle}-${mode}.png`, 'Previous model')}${figure(`${angle}-${mode}.png`, 'Rebuilt model')}</article>`;
  }
  body += '</div>';
}
body += '<h2>Construction close-ups</h2><div class="grid">';
for (const part of ['face', 'hair', 'hand', 'boot', 'lantern', 'wake-hook']) body += `<article><h3>${part}</h3>${figure(`baseline/${part}-neutral.png`, 'Previous model')}${figure(`${part}-neutral.png`, 'Rebuilt model')}</article>`;
body += '</div><h2>Actual runtime inspection</h2><div class="grid">';
for (const backend of ['webgpu-required', 'webgl2']) for (const view of ['front', 'profile', 'back', 'three-quarter', 'portrait', 'equipment', 'ash-quay', 'orbit']) body += figure(`browser/${backend}-${view}.png`, `${backend}: ${view}`);
body += '</div><h2>Source vs compressed material output</h2><p>Both captures use the runtime studio. Source PNGs are development-only evidence; production uses compressed KTX2. Skin source is 4K authoring over a licensed 2K photograph, compressed runtime face is 3K.</p><div class="grid">';
for (const view of ['full-body', 'portrait', 'equipment']) for (const mode of ['source', 'compressed']) body += figure(`browser/materials-${mode}-${view}.png`, `${mode}: ${view}`);
body += '</div><h2>Animation previews and transitions</h2><p>Single-frame captures supplement interactive playback. They do not prove that every frame is free of penetration or sliding.</p><div class="grid">';
for (const clip of ['idle', 'walk', 'run', 'attack', 'dodge']) for (const backend of ['webgpu-required', 'webgl2']) body += figure(`browser/${backend}-${clip}.png`, `${backend}: ${clip}`);
body += '</div><h2>Gameplay distance and mobile landscape</h2><div class="grid">';
for (const tier of ['desktop', 'mobile']) for (const view of ['courtyard', 'iona']) body += figure(`../visual/${view}-webgl2-${tier}.png`, `${tier}: ${view}`);
body += '</div><h2>Open visual issues</h2><ul><li>Face likeness and expression remain below the concept standard.</li><li>Hair cards have broad layered edges; the bun and hairline require a further groom pass.</li><li>Eyebrows are visibly regular; waxcloth folds, seams and wear remain simplified.</li><li>Animation weight shifts, glove grip clearance and coat penetration need frame-by-frame artist review.</li></ul><p><a href="validation.md">Validation report</a> · <a href="../../iona-art-workflow.md">Editable source workflow</a></p>';
await writeFile(`${out}/comparison.html`, `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Iona comparisons</title><style>body{background:#101a1e;color:#e9e2d2;font:16px/1.5 system-ui;margin:0 auto;padding:32px;max-width:1500px}h1,h2{color:#e7c787}.gate{border:1px solid #a78b58;padding:14px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:18px}figure{margin:12px 0;background:#19272b;padding:8px}img{display:block;width:100%;height:auto;max-height:800px;object-fit:contain}figcaption{padding:8px}a{color:#e7c787}</style>${body}</html>`);
// Fail visibly if evidence links are missing; do not quietly invent captures.
const paths = [...body.matchAll(/<img[^>]+src="([^"]+)"/g)].map((match) => match[1]);
const missing = [];
for (const path of paths) { try { await access(`${out}/${path}`); } catch { missing.push(path); } }
await writeFile(`${out}/comparison-index.json`, JSON.stringify({ generated: new Date().toISOString(), captures: paths, missing }, null, 2));
console.log(`Comparison gallery: ${paths.length} captures, ${missing.length} pending captures.`);
// Keep source evidence readable without any embedded data URLs in the gallery.
await readFile(`${out}/comparison.png`);
