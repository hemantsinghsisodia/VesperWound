# Medic and Ash Quay asset delivery

Medic is the retained character, accepted by the user on 2026-10-06. Its editable master is `art/source/medic-master.blend`. Original downloads and native texture sources live under `art/imports/medic`. See [Medic workflow](medic-art-workflow.md), [validation](qa/medic/validation.md) and [source/browser comparisons](qa/medic/comparison.html).

Sources, authors, licenses, modifications and hashes are recorded in `art/provenance.json` and `art/medic-provenance.json`. Public notices and provenance are under `public/assets/licenses`, with accessible attribution at `/credits.html`. Medic uses CC BY 4.0; the imported environment assets use CC0.

| Import | Author | Source | Use |
| --- | --- | --- | --- |
| SciFi Medic – Rigged | Tony Flanagan | [Fab](https://www.fab.com/listings/2c775e7c-06e8-4b6c-96a0-c57c17987634) | Supplied appearance/equipment/rig; normalized scale/ground; glTF re-export and compression |
| Cobblestone Floor 08 | Rob Tuytel | [Poly Haven](https://polyhaven.com/a/cobblestone_floor_08) | Paving/steps, UV scaling, contact AO, damp overlays |
| Rusty Metal 04 | Amal Kumar | [Poly Haven](https://polyhaven.com/a/rusty_metal_04) | Environment ironwork, soot tint and PBR settings |
| Stone Brick Wall 001 | Dimitrios Savva, Rico Cilliers | [Poly Haven](https://polyhaven.com/a/stone_brick_wall_001) | Masonry, contact AO and material variation |
| Wooden Crate 01 | James Ray Cock | [Poly Haven](https://polyhaven.com/a/wooden_crate_01) | Scaled/placed; joined only for export |

Medic retains its supplied skeleton and skinning. No animation clips were included, so Static pose is the only available preview. The 18,745-triangle source fits every tier; exports are equivalent and preserve native textures without upscaling. Generic preview controls support validated supplied clips and 180 ms transitions if licensed animations are added in a later phase.

Ash Quay's editable sources are `art/source/ash-quay-{desktop,mobile}.blend`. Runtime exports/manifests are under `public/assets/showcase/{desktop,mobile,cinematic}`. Only desktop/mobile manifests include the courtyard. Mobile never automatically loads inspection art.

`npm run assets:build` reads the saved Medic master without saving changes, checks its hash, optimizes it and refreshes combined provenance. `npm run assets:fetch` fetches retained environment imports only. Ordinary application builds use saved exports. The previous character's models, textures, unused imports, experimental sources and generation commands have been removed.

Geometry, payload and texture checks are reported in `docs/qa/medic/validation.md`. Physical-phone performance and Phase 2 player mechanics remain separate.
