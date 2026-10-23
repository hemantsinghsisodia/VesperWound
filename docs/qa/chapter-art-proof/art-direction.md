# Last Departure — Milestone A composition

The proof occupies the retained service lane and west loading bay. This is a visual review of the future Dockside Street / Bonded Warehouse language, not the expanded district or a playable warehouse interior.

| Layer | Authored treatment | Gameplay purpose |
| --- | --- | --- |
| Foreground | Low harbour parapet and controlled canopy cutaway | Keep Medic, threats and sharp labels visible |
| Ground | Wet cobbled service strip, broad apron limestone, flush drains and loading marks | Separate circulation from freight handling |
| Street wall | Complete two-storey workshop bays, recessed shutters, stone plinth, sill and cornice | Replace thin window strips with believable construction |
| Entrance | Projecting BONDED / 03 enamel sign, recessed freight door, overhead pressure pipes | Establish an identifiable landmark at the lane reveal |
| Background | Pitched zinc roofs, clerestory, ventilator and flues | Give the dock a silhouette beyond its playable boundary |
| Dressing | Service cabinets, rain pipes, lamp cages, paper dockets and freight seals | Concentrate wear and detail around work, leaving combat lanes clear |

Palette: petrol enamel, charcoal iron, aged brick, warm limestone, muted brass; amber route lamps and pale industrial clerestory glass. No extra rendering pass or shadow light is required for the proof.

Reference sources: [Poly Haven factory kit](https://polyhaven.com/a/modular_factory_facade), [wet cobblestone scan](https://polyhaven.com/a/cobblestone_floor_04). Their source geometry/materials are the material reference; the composition is original. Source/license checks and rejected candidates are in `art/imports/chapter/discovery.json`.

Matched review positions: court, service lane `(0,13)`, apron `(0,25.5)`, and loading bay `(-5,23)`. Use the accepted gameplay camera and quality for before/after captures. Inspect the entrance and street both while moving and stationary; screenshots alone do not establish streaming or visibility correctness.

## Saved-source workflow

- Canonical proof: `art/source/chapter-art-proof.blend`, textures packed. The accepted baseline remains `art/source/ash-quay-district.blend`.
- `tools/blender/author_chapter_proof.py` is an explicit one-time authoring operation and refuses to overwrite an existing proof. Subsequent edits are saved explicitly.
- `node tools/build-environment.mjs --quay-only` exports the saved proof and updates only optional quay delivery and provenance. It hashes both masters before/after and fails if either changes.
- `npm run assets:environment` exports the retained court and the saved proof; normal builds never execute authoring scripts.
- Discovery reproduction: clone the tool into `.cache/3d-asset-server`, checkout `d0047733617ca0c1031c03ecb0f002289234b00b`, run `npm ci --ignore-scripts`, then `npm run build:server`. Run CLI `search` with telemetry disabled. Do not treat its license metadata as sufficient verification.

The user approved this visual proof on 2026-10-23. District expansion, persistence, sentry, guardian and the full chapter remain later milestones.
