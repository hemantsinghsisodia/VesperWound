# Iona and Ash Quay asset delivery

The cinematic rebuild uses `art/source/iona-master.blend` as its canonical editable source. See [authored workflow](iona-art-workflow.md) and [validation](qa/iona-rebuild/validation.md). The original character is preserved under `art/baseline/iona-v1`; the environment remains from the earlier visual milestone.

Every import has source, author, license, modifications and file hashes in `art/provenance.json`. Runtime notices and provenance are under `public/assets/licenses`. All imported data is recorded as CC0-1.0. No MakeHuman application code, third-party animation, paid asset or external runtime CDN is included.

| Import | Author | Source | Use and modifications |
| --- | --- | --- | --- |
| Cobblestone Floor 08 | Rob Tuytel | [Poly Haven](https://polyhaven.com/a/cobblestone_floor_08) | Original paving and steps, UV scaling, contact AO, damp overlays, KTX2 |
| Rusty Metal 04 | Amal Kumar | [Poly Haven](https://polyhaven.com/a/rusty_metal_04) | Original environment ironwork, soot tint and PBR settings, KTX2 |
| Denim Fabric | Rob Tuytel | [Poly Haven](https://polyhaven.com/a/denim_fabric) | Original character baseline; replaced by original waxcloth bakes in the rebuild |
| Stone Brick Wall 001 | Dimitrios Savva, Rico Cilliers | [Poly Haven](https://polyhaven.com/a/stone_brick_wall_001) | Original masonry, contact AO, material variation, KTX2 |
| Wooden Crate 01 | James Ray Cock | [Poly Haven](https://polyhaven.com/a/wooden_crate_01) | Scaled and placed; joined only for runtime export |
| HM08 base | Data Collection AB, Joel Palmius, Jonas Hauquier | [Official source](https://github.com/makehumancommunity/makehuman/blob/master/makehuman/data/3dobjs/base.obj) | Complete source anatomy, customized proportions/face; hidden anatomy removed only in exports |
| Anatomy morphs and base weights | MakeHuman Community; individual weight-file authors recorded | Pinned official revision in provenance | Facial morphs and normalized finger/wrist weights remapped onto the shared rig |
| Middle-aged Eurasian female skin | OnlyTheGhosts | [Official pack listing](https://static.makehumancommunity.org/assets/assetpacks/skins01.html) | Licensed 2K diffuse beneath authored tone/pores/roughness; runtime 3K/2K/1K by tier |

The [Poly Haven license](https://polyhaven.com/license) and [MakeHuman data license](https://github.com/makehumancommunity/makehuman/blob/master/LICENSE.md) permit modification and distribution. Original costume, groom, equipment, garment weights, animation and environment work belongs to the project owner.

## Files and reproduction

- `art/source/iona-master.blend`: complete anatomy, garment, groom/cards, sculpt, offline cloth study, equipment, 63-bone rig and three export collections.
- `art/textures/iona`: editable extracted source maps and bakes with metadata.
- `art/source/{desktop,mobile,cinematic}`: uncompressed GLBs and export statistics.
- `public/assets/showcase/{desktop,mobile,cinematic}`: optimized character models and independent manifests. Only desktop/mobile include Ash Quay.
- `art/source/ash-quay-{desktop,mobile}.blend`: previous environment masters.
- `art/references`: original generated concept references, prompts and design notes; never represented as runtime captures.
- `art/asset-report.json`: geometry, clip names, texture counts and payload sizes.

`npm run assets:fetch` downloads the earlier verified materials/base/skin. `npm run assets:fetch:morphs` downloads pinned anatomy targets and weights. `npm run assets:build` exports the saved canonical character without saving or regenerating it, preserves existing environment GLBs, compresses by texture semantics and refreshes provenance. The production build copies optimized art. `npm run assets:legacy` explicitly invokes the old procedural generator and may replace legacy sources; it never writes the canonical Iona master.

## Animation contract and review

All tiers share 63 deformation bones, `socket_lantern`, `socket_wake_hook`, and in-place `idle`, `walk`, `run`, `attack`, `dodge` clips. Attack/dodge return to idle; transitions crossfade over 180 ms. Runtime sanitizes bone names but preserves sockets. Equipment follows hand deformation. No collision, movement authority or combat effects are implemented.

The character remains **awaiting art review**. Technical tests and triangle counts do not establish concept likeness or cinematic material realism. Physical phone performance and Phase 2 remain separate.
