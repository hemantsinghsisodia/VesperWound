# Ash Quay — Checkpoint C

Authorized 2026-10-13, on `codex/ash-quay-checkpoint-c` from approved main
`b7ff168`. Scope: smoother two-area traversal, waterfront composition and foreground
visibility. Preserve combat and playable footprint. Stop for user review; no merge,
missions, enemies or larger district expansion are authorized by this checkpoint.

## Loading ownership

Checkpoint B destroyed the optional quay on every return to the court. A three-cycle
Chrome CPU profile showed substantial native `writeTexture`/`writeBuffer` time.
Checkpoint C retains at most one completed quay lease in its owning scene. Returning
to the court detaches it and closes the passage state; re-entry reattaches the same
prepared resources. It adds no startup request. Pending cancellation still releases
late results, failures still require explicit retry, and scene disposal/quality
replacement releases the retained lease. Transactional quality replacement may
temporarily hold the old and new scenes, as before.

Textures upload individually with a frame opportunity between them. Shader
preparation also yields between meshes. The collision gate stays closed until
preparation completes. A bounded timer fallback lets preparation settle while a
background tab is not receiving animation frames. Gameplay simulation remains
independent of this presentation work.

This is a bounded cache for the current two-area scene, not a general district
streamer. Retained GPU allocation is an explicit tradeoff and is reported separately
from a leak. Do not use p95 alone to claim smooth loading: report cold-entry and warm
re-entry maxima and intervals above 50/100 ms.

## Authored changes

`art/source/ash-quay-district.blend` remains the editable packed master. Its accepted
Checkpoint B version is preserved in Git at `b7ff168`. The explicit one-time script
`tools/blender/polish_district.py` edits that saved source; it refuses to reapply
itself. `tools/blender/refine_district_visibility.py` records the subsequent browser
review corrections to repair materials and upper canopy supports. Normal
`npm run assets:environment` exports the saved master read-only.

Reuse existing verified materials. Vary quay stone UVs and restrained tints, add
repaired corners/damp seams and loading marks, concentrate freight construction in
the existing loading footprints and add crane fittings. Move the passage board to
the side and loading lamps against the facade. Upper supports cut away with the
roof while their visible bases mark collision locations. Freight collision height follows
the added upper parcels, with no change to ground footprint or combat rules.

## Validation

Run unit/type/lint/build and size checks, the district suite on WebGPU/WebGL2 and
landscape touch, disposal/quality regressions and production checks. Record actual
renders against Checkpoint B at the same viewpoints. Run five-minute uncapped
1440×900 High production combat, inspection and traversal, adaptive resolution off.
Targets remain p95 ≤18.5 ms play / ≤35 ms inspection; report loading outliers.
Physical-phone performance remains unverified. Stop servers at handoff.
