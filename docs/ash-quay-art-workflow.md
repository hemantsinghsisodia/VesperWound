# Ash Quay authored environment workflow

Checkpoint C is now the active review build. `npm run assets:environment` exports
`art/source/ash-quay-district.blend`; see [the current district workflow](ash-quay-checkpoint-c.md).
The notes below document the accepted Checkpoint A source and its preparation.

Checkpoint A stopped for browser art review. Its proof preserves the original playable collision footprint and all
accepted characters, weapon and combat rules. The hidden 64 m Blender blockout
and QA diagram describe the next checkpoint; they are not runtime traversal.

`art/source/ash-quay-master.blend` is the editable Checkpoint A source. Its named
collections separate imported architecture, original machinery, paving/dressing,
background scenery and the review-only blockout. Imported textures are packed.
Original downloads, metadata and SHA-256 hashes are retained under
`art/imports/environment`. The older courtyard masters remain the baseline.

The original export baked a reflection probe, batched the proof courtyard as one
room with 6 m backdrop cells, and produced Meshopt/KTX2 exports. Checkpoint B extends
this pipeline with a separately delivered quay and retains the same source checks. The
command checks the master hash before/after export. It never saves the source.
Normals use UASTC/Zstandard; suitable color and packed maps use ETC1S. Desktop
color maps remain at their native resolution up to 1K; mobile facade color is
512, other mobile maps are 256 except 512 paving. No textures are upscaled.

`npm run assets:environment:author` is the explicit one-time composition script.
It recreates the proof from the baseline and imported sources and **overwrites
the environment master**. Do not run it after editing the master in Blender.
It is not part of normal builds. `npm run assets:build` reads saved sources and
includes the environment export after the existing character and weapon builds.

The panoramic reflection bake is a low-resolution lighting approximation from
the actual source scene. It is not real-time reflection. Source PNG and cached
build outputs are separate from the compressed runtime textures.

The QA review page is `docs/qa/ash-quay-rebuild/index.html`. Review the real browser
views, not the district diagram, as evidence of completed art. Main remains
unchanged until the user explicitly requests merging this milestone.
