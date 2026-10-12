# Ash Quay — Checkpoint B validation

Dates: 2026-10-12–13. Review branch: `codex/ash-quay-checkpoint-b`, based on
`main` at `4c0e5da`. User approved Checkpoint B and requested commit/merge on
2026-10-13. The loading-hitch limitation below remains recorded; physical-phone
performance remains unverified.

## Delivered scope

Pressure Court connects through the 9 m Pump Alley to a 16 × 14 m Arrival Quay.
New elements include a loading canopy, harbour crane, mooring furniture, signage,
quay paving and retained CC0 factory modules. The canopy cuts away above Medic and
along the camera-to-head sight line. Court training, Medic, baton, enemy counts,
combat timing and damage remain unchanged. No missions, progression, new enemies,
full 64 m district or looped traversal were added.

The initial court stays resident. Only the selected optional quay tier loads near
the passage; an owned collision gate prevents entry until ready. Returning well
inside the court releases it. Failed requests expose Retry; cancelled requests
release late results. Quality replacement prepares the occupied section before
committing, preserving the current view on failure. CPU ground/collision/nav bounds
share an authored layout and do not depend on rendering quality.

Editable source: `art/source/ash-quay-district.blend` (packed). The accepted A master
is retained separately. Normal export checks its source hash before/after without
saving it. Explicit authoring recreates the B source and must not be used over manual
edits. Originals, hashes, license and changes are in the environment acquisition
record and accessible `/credits.html`.

## Visual inspection

Actual Chrome renders are captured for the court, alley, quay and loading canopy
on WebGPU, WebGL2 and emulated Pixel 7 landscape. Desktop viewport is 1440 × 900;
mobile CSS viewport is 915 × 412 with enlarged left-handed controls. Videos use
real keyboard/touch traversal. These are rendered assets, not concept images.

Inspection caught and corrected stretched masonry UVs, featureless paving, bright
slab joints and the canopy masking Medic's head. The final materials use a verified
CC0 scan at metre-scaled UVs; slabs have narrower dark joints. Medic remains visible
under the canopy. Surface repetition and sparse waterfront dressing remain visible;
this is a two-area review build, not a finished district or an approved art standard.

## Validation status

`npm run check`: passed, including TypeScript, lint, all 90 unit tests and production
build. Asset tests cover both exported sections, source hash, required compression,
texture limits, cutaway batches and manifest-relative paths. Five new simulation/
ownership tests cover section hysteresis, cancellation, failure, navigation and real
Rapier capsule boundaries. Two additional ownership tests cover GPU preparation
disposal/failure. `npm run size`: passed.

District browser suite: four passed, two intentionally skipped duplicate
failure/cancellation cases (covered on WebGPU). All three configurations traverse
both spaces with real input, return twice more, preserve the baton, swap quality and
check section ownership. Desktop additionally tests failed occupied-section quality
replacement and inspection entry/exit. Mobile requests no desktop/inspection tier.
All report zero page errors. One canopy batch is hidden under the loading bay.
An additional targeted mobile test passed after separating passage feedback from
the district heading. At enlarged left-handed scale, the 44 px retry button remains
visible and touch input retries the failed request, then reaches the quay. The
actual failure-state capture is `district-mobile-retry.png`.

Existing browser regressions: 11 passed, four project-specific cases intentionally
skipped. Coverage includes group victory on both backends, group load failure/
cancellation, frozen inspection, quality reconstruction, touch targeting/defense,
pointer cancellation, portrait pause, inspection disposal, ten scene reloads and six
quality swaps per backend, failed reflection replacement and relocated glTF buffers.
Both legacy/unavailable spatial-audio positioning regressions passed.

Production suite: all four passed. Development routes/diagnostics stay excluded;
enemy and armed packs load only on selection; single and group encounters reach
victory with real input; equipment persists across inspection and encounter changes.

After warmup and inspection/quality changes, consecutive unload cycles are stable:

| Configuration | Section released: textures | Estimated renderer bytes | Asset refs |
| --- | ---: | ---: | ---: |
| WebGPU High | 90 | 54,079,577 | 6 |
| WebGL2 High | 87 | 53,112,517 | 6 |
| Emulated landscape Low | 70 | 26,235,991 | 6 |

These are renderer allocation estimates, not measured total VRAM. The first visit
warms extra renderer resources; there is no growth between the measured later
cycles. All retain 38 owned resources and 63 listeners after release. Existing
multiple-active-KTX2-loader warnings appear during overlapping scene replacement;
they are recorded, not hidden.

## Delivery budgets

| Group | MiB | Ceiling MiB |
| --- | ---: | ---: |
| Bootstrap, gzip | 2.458 | 5 |
| Initial desktop art, raw | 18.115 | 20 |
| Initial mobile art, raw | 9.981 | 10 |
| Optional desktop quay, raw | 7.463 | 12 |
| Optional mobile quay, raw | 2.058 | 6 |
| Additional inspection, raw | 6.455 | 40 |
| Encounter desktop / mobile, raw | 2.844 / 2.804 | 8 / 4 |
| Armed animations, raw | 0.408 | 0.5 |

Mobile initial delivery has only 20,328 bytes of remaining headroom. Additional art
must be optional or offset by measured reductions. The quay has 29,406 triangles;
court export 111,184. Geometry is shared across environmental tiers, with different
texture compression/resolution. `assets.json` records exact files and hashes.

## Five-minute production measurements

Windows workstation: Intel Core i7-13620H, Intel UHD Graphics and NVIDIA RTX 4050
Laptop GPU installed. The actual browser-selected adapter is recorded in each JSON;
do not attribute results to the RTX merely because it is installed. Chrome
154.0.8037.98, production build, High quality, full 1440 × 900, adaptive resolution
disabled. Uncapped Chrome flags disable the frame-rate limit and GPU vsync. Scenarios
run sequentially, with 30 seconds of warmup followed by five minutes measured.
External requestAnimationFrame intervals include CPU submission and scheduling;
these are not isolated GPU timestamp queries. Long frames and allocation estimates
are recorded as well as p95. No development state mutation drives the measurement.

The initial combat run missed its gate at 22.4 ms p95 (300.38 seconds, 18 victories,
maximum 61.8 ms, three intervals over 50 ms). Initial traversal missed at 19.7 ms
p95 (301.61 seconds, 22 traversals, maximum 2378.2 ms, 47 intervals over 50 ms and
22 over 100 ms). Both raw reports are retained as `*-performance-initial.json`.
Inspection passed at 3.8 ms p95 over 300.26 seconds, maximum 20.2 ms and no interval
over 50 ms. Actual adapter: Intel gen-12lp WebGPU, not the installed RTX.

In response, the section now prepares shaders asynchronously against the actual
scene lighting before attachment. Preparation yields between meshes; asset disposal
retains its lease until that work finishes. New opaque paving fills depth before
the underlying grout plane and does not cast redundant ground-on-ground shadows.
The district HUD updates only when its displayed state changes. No combat tuning,
encounter density, camera resolution or quality target changed. All unit/route tests
and size checks were repeated after these changes; inspection presentation was not
changed. The repeated combat measurement passed at 12.2 ms p95 over 300.31 seconds,
with 18 victories, maximum 36.1 ms and no interval over 50 ms. Estimated renderer
allocation stayed at 58,557,103 bytes / 80 textures in all ten samples.
The traversal repeat passed its p95 gate at 11.7 ms over 300.27 seconds and 23
traversals. It still recorded 128 intervals over 50 ms, including 104 over 100 ms;
maximum was 375.8 ms. The maximum fell from 2378.2 ms, but the number of long
intervals increased. Repeated section unloading/reloading is therefore **not yet
hitch-free**, despite passing the stated p95 gate. These measurements include
loading/preparation and disposal; attribution to a specific stage requires a trace.
Treat that as a visible limitation during review, not a resolved performance issue.
Traversal samples stayed within 57,524,180–58,493,329 estimated renderer bytes,
with 73 or 98 textures depending on section readiness; the last three samples are
identical at 58,493,329 bytes / 98 textures. No page errors occurred.

| Final scenario | Measured seconds | p95 ms | Target ms | Max ms | >50 ms / >100 ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| Armed group combat | 300.31 | 12.2 | 18.5 | 36.1 | 0 / 0 |
| Repeated district traversal | 300.27 | 11.7 | 18.5 | 375.8 | 128 / 104 |
| Detailed inspection | 300.26 | 3.8 | 35 | 20.2 | 0 / 0 |

Physical-phone performance remains unverified, and emulation does not establish it.

## Review route

Run `npm run dev`, enter the Works and follow the ARRIVAL QUAY sign at the south
opening. Explore the lane, crane and loading bay; walk back into the court to test
release/re-entry. Use the pause menu for existing encounters, inspection and quality
settings. Validation servers are stopped at handoff.
