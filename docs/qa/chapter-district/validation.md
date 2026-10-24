# Milestone B validation — Last Departure district

Functional validation: 2026-10-24; resumed performance validation: 2026-10-25 (Asia/Calcutta). Branch: `codex/chapter-district`, based on `main` `ac3f17a`. Review required before merge.

## Delivered and scope limits

Five connected original blockout sectors (78 × 62 m envelope), selected-tier readiness and physical loading gates, two unlockable shortcuts, a discovered-area pause map, three checkpoints, versioned IndexedDB saves with valid backup recovery, and the complete regulator/hoist/valve objective route. Existing zombies occupy seven mandatory encounter sites and one optional site; the sentry and guardian are visibly identified as temporary workers. The optional accumulator exercises persistent 125-pressure capacity and duplicate-award prevention.

This is a navigation/persistence review, with intentionally simple blockout geometry. It is not final environment art, the new enemy milestone, or the finished 20–30-minute chapter. Original project definitions and export commands are documented in `../../chapter-district.md`; provenance is `../../../art/chapter-blockout-provenance.json`. Accepted imported art and animations are unchanged.

## Functional evidence

- Chapter browser suite: eight passed cases, ten deliberate project skips. Full navigation/hoist/valves/shortcuts/checkpoint/page-reload route passed on actual WebGPU and forced WebGL2, and mobile landscape emulation at 915 × 412 with left-handed controls and 140% scale. All chapter requests used the selected desktop/mobile tier.
- A separate WebGPU run completed all seven mandatory fights and the whole objective route through actual keyboard/mouse input, without seeded progression or state mutation. `real-route.webm` and `real-route.json` retain the result. It took about 117 seconds of active simulation for an automation that knew the layout and omitted optional exploration; this is not a first-time human pacing result.
- Navigation captures use a clearly documented pre-cleared save fixture to isolate traversal/machinery from combat. See `chapter-webgpu.webm`, `chapter-webgl2.webm`, `chapter-mobile.webm` and corresponding JSON/PNG files. Do not interpret those fixtures as combat validation.
- Failed initial loads retained practice. Cancelling delayed readiness did not enter the chapter. An unavailable adjacent section kept the portal closed; retry restored traversal. Current plus adjacent section ownership stayed at two or fewer.
- Real intake combat, Low/High quality replacement and inspection preserved progression and equipment. Fresh chapter inspection correctly remains unarmed even when baton clips are already cached.
- Native IndexedDB tests covered primary corruption with backup recovery and an explicitly aborted write retaining the committed save. Storage-denied startup remained playable and displayed the save-failure message. Unit checks reject incompatible or malformed records and prevent duplicate rewards.
- Settings pause froze chapter state. Additional mobile tests passed pointer cancellation and portrait suspension without resumed held movement.
- Four repeated chapter entry/exit cycles returned to five world labels and 71 renderer textures. Estimated renderer bytes were 61,210,976; 61,210,976; 61,211,136; 61,211,296. The 320-byte increase is retained in `lifecycle.json`; the test establishes stable visible resource counts over these cycles, not proof of unlimited lifetime behavior.
- Unit coverage includes shared/refcounted readiness, late cancellation, exactly-once disposal after owner closure, collision/export agreement, checkpoint eligibility, completed/unfinished encounter restart, alternative exploration order, hoist state, shortcuts, pressure solution and save validation.

## Actual render review

Browser captures were inspected for readable navigation geometry, selected-tier rendering, persistent map state, machinery markers and touch layout. The first mobile capture exposed duplicated overlapping objective/interaction labels and an oversized interaction button. The UI now uses one nearby interaction label, concise touch actions and a compact chapter panel below the header. Labels remain screen-space text, with no extra rendering pass.

The large flat surfaces and simple props are deliberate blockout content. Final material treatment, facade depth, skyline, industrial machinery art and ferry departure are later work. Human route clarity and checkpoint placement still require review.

## Measurement method

Production measurements use Chrome on the same Windows laptop, 1440 × 900, High quality, adaptive resolution disabled, and launch flags disabling the frame-rate limiter and GPU vsync. External requestAnimationFrame intervals include CPU, GPU scheduling and browser overhead; they are not isolated GPU timings. Each scenario has 30 seconds of warmup and five minutes of measured frames. Traversal repeatedly follows all five areas with a cleared-encounter save; inspection exercises the optional Medic studio. Chapter loading time is recorded separately. No relative comparison to the smaller, differently composed main scene is claimed.

Hardware inventory: Intel Core i7-13620H, Intel UHD Graphics driver 32.0.101.6078 and NVIDIA RTX 4050 Laptop GPU driver 32.0.16.2101. The renderer-selected adapter and browser version are recorded by each measurement. Before measurement, root/wmi BatteryStatus reported PowerOnline=true, Discharging=false and battery charge 93% for the resumed run. The earlier functional run recorded 100%; the raw performance metadata was corrected from an old harness literal using the saved WMI observation.

## Final results

`npm run check` passed: strict TypeScript, lint, **166 unit tests across 26 files**, and production build. Delivery checks passed. Four production browser tests passed, retaining development-command exclusion, on-demand assets, real single/group combat and armed inspection. The audio/short-mission regression run passed six cases (two irrelevant project cases skipped), including a complete mission and loading/cinematic lifecycle checks. Chapter-specific supplementary tests passed fresh-save unarmed inspection and touch cancellation/portrait suspension. The final mobile capture verifies the interaction label sits above Medic and its concise action button does not overlap enlarged controls.

Five-minute production results: Chrome **156.0.8078.48**, **WebGPU**, high-performance adapter query reported **Intel / gen-12lp**, 1440 × 900, High, adaptive resolution off, uncapped, external power. One full run per scenario; this does not quantify day-to-day variability.

| Scenario | Measured duration | Frames | Mean FPS | p95 | Maximum | >50 / >100 ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Five-sector traversal | 300.20 s | 72,150 | 240.36 | **5.9 ms** | 30.5 ms | 0 / 0 |
| Equipped Medic inspection | 300.16 s | 114,268 | 380.71 | **3.3 ms** | 26.3 ms | 0 / 0 |

Traversal's reporting-window p95 ranged **5.0–6.8 ms**, with 71 renderer textures and estimated allocations **61,232,743–61,236,343 bytes**. Current/adjacent section ownership never exceeded two in the samples. The driver finished nine full circuits across warmup, measurement and the final return. Inspection's window p95 ranged **3.0–3.6 ms**, with 92 textures and a constant **79,448,590-byte** estimate. These are renderer estimates, not total process or GPU-driver memory. Both absolute targets passed; there were no page or route-driver errors.

Local Continue-to-chapter-ready latency was **1.128 s** in the traversal run and **1.399 s** in the inspection run. This measures local HTTP readiness after initial game loading, not a remote download or worst-case cold startup. Warmup and initial loading are excluded from the sustained frame table. Stream transitions during traversal are included. New-encounter activation hitches were not separately profiled here; the cleared traversal fixture does not establish mixed-enemy or guardian performance. Those scenarios belong to later milestones.

The measured build and final build differ only in the contextual touch button's accessible name; it now announces the chapter interaction instead of the inherited baton-pickup label. This DOM accessibility correction has a targeted browser assertion. Rendered geometry, shaders, resolution, combat and benchmark paths were unchanged. Recordings precede the final label-anchor/accessibility refinements; the latest mobile PNG shows their final placement.

Payloads retain every ceiling (raw asset bytes; bootstrap uses gzip):

| Bucket | Delivered | Ceiling |
| --- | ---: | ---: |
| Bootstrap | approximately 2.49 MiB gzip | 5 MiB |
| Initial desktop art | 18,999,728 B | 20 MiB |
| Initial mobile art | 10,470,363 B | 10 MiB |
| Armed animation pack | 419,712 B | 512 KiB |
| Optional inspection | 6,768,730 B | 40 MiB |
| Additional chapter desktop | 3,574,817 B | 64 MiB |
| Additional chapter mobile | 3,532,341 B | 32 MiB |

The chapter totals include the reused optional zombie payload. Five original blockout section files total only **3,469 bytes per tier**; each is far below its 12/6 MiB ceiling. The accepted initial mobile art still has only **15,397 bytes** spare. Full-art district budgets must be rechecked in Milestone D. See `delivery.json` for exact bootstrap size.

Existing KTX2Loader overlap warnings appeared during transactional scene/quality loading. No page errors or increasing texture counts were observed in the exercised cycles; the warnings were not treated as proof of a leak or suppressed. The build retains its existing large-chunk advisory. An initial sandbox-only Vitest attempt failed to resolve temporary modules; the unsandboxed full check passed, and the final check was repeated after the fixes.

## Reproduction

- `npm run check`
- `npm run size` after a production build
- `npx playwright test --config playwright.chapter.config.ts`
- `npx playwright test --config playwright.chapter-regression.config.ts -g "audio positioning|complete mission|cinematic|cancel|failure"`
- `npm run test:production`
- PowerShell: `$env:VESPER_PERFORMANCE='1'; npx playwright test --config playwright.performance.config.ts chapter.spec.ts`

For future runs, verify power independently and set `VESPER_POWER_NOTE` or retain a fresh device/power record. The browser cannot establish AC-power status itself. The benchmark intentionally runs one GPU scenario at a time. Logs and JSON are retained alongside the captures and recordings.

## Review gates

Use the first-time checklist in `../../chapter-district.md`. Human navigation clarity, optional-path discoverability and checkpoint placement remain unverified. Physical-phone performance remains unverified; desktop mobile emulation is not device measurement. Three independent first-time chapter playtests and the 20–30-minute median target belong to the finished chapter gate.

The branch stays active and unmerged. Validation servers are stopped. Ports 4173, 5186, 5187 and 5173 were checked with no listeners at handoff.
