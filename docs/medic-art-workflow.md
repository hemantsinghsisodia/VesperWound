# Fab Medic source and runtime workflow

The active character is **SciFi Medic - Rigged by Tony Flanagan**, acquired through Fab on 2026-10-06 under CC BY 4.0. The user approved the Fab EULA acceptance at the download dialog. Original archives, extracted files and hashes are in `art/imports/medic`; runtime provenance is in `art/medic-provenance.json`. Public attribution is available at `/credits.html` from the entry screen and settings.

`art/source/medic-master.blend` is the editable, packed master. It preserves the supplied 67-bone armature, nine meshes, clothing, equipment and materials. A parent empty applies uniform scale and ground normalization to 1.8 metres. All source images are packed, with native sizes from 128 to 1024 pixels; the head color image is 512 pixels. Original extracted texture files are retained alongside the downloaded source. There is no invented high-resolution source detail.

Both supplied Fab files contain **zero animation clips**. Phase 2 adds seven clips from Quaternius's free CC0 Universal Animation Library: idle, walk, jog, cross punch, roll, chest hit and death. They are retargeted additions, not Fab-supplied animation. Static pose remains available from the idle's first frame; previews retain pause and 180 ms transitions.

## Normal build

Run `npm run assets:build` using Blender 5.2, or set `BLENDER_PATH` to its executable. The command opens the saved master with automatic script execution disabled, exports it without saving changes, checks the master's SHA-256, and verifies the export completion marker because Blender can exit successfully after a Python exception.

The optimizer uses Meshopt, ETC1S for packed material maps, and UASTC with Zstandard for normal and color maps. Color maps use UASTC because paired browser captures revealed visible ETC1S blocks on the coat at inspection distance. It creates mipmaps without enlarging the source images. The 18,745-triangle model already fits the mobile ceiling; all three tiers share identical exported bytes. Desktop and detailed inspection preserve the same native detail. The cinematic path remains explicitly loaded and independently owned; it is a studio inspection option, not a higher-detail reconstruction.

Ash Quay's models remain unchanged. Manifests use `character`, `courtyard` where applicable and `animations` pointing to `../shared/animations.glb`. Dependencies resolve relative to model locations. The shared animation pack counts toward both initial-art budgets. Scene and inspection handles retain reference-counted ownership and cancellation/disposal paths.

`art/source/medic-player-animations.blend` is the editable animation authoring source. `assets:build` exports it read-only and strips constant scale/location tracks before Meshopt compression. `tools/retarget-medic.mjs` and `tools/blender/phase2_sources.py` are explicit one-time acquisition/retarget preparation tools; do not rerun them over artist edits. The retarget aligns Medic's lowered-arm bind pose with the library's T-pose, maps semantic bones in world space, retains vertical body motion and removes horizontal hip travel. Source provenance, archive hashes and modifications are in `art/animation-provenance.json`. Character geometry, materials, equipment and 67-bone rig remain supplied by Tony Flanagan.

## Source evidence

`tools/blender/inspect_medic.py` reads the untouched original. `prepare_medic.py` is the one-time source packaging operation and must not be rerun over manual master edits. `render_medic.py` captures the saved source without saving it. `tools/capture-medic-raw.mjs` captures Fab's original GLB; `--export` captures the optimized model. The original converted GLB produced visibly collapsed geometry in our browser, so the active exports come from the Blender source.

## Retained character

The user accepted Medic on 2026-10-06 and requested removal of the previous generated character. Its masters, textures, runtime backups, portrait experiments, comparisons, unused imports and generators have been removed. The unfinished portrait route remains excluded. Ash Quay's saved masters and runtime exports are retained.

The normal Medic build is the only character build command. `npm run assets:fetch` fetches retained environment imports; it does not download human-base, skin or morph packs. `tools/record-provenance.mjs` refreshes the combined Medic/environment provenance and public notices after exports.

Medic's visual presentation is accepted. See `docs/qa/medic/comparison.html` and `docs/qa/medic/validation.md` for the source evidence and separate technical results. Removal is recorded in `docs/qa/medic/cleanup.json`. Browser emulation does not establish physical-phone performance.
