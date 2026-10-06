# Fab Medic source and runtime workflow

The active character is **SciFi Medic - Rigged by Tony Flanagan**, acquired through Fab on 2026-10-06 under CC BY 4.0. The user approved the Fab EULA acceptance at the download dialog. Original archives, extracted files and hashes are in `art/imports/medic`; runtime provenance is in `art/medic-provenance.json`. Public attribution is available at `/credits.html` from the entry screen and settings.

`art/source/medic-master.blend` is the editable, packed master. It preserves the supplied 67-bone armature, nine meshes, clothing, equipment and materials. A parent empty applies uniform scale and ground normalization to 1.8 metres. All source images are packed, with native sizes from 128 to 1024 pixels; the head color image is 512 pixels. Original extracted texture files are retained alongside the downloaded source. There is no invented high-resolution source detail.

Both the supplied Blender package and Fab's converted GLB contain **zero animation clips**, despite the listing's animation-related tags. Static pose is therefore the only active preview. The runtime supports arbitrary supplied clips with pause and 180 ms transitions; synthetic clips in unit tests exercise that behavior without adding generated game animations. Future locomotion, combat and new animation acquisition remain Phase 2.

## Normal build

Run `npm run assets:build` using Blender 5.2, or set `BLENDER_PATH` to its executable. The command opens the saved master with automatic script execution disabled, exports it without saving changes, checks the master's SHA-256, and verifies the export completion marker because Blender can exit successfully after a Python exception.

The optimizer uses Meshopt, ETC1S for packed material maps, and UASTC with Zstandard for normal and color maps. Color maps use UASTC because paired browser captures revealed visible ETC1S blocks on the coat at inspection distance. It creates mipmaps without enlarging the source images. The 18,745-triangle model already fits the mobile ceiling; all three tiers share identical exported bytes. Desktop and detailed inspection preserve the same native detail. The cinematic path remains explicitly loaded and independently owned; it is a studio inspection option, not a higher-detail reconstruction.

Ash Quay's desktop/mobile models remain unchanged. Manifests now use the `character` key, alongside `courtyard` where applicable. Model dependencies resolve relative to their model location. Scene and inspection asset handles retain reference-counted ownership and cancellation/disposal paths.

## Source evidence

`tools/blender/inspect_medic.py` reads the untouched original. `prepare_medic.py` is the one-time source packaging operation and must not be rerun over manual master edits. `render_medic.py` captures the saved source without saving it. `tools/capture-medic-raw.mjs` captures Fab's original GLB; `--export` captures the optimized model. The original converted GLB produced visibly collapsed geometry in our browser, so the active exports come from the Blender source.

## Retained character

The user accepted Medic on 2026-10-06 and requested removal of the previous generated character. Its masters, textures, runtime backups, portrait experiments, comparisons, unused imports and generators have been removed. The unfinished portrait route remains excluded. Ash Quay's saved masters and runtime exports are retained.

The normal Medic build is the only character build command. `npm run assets:fetch` fetches retained environment imports; it does not download human-base, skin or morph packs. `tools/record-provenance.mjs` refreshes the combined Medic/environment provenance and public notices after exports.

Medic's visual presentation is accepted. See `docs/qa/medic/comparison.html` and `docs/qa/medic/validation.md` for the source evidence and separate technical results. Removal is recorded in `docs/qa/medic/cleanup.json`. Browser emulation does not establish physical-phone performance.
