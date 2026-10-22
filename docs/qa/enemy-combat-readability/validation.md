# Enemy attack readability — validation

Review branch: `codex/enemy-combat-readability`, based on main `32ab5b4`.
Validation dates: 21–22 October 2026. Gameplay review approved by the user on
22 October, with explicit authorization to commit, merge into main and push.
Physical-phone performance remains unverified.

## Delivered behavior and source

Zombie Number 7 retains its appearance, skeleton and supplied clip names. Its
saved `Attack` revision holds a preparation pose, plants the hips/feet and
retimes the visible strike and recovery. The canonical editable source is
`art/source/zombie7-master.blend`; normal `node tools/build-enemy.mjs` exports
it read-only and verifies that its hash does not change. The explicit authoring
script is separate from normal builds. Provenance records the modification of
Tony Flanagan's supplied animation; no new imported animation or art is claimed.

The CPU owns the attack clock, direction lock, damage and contact consumption.
Rendering samples the same phase-to-animation mapping with at most one fixed
tick of interpolation. Exported 60 Hz right-hand contact samples drive swept
capsule tests, including target movement and obstruction. Ward and invulnerability
consume a valid contact once; ordinary misses produce no success event.

An amber directional arc is independent of the mint selected-target ring.
Preparation sound is keyed by generation and attack instance. `Blocked` and
`Evaded` use one sharp scene-owned label near Medic. Reduced Motion keeps the
warning static and avoids strong feedback. Pause/restart/exit stop obsolete
combat voices. Medic's accepted mesh, baton animations, attack queue and tuning
are unchanged. Enemy damage remains 20, windup 650 ms, active 120 ms, recovery
900 ms and final direction lock 250 ms. Ward and dodge windows are unchanged.

## Automated checks

- `npm run check`: passed TypeScript, lint, all 131 unit tests in 24 files and
  production build. Existing large-chunk build warning remains.
- `npm run size`: every delivery ceiling passed (table below).
- New unit coverage: phase mapping, compressed contact agreement, planted feet,
  near/far/side/rear and obstruction boundaries, warning timing/direction lock,
  contact consumption, genuine block/evade, ordinary misses and generation reset.
  Existing baton, combat, group and mission tests remain green.
- Enemy browser checks: matched combat on both backends; actual contact traces
  on WebGPU, WebGL2 and mobile; neutral source/compressed pose comparisons;
  actual keyboard dodge evasion on both desktop backends. Final targeted runs
  passed. These were several targeted runs, not one uninterrupted all-suite run.
- Existing encounter/group browser regressions: 9 passed, 9 platform-specific
  skips. Includes repeated ownership/disposal, cancellation/failure/retry,
  inspection, quality replacement, pooling, group victory and touch controls.
- Audio/input regressions: 8 passed, 2 platform-specific skips. Includes legacy
  and unavailable spatial-audio positioning, settings pause/resume, blur and
  simultaneous touch cancellation.
- Production browser suite: 4 passed in 51.3 s. Checks development code exclusion,
  selected-tier enemy loading, real encounter/group combat and retained baton.
  An earlier run timed out and was interrupted while the local command runner
  stalled; the complete retry passed without changing production behavior.
- Complete mission regressions: 3 passed in 6.5 minutes, covering WebGPU,
  WebGL2 and enlarged left-handed mobile landscape controls, both fights,
  restoration/departure, pause, quality replacement and retained equipment on
  replay. Recordings and screenshots are in `mission/`.

The existing KTX2 warning about overlapping loader instances appeared during
transactional loading/quality replacement. Lifecycle checks passed, and this is
not being represented as a newly eliminated loading warning. Cold loading and
quality replacement are outside the warmed sustained-performance interval.

Test-fixture fixes made during validation: forced active attacks now specify
their simulation clock; studio slider values follow the input step; dodge input
is held until the simulation consumes it. The development enemy studio no longer
requires Medic's baton for an unarmed subject. No combat window was loosened to
make these checks pass.

## Visual and contact evidence

Contact/comparison renders used Chrome 155.0.8059.85 on Windows. The complete
mission continuation used Chrome 156.0.8078.48 after the browser updated.
Desktop views are 1440 × 900; mobile emulation uses Pixel 7 landscape at
915 × 412. Mobile emulation does not establish phone performance.

| Actual rendered trace | Active-frame samples | Maximum base/tip error |
| --- | ---: | ---: |
| Desktop WebGPU | 52 | 1.45 mm |
| Desktop WebGL2 | 50 | 2.61 mm |
| Mobile WebGL2 | 100 | 2.42 mm |

All are below the 30 mm acceptance limit. Unit checks independently decode both
compressed tiers and compare their skeleton playback to the exported contact
path. This verifies sampled bones; it does not replace human judgment of the
visible hand capsule, anticipation or contact feel.

Evidence folders:

- `poses/`: matched front/side preparation, contact and recovery for the original
  main asset, revised uncompressed source and compressed desktop export.
- `before/enemy-webgpu/combat.webm` and `after/enemy-webgpu/combat.webm`:
  matched automated combat routines; equivalent WebGL2 recordings are adjacent.
- `comparison-before-left-after-right.mp4`: silent 20-second side-by-side edit
  of those WebGPU routines, before on the left and revised attack on the right.
  Each side uses its last 20 seconds; individual strikes are not phase-aligned.
- `after/*/contact.json`: rendered contact errors and browser/backend details.
- `after/*/defense-0.png`, `evaded.png`, `reduced-muted-warning.png`: final compact
  label and muted/Reduced Motion checks. The earlier comparison recordings
  precede the final label placement adjustment; these captures show that fix.
- `regressions/`: real group fights, stagger/critical/victory, mobile controls
  and lifecycle/allocation evidence.

The scripted 20-second WebGPU comparison completed 3 victories / 9 hits / 6
blocks before and 5 victories / 15 hits / 9 blocks after; both took 0 damage.
WebGL2 completed 3 victories / 9 hits in each run, with 6 blocks before and 4
after, also 0 damage. These routines deliberately time defenses and are affected
by frame scheduling. They demonstrate working contact and defense, not a claim
that first-time players will find the encounter easier or fairer. Dedicated real
dodge cases verified an `Evaded` label with health preserved; ordinary movement
misses do not receive that label.

The initial defense label overlapped the enemy plate in a close camera view.
It was reduced and lowered; final captures were inspected after the correction.
The open-hand strike and stationary feet are visible in source/browser poses.
Human review still needs to judge the preparation, crowd readability and any
unexpected hits in free play.

## Delivery budgets

| Payload | Bytes | Ceiling |
| --- | ---: | ---: |
| Bootstrap, gzip | 2,596,895 | 5,242,880 |
| Initial desktop art | 18,999,728 | 20,971,520 |
| Initial mobile art | 10,470,363 | 10,485,760 |
| Additional inspection | 6,768,730 | 41,943,040 |
| Desktop encounter, including manifest | 3,571,348 | 8,388,608 |
| Mobile encounter, including manifest | 3,528,872 | 4,194,304 |
| Armed pack, including manifest | 419,712 | 524,288 |

Art figures use the existing conservative raw-payload checks; compressed figures
are also retained in `../visual-delivery.json`. Mobile initial headroom remains
only 15,397 bytes. Enemy desktop/mobile meshes are 5,867 / 1,855 triangles with
65 bones and 12 retained supplied clip names. `asset-report.json` records hashes.
Encounter animation payload grew with the 60 Hz authored revision but remains
within both selected-tier ceilings. No extra rendering pass was added.

## Five-minute production performance

Both scenarios passed on 22 October. Windows, Chrome 156.0.8078.48, WebGPU,
Intel gen-12lp adapter (browser does not expose a more specific device name).
Actual canvas and viewport 1440 × 900, High, adaptive resolution disabled,
`--disable-frame-rate-limit --disable-gpu-vsync`, no application limiter.
Thirty seconds warmup precedes each measured interval. Only the current
automated browser was running; recording/encoding and other browser suites did
not run concurrently. Method: external requestAnimationFrame intervals, including
CPU submission and scheduling; these are not isolated GPU timestamp queries.

| Scenario | Duration | Mean FPS | p95 | Target | Maximum | >50 / >100 ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Active group combat | 300.373 s | 97.05 | 11.7 ms | ≤18.5 ms | 48.7 ms | 0 / 0 |
| Equipped inspection | 300.254 s | 355.48 | 3.5 ms | ≤35 ms | 22.8 ms | 0 / 0 |

Recent-frame p95 samples varied from 11.4–12.7 ms in combat and 3.2–3.8 ms
in inspection. The combat driver completed 22 group victories, 66 defeats,
279 hits, 34 criticals, 120 blocks and 53 multi-target attacks across warmup,
measurement and final encounter completion. Inspection loops the equipped
`Baton_Idle` animation; it is not a combat scenario.

Combat allocation samples were 61,629,286 bytes / 76 textures initially, then
61,629,446 bytes / 76 textures from 120 seconds onward: one bounded 160-byte
increase, then stable. Inspection stayed at 79,427,337 bytes / 92 textures.
These are renderer estimates, not whole-process memory or driver residency.
Separate lifecycle regressions cover repeated entry/exit, inspection and quality
changes. Raw metrics, adapter data, warnings and samples are in `performance/`.

The recorded current-main baseline (`32ab5b4`) is in
`../baton-combat-feel/performance/`: 21 October, same adapter, backend,
resolution, settings and measurement method, but Chrome 155.0.8059.85 rather
than this continuation's 156.0.8078.48. Its group p95 was 14.2 ms
(88.32 FPS mean, 49.3 ms maximum), and inspection p95 3.8 ms (362.52 FPS mean,
28.2 ms maximum); neither had >50 ms frames. The new p95 results are lower, but
the inspection mean FPS is slightly lower too. These are separate-day runs
across a browser update, not a fresh same-version interleaved A/B experiment.
Browser changes, scheduling and system variability prevent attributing the
difference to this code. The comparison is historical context, not proof of a
performance improvement. Both new runs meet their absolute budgets.

Cold startup, asset replacement and mission transitions are excluded from these
warmed measurements. Full mission completion passed separately on WebGPU,
WebGL2 and mobile emulation; no new loading-latency improvement is claimed.

## Review checklist

See `docs/enemy-combat-readability.md` for the full checklist. In particular:
identify the attacker while another target is selected; recognize the locked
direction; try Ward and dodge; distinguish an invulnerable evade from moving out
of reach; record any unexpected damage; assess crowd fairness with audio muted
and Reduced Motion enabled. Technical passing does not close this human gate.

Physical-phone performance is unverified. No new content, balance change or
following milestone is included. Final typecheck, lint and size checks passed.
At handoff, no validation servers were listening on 5173, 5182 or 4173.
