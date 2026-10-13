# Ash Quay — Checkpoint C validation

Date: 2026-10-13. Branch: `codex/ash-quay-checkpoint-c`, from approved main
`b7ff168`. User review complete; merge and push approved on 2026-10-13. Physical-phone performance remains unverified.

## Changes and boundaries

The two-area route and all combat remain intact. The scene now retains one completed
quay lease after first entry, detaches it on return, and releases it on scene
disposal or quality replacement. Re-entry avoids another download, decode and GPU
upload. Initial startup still requests no quay. Pending cancellation and failed-load
retry retain their original behavior. This trades bounded resident memory for smooth
return visits; it is not an unlimited streaming cache.

The saved Blender master adds varied scanned paving UVs and restrained tint, loading
marks, freight construction/stacking and crane fittings. The direction sign moves
beside the opening and loading lamps move against the facade. Upper canopy supports
cut away with the roof; visible bases retain collision cues. Freight height bounds
match the extra parcels, without expanding their ground footprints. No character,
weapon, enemy count, damage, timing, mission or district expansion was added.

The source/export workflow and license records are in `../../ash-quay-checkpoint-c.md`
and `../../../art/environment-provenance.json`. Normal export verifies that the saved
master is unchanged. The accepted B source remains available at commit `b7ff168`.

## Actual browser comparisons

Matched court, alley, quay and canopy captures are produced on WebGPU, WebGL2 and
emulated Pixel 7 landscape. B captures remain in `../ash-quay-checkpoint-b/`.
This is a focused polish pass, not a new likeness target or a finished 64 m district.
Browser inspection caught flat blue repair patches and a support masking Medic;
the repair now uses scanned stone and the upper support participates in cutaway.

## Technical checks

`npm run check` passed: TypeScript, lint, 92 unit tests and production build.
`npm run size` passed. Tests add coverage for a single warm lease, reattachment
without a new load, disposal while detached, and cancellation before first completion.
All five district cases passed on the final assets: four in the full run and the
cancellation case in a targeted rerun after replacing its fixed 2.5-second delay
with a bounded poll for the same cleanup requirement. Four duplicate backend cases
were intentionally skipped. Coverage includes both desktop backends and enlarged left-handed landscape
controls, retry, cancellation, occupied-section quality rollback, inspection, warm
re-entry without requests, and scene reload releasing the retained lease. All three
configurations report zero page errors. Final art captures were refreshed after the
last tint-export correction. All four production regressions passed, including
real-input single/group victories, explicit payload loading and baton retention.
Both legacy/unavailable spatial-audio positioning regressions passed.

Consecutive warm traversal cycles reported identical ownership and allocation
estimates for each configuration:

| Configuration | Textures | Estimated GPU bytes | Asset references | Resources | Listeners |
| --- | ---: | ---: | ---: | ---: | ---: |
| WebGPU High | 97 | 55,261,764 | 7 | 39 | 63 |
| WebGL2 High | 97 | 54,172,927 | 7 | 39 | 63 |
| Emulated mobile Low / WebGL2 | 95 | 27,298,288 | 7 | 39 | 63 |

The retained quay adds one reference/resource to the initial baseline of six/38.
Scene reload restores that baseline. These are renderer estimates, not total VRAM.
Mobile requested only its selected quay tier and no inspection payload.

The exporter now assigns paving tints before material deduplication. A regression
assertion requires all three distinct tints in both exports; applying them after
deduplication had incorrectly collapsed the variants. The size reporter publishes
through a temporary file to avoid the observed Windows lock on the existing report.

## Delivery budgets

| Group | Delivered MiB | Ceiling MiB |
| --- | ---: | ---: |
| Bootstrap, gzip | 2.459 | 5 |
| Initial desktop art, raw | 18.115 | 20 |
| Initial mobile art, raw | 9.981 | 10 |
| Optional desktop quay, raw | 7.571 | 12 |
| Optional mobile quay, raw | 2.166 | 6 |
| Additional inspection, raw | 6.455 | 40 |
| Encounter desktop / mobile, raw | 2.844 / 2.804 | 8 / 4 |
| Armed animation pack, raw | 0.408 | 0.5 |

Only 20,146 bytes remain in the mobile initial-art allowance. Quay delivery is
separate and requested only near the passage. The final quay export has 31,826
triangles, 104 meshes and 25 textures. Source textures are not upscaled. Texture ceilings
remain 1K desktop / 512 mobile for this environment. Exact bytes and hashes are in
`assets.json`; complete delivery totals are in `../visual-delivery.json`.

## Loading diagnosis and measurement method

A three-cycle Chrome CPU profile of B identified substantial self time in native
`writeTexture` and `writeBuffer`. That supports upload churn as a contributor, not
an exclusive attribution of every long frame. Raw diagnostic traces are in ignored
`.cache/district-traces/`; compact evidence is retained with this report.

Final acceptance runs use installed Chrome, real input, production assets, full
1440×900 High, adaptive resolution disabled, and uncapped rendering. Each scenario
has 30 seconds warmup and five minutes measured. External animation-frame intervals
include CPU submission and scheduling; they are not GPU timestamp queries. Cold-entry
diagnostics are recorded separately because warmup excludes first load.
Chrome is 154.0.8037.98 on Windows; the actual selected adapter is Intel gen-12lp.
The workstation also has an RTX 4050, but these measurements are not attributed to it.

Checkpoint B traversal: 11.7 ms p95, maximum 375.8 ms, 128 intervals over 50 ms,
104 over 100 ms. Final C traversal recorded no interval over 50 ms after warmup;
the cold-entry diagnostic below remains a separate limitation.

The final **unprofiled short diagnostic** recorded these real-input cycles:

| Cycle | p95 ms | Max ms | >50 ms | >100 ms |
| --- | ---: | ---: | ---: | ---: |
| Cold entry and return | 15.6 | 125.3 | 9 | 5 |
| Warm re-entry and return | 12.7 | 19.1 | 0 | 0 |
| Second warm re-entry and return | 11.7 | 19.8 | 0 | 0 |

`loading-diagnostic.json` retains the compact evidence. CPU tracing was disabled for
these final frame samples. **Cold entry is still not hitch-free.** The retained lease
addresses repeated uploads; it does not establish zero cold-load stalls on all
devices. The five-minute runs exclude cold entry during their explicit warmup and
must not be used to conceal this limitation.

## Five-minute production results

The completed five-minute combat run passed at 11.7 ms p95 (300.30 seconds,
17 group victories, 29 criticals, 116 blocks). Its maximum was 106.5 ms, with one
interval over 50/100 ms. Inspection passed at 2.7 ms p95 (300.21 seconds), maximum
27.7 ms, with no interval over 50 ms. Both used the Intel gen-12lp WebGPU adapter
at full resolution; detailed samples and renderer allocation estimates are in
`group-performance.json` and `cinematic-performance.json`.

Final traversal passed at 12.6 ms p95 over 300.34 seconds, with 26 traversals
including warmup. Maximum interval was 38.6 ms, with **zero intervals over 50 ms**.
This removes the repeated-loading spikes observed in B's sustained traversal test,
while retaining the 125.3 ms cold-entry caveat above. No scenario reported a page
error. The separate opt-in CPU diagnostic was intentionally skipped in the five-minute
suite to avoid contaminating the measurements.

| Scenario | Measured seconds | p95 ms | Target ms | Max ms | >50 ms / >100 ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| Armed group combat | 300.30 | 11.7 | 18.5 | 106.5 | 1 / 1 |
| Detailed inspection | 300.21 | 2.7 | 35 | 27.7 | 0 / 0 |
| Repeated district traversal | 300.34 | 12.6 | 18.5 | 38.6 | 0 / 0 |

Known renderer warnings remain: Windows ignores the requested adapter power
preference, and overlapping scene/inspection loads report multiple active KTX2
loaders. Those warnings are retained in the raw reports, not suppressed.

Allocation samples plateaued during the measured runs: combat at 58,557,263 bytes
(last eight samples), inspection at 74,263,405 bytes (all ten), and traversal at
58,708,033 bytes (last three, following 480 bytes of metadata growth).

## Review route

Run `npm run dev`, enter the Works and follow the ARRIVAL QUAY sign. Inspect the
loading bay, crane and waterfront; return to the court and revisit. Use the pause
menu for encounters, inspection and quality changes. Stop at user review before
merging or starting another milestone.

Validation servers have stopped. Final listener checks found neither port 5173
nor port 4173 in use. The user approved committing Checkpoint C, merging into main and pushing on 2026-10-13.
