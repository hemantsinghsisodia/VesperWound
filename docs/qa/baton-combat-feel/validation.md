# Baton responsiveness and swing repair — validation

Review branch: `codex/baton-combat-feel`, based on main `d650e17`.
Implementation is ready for gameplay/art review; it has not been merged.

## Delivered behavior

- One pending baton follow-up survives the current strike. The latest light/heavy
  press replaces it, preserving within-tick press order. Holding never repeats.
  Recovery dodge wins and clears it; windup/active frames remain committed.
- Light durations are 450/500/600 ms, with active windows 150–250,
  166.7–283.3 and 200–333.3 ms. Heavy is 800 ms, active at 350–500 ms.
  Per-hit health damage remains 21/27/36/48; posture, enemy tuning, pressure,
  knockback and critical multiplier are retained.
- Controlled attack entry blends for 50 ms. The selected pose follows CPU action
  time plus the fractional render interval, at most one fixed tick ahead; CPU
  swept contact alone resolves damage. Existing locomotion/studio blends remain
  180 ms. Leaving controlled playback resumes the existing preview cameras.
- Saved Blender actions have a common forward guard, compact forehand/backhand,
  diagonal finisher, overhead heavy, less extended wrist and outward elbow plane.
  Attack supporting feet remain planted; accepted walking/running leg cycles,
  Medic mesh/rig, grip attachment and weapon geometry are retained. No forward
  attack step or invisible reach enlargement was added.

## Controls, visual contact and comparisons

Chrome 155.0.8059.85, desktop Windows. Actual WebGPU and WebGL2 rendering,
plus emulated Pixel 7 landscape (915 × 412). Touch contact was checked on WebGPU;
the mobile gait/training-combo captures use WebGL2. This is not a physical phone.

| Observation | First observed attack state | First observed shaft motion | Maximum active shaft error |
| --- | ---: | ---: | ---: |
| baton-webgpu | 7.60 ms | 7.60 ms | 1.69 cm |
| baton-webgl2 | 14.20 ms | 14.20 ms | 1.97 cm |
| baton-mobile | 27.60 ms | 27.60 ms | 1.96 cm |

These are individual warm real-input observations, not a latency percentile or
guarantee for every device. Unit tests establish next-update simulation entry.
Every attack was sampled in the browser; base and tip remained below the 3 cm
acceptance threshold against the exported CPU path. Compressed-GLB tests also
sample active poses at 120 Hz and verify planted feet within 1 cm.

Three early queued light presses landed all three hits on an actual training
target on WebGPU, WebGL2 and touch/WebGL2: 100 → 16 health, three strikes and three
hits, with no unsolicited fourth swing. Near/far/side/rear, obstruction, moving
targets, deduplication, pressure, stagger and critical regressions also pass.

| Matched 15-second real-input single-zombie routine | Completed victories | Hits / criticals / blocks | Observed health damage received |
| --- | ---: | ---: | ---: |
| Original main | 2 | 6 / 2 / 4 | 0 |
| Rebuilt baton | 2 | 6 / 2 / 4 | 0 |

The routine deliberately uses Ward and safe heavy opportunities. It proves
functional contact/defense, not that combat has become easier for a new player.
The early light-chain tests exercise the newly retained inputs separately.
Original code and animation for the baseline were served read-only from Git
commit d650e17; repaired tracked sources were never rolled back for capture.

- [Before recording](before/baton-webgpu/swing-combat.webm)
- [After swing/encounter recording](after/baton-webgpu/swing-combat.webm)
- [Early queued chain recording](after/baton-webgpu/chain-input.webm)
- [Visible training combo recording](after/baton-webgpu/training-combo.webm)
- [Side-by-side encounter comparison](comparison.mp4)
- Front/profile active-pose, windup/follow-through and gameplay captures are in
  `before/` and `after/`; full gait/action captures are in `gait/after/`.

Studio diagnostic poses isolate a chosen frame; actual-game contact traces use
the real blended runtime. Baseline captures use the original preview controls.
Video records visual output without audio. Capture/paused-studio FPS values are
not sustained-performance evidence; use the measurements below.

## Technical validation

- `npm run check`: type checking, lint, 121 unit tests in 22 files and production
  build passed. The final browser-test additions also passed type checking/lint.
- Dedicated browser coverage: 15 eligible cases passed across the final renders
  and targeted reruns (three platform-inapplicable skips). Includes gait, four
  strikes, real clicks, exact contact, early combo damage, pause/inspection and
  quality replacement and native recovery-dodge cancellation on both backends
  and touch. WebGPU contact was rerun after a development reload
  invalidated an earlier observation; no source edits occurred in the clean run.
- Existing weapon regressions: five eligible cases passed, including failure,
  late cancellation, retry, three inspection/quality cycles, session equipment,
  touch handedness/scaling, simultaneous movement and pointer cancellation.
  The lifecycle test now waits for the actual post-return eligibility prompt
  before pressing F; its earlier unsynchronized attempt failed to equip.
- Audio/input regressions: eight passed, two platform-inapplicable skips.
- Production regressions: four passed, including optional selected payloads,
  equipped inspection retention and a real three-zombie victory. Production
  development flags/commands remain unavailable.
- Resource ownership across three inspection/quality cycles: equipped resources
  53, references 6; cycle values
  53/6, 53/6, 53/6. No growth.
- Earlier lifecycle queue assertions were synchronized to the next actual fixed
  update rather than reading immediately after pointer delivery. Within-tick
  ordering, interruption/death/reset clearing and preview release have unit tests.

## Five-minute production measurements

155.0.8059.85; actual backend WebGPU, adapter reported as
{"vendor":"intel","architecture":"gen-12lp","device":"","description":""}. High quality, FXAA enabled by default,
1440 × 900 render surface, adaptive resolution disabled, 30-second warm-up.
Chrome launches with `--disable-frame-rate-limit --disable-gpu-vsync`.
No recording, screenshots, Blender authoring or concurrent test browser was run
during sampling. External requestAnimationFrame intervals include CPU submission
and scheduling; they are not isolated GPU timestamps.

| Scenario | Sample duration | p95 | Longest interval | Intervals >50 / >100 ms |
| --- | ---: | ---: | ---: | ---: |
| Armed three-zombie combat | 300.40 s | 14.20 ms | 49.30 ms | 0 / 0 |
| Detailed inspection | 300.26 s | 3.80 ms | 28.20 ms | 0 / 0 |

Combat target ≤18.5 ms: **PASS**.
Inspection target ≤35 ms: **PASS**.
Combat totals: {"encounters":23,"victories":23,"hits":312,"criticals":31,"blocks":132,"strikes":215,"multiTargetAttacks":82,"defeated":69}.
Renderer allocation samples (first → last): combat
61627222 → 61627382
bytes / 76 → 76
textures; inspection 79427337 →
79427337 bytes /
92 → 92
textures. Estimates are renderer-reported allocations, not dedicated VRAM readings.

Raw per-interval summary, allocation samples, hardware, warnings/errors and
exercise totals: [combat](performance/group-performance.json) and
[inspection](performance/cinematic-performance.json). These measurements do not
establish results on other devices. Prior desktop variability, cold-loading
hitches and the separately documented brief mission guard-activation cost remain
limitations; this pass does not claim those have been eliminated.

Reproduce with `VESPER_PERFORMANCE=1`,
`VESPER_PERFORMANCE_QA=docs/qa/baton-combat-feel/performance`, and
`npm run test:performance -- desktop.spec.ts --grep "armed (group|cinematic)"`.

## Sources and delivery

Editable source: `art/source/medic-baton-animations.blend`; explicit authoring
script and saved-source export are separate. Export verifies source hashes do
not change. The source hash is e2c0328340968f7434743a11b4d45b9ebf0f11480f0c25345d53b8a8d89bba39.
The existing Medic, baton geometry/materials and skeleton are retained.
Quaternius CC0 animation modifications and hashes are recorded in
`art/baton-provenance.json` and the accessible runtime provenance copy.

- Baton model: 9252 bytes (≤32 KiB).
- Optional armed pack: 419596 bytes (≤512 KiB), down from
  437816 bytes; it still loads only when pickup is requested.
- Bootstrap gzip: 2590702 bytes (≤5 MiB).
- Initial desktop/mobile art: 18999728 / 10470363
  bytes (≤20 / ≤10 MiB). Mobile headroom remains small.
- Every existing delivery ceiling passed `npm run size`; see
  `docs/qa/visual-delivery.json` for the complete breakdown.

No rendering quality/resolution budget was reduced. Sharp screen-space labels
are retained. Existing transactional-loading KTX2 warnings and the existing large
bundle warning may appear; runtime page-error assertions and ownership checks
pass. Automated functional results do not close the human art/gameplay gate.

## Review and remaining gates

Use the checklist in [the milestone notes](../../baton-combat-feel.md). Review
early clicks, swing direction, wrist/coat clearance, visible misses, defensive
timing and whether the faster chain feels controlled. Physical-phone performance
and first-time human combat feel remain unverified. Validation servers are
stopped at handoff; the branch remains active and unmerged.

## Review approval — 2026-10-21

The user reviewed the build, said “looks good”, and explicitly authorized committing,
merging into main and pushing. This approval supersedes the unmerged handoff above.
The recorded technical results are retained; physical-phone performance and a
first-time human combat playtest remain unverified. No further milestone is authorized.
