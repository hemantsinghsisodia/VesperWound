# Phase 1 asset provenance

All visible geometry and texture pixels in the courtyard are original procedural work created for this project. No external model pack, image, font, or audio recording was downloaded.

| Asset | Source | Purpose / ownership |
| --- | --- | --- |
| assets/fixtures/vessel.glb | tools/generate-fixtures.mjs | Original three-joint breathing vessel; animation and Meshopt fixture |
| assets/fixtures/stone.ktx2 | tools/generate-fixtures.mjs | Original deterministic stone color raster; sRGB, UASTC, mipmaps |
| assets/fixtures/normal.ktx2 | tools/generate-fixtures.mjs | Original normal raster; linear data, UASTC, mipmaps |
| Courtyard architecture, marker, haze, dust | src/world/courtyard.ts | Original procedural meshes and canvas raster |
| Pressure tone and ambient drone | src/audio/audio-manager.ts | Original synthesized Web Audio signals |
| mark.svg | Project original | Original V mark |

The original fixtures belong to the project; no third-party asset attribution obligation applies to their content. The code libraries used to create/load them retain their own licenses.

Runtime redistribution:
- Three.js: MIT, version pinned in package-lock.json. License copied to public/assets/licenses/three-MIT.txt.
- Basis Universal transcoder: Apache-2.0, verified in Three.js's bundled Basis README. Version-matched files come from the installed Three.js examples directory. The full [upstream license](https://github.com/BinomialLLC/basis_universal/blob/master/LICENSE), retrieved 2026-10-05, is committed as public/assets/licenses/basis-Apache-2.0.txt. The bundled README and encoder attribution/provenance notices are also included in that directory. The encoder itself is an offline tool, not part of the runtime.
- Meshopt decoder bundled through Three.js: MIT, Arseny Kapoulkine. The full upstream license is copied to public/assets/licenses/meshoptimizer-MIT.txt so minification cannot remove the redistribution notice.

Offline generation tools are development dependencies and are not included in the game entry bundle. ktx2-encoder is MIT and embeds Basis Universal's notices. glTF Transform is MIT. meshoptimizer is MIT. The generator is deterministic in its geometry/pixels; compression output may change when tool versions intentionally change.

Regeneration requires npm ci and npm run assets:generate. npm run build synchronizes the Basis files and license notices. Keep the committed generated fixtures so ordinary installs/builds do not need to run an asset encoder.

Future imported assets must record: asset ID, exact source URL, author, license text, retrieval date, original filename, modifications, and required attribution. Verify the particular distribution rather than inferring its terms from a website name.
