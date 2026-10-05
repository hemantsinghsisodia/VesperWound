# Visual milestone validation — Iona and Ash Quay

Implemented on 2026-10-05 with GPT-6.1 Sol / High. Status: ready for visual review; desktop acceptance checks passed, physical-phone validation remains open. This milestone presents original character/equipment art, a compact courtyard, and animation inspection. Phase 2 movement, player collision, damage, health and death remain outside this delivery.

## Delivered

- Default **Enter the Works** destination: Iona at Ash Quay, approximately 16 × 16 metres around an original pressure-engine landmark.
- Courtyard/character views, 45-degree turn control, and idle/walk/run/attack/dodge selector on desktop and touch. Attack/dodge return to idle through a crossfade.
- Original waxcloth coat, harness, boots, hair, pressure lantern, wake-hook, machinery, walls, paving modules, steps, conduits, drains, lamps, covers, and debris. Verified free scan materials, human base/skin and crate complement these assets.
- Packed, separately editable Blender masters; optimized desktop/mobile GLBs with embedded mipmapped KTX2 textures and Meshopt geometry/animation compression.
- Scanned surface AO plus baked geometric contact AO, damp overlays, restrained fog, pressure-light/steam animation, one shadowed directional light and three unshadowed point lights. High/Ultra retain quality-dependent bloom.
- Manifest-relative model loading and model-relative external dependencies. Quality swaps retain the current scene until a replacement compiles and renders successfully. Asset handles, reflection targets, lights, and post-processing have explicit disposal owners.
- Original technical courtyard through development-only `?scene=foundation`. Production ignores developer flags and excludes diagnostics and the foundation scene module.

## Asset and delivery budgets

| Gate | Result | Limit |
| --- | --- | --- |
| Desktop Iona | 41,989 triangles; texture dimensions ≤2K | 35–50K, 2K |
| Mobile Iona | 15,991 triangles; texture dimensions ≤1K | 12–20K, 1K |
| Bootstrap, entire non-showcase distribution gzip estimate | 883,575 bytes (0.84 MiB) | ≤5 MiB |
| Initial desktop art, manifest + both models, raw | 15,513,033 bytes (14.79 MiB) | ≤20 MiB |
| Initial mobile art, manifest + both models, raw | 5,295,849 bytes (5.05 MiB) | ≤10 MiB |

Art limits use uncompressed file bytes, which is stricter than requiring gzip delivery. Only the selected variant is requested; tests assert that initial entry does not request the other variant. Bootstrap accounting conservatively includes all other distribution files, including decoder copies, fonts, technical fixture files, and notices. Real HTTP transfer sizes depend on server compression and caching. See `docs/qa/visual-delivery.json` and `art/asset-report.json`.

## Checks and render inspection

- `npm run check`: typecheck, lint, 18 unit tests, production build passed.
- Foundation browser regressions: 18 passed; six project-specific cases skipped. Includes modern/legacy/unavailable spatial audio positioning, settings, storage, input cancellation, orientation, missing-content recovery, quality presets and original ten-cycle fixture soak.
- Visual browser regressions: two passed for WebGL2 desktop/phone landscape; four passed across hardware WebGPU and hardware WebGL2. Includes all clip transitions, attachment alignment, foot-height samples, front/side/back inspection, touch target dimensions, portrait pause/resume, selected-variant loading, ten scene reloads, six quality swaps, failed-load recovery, and a relocated glTF with an external buffer.
- Production isolation test passed. The initial five-second readiness assertion was too short for the larger art payload under concurrent rendering tests; the production suite now uses the same 30-second readiness allowance as integration tests. No loading error was suppressed.
- `npm run size`: all three gates passed. No production debug chunk or foundation courtyard chunk is emitted.

Actual screenshots and pose samples are under `docs/qa/visual`; [comparison gallery](visual-comparison.md). Chrome 154 on Windows was used. Dedicated hardware projects use Chrome's default graphics path; desktop/phone integration projects use SwiftShader for reproducible compatibility checks. Software-rendered FPS is not treated as physical-device performance.

Visual inspection corrected excessive geometry, an incorrect cloth bake, optimizer removal of empty sockets, shoulder/head overlap, hair coverage, lantern overexposure, equipment tilt, foot contact, and excessive brass emphasis on drainage. Runtime art is an authored real-time interpretation of the concept sheets, not a reproduction of their illustrated lighting/detail. Final visual style remains subject to user review before Phase 2.

## Ownership and recovery

`docs/qa/visual-lifecycle.json` records before/after snapshots for ten reloads and six swaps. Asset references remain at two; owned resources and listener counts stay stable. Texture counts remain bounded and GPU allocation estimates do not show continuing growth. Small shader-cache warmup fluctuations are recorded rather than hidden. An early test detected a per-load reflection allocation; explicitly owning the prefiltered reflection render target and disposing its generator resolved it. Failed mobile model loading retains the desktop scene and can be retried.

These are application ownership and renderer-estimate checks, not a direct driver VRAM or browser-heap measurement. The existing shared cache tests also cover late completion after disposal and idempotent release.

## Desktop performance

The final ten-minute production measurement **passed**. Chrome 154.0.8037.95 on Windows selected hardware WebGPU on Intel architecture `gen-12lp`; the exact product/device description was not exposed. A 30-second warmup preceded 600.37 measured seconds at fixed High quality, full 1440 × 900 main render-buffer resolution, adaptive resolution disabled, and the default courtyard/idle view. An external requestAnimationFrame observer records display-paced intervals without enabling application diagnostics. These intervals include presentation cadence; they are not isolated GPU execution timestamps. Complete evidence: `docs/qa/visual-desktop-performance.json`.

| Final measurement | Result |
| --- | --- |
| Retained frame intervals | 35,726 |
| Mean FPS | 59.51 |
| Aggregate p95 | **16.8 ms**, target ≤18.5 ms |
| Maximum interval | 66.7 ms |
| Intervals above 50 ms / 100 ms | 11 / 0 |
| Page errors / missing-vertex-attribute warnings | 0 / 0 |

One 30-second sample dipped to 52.6 FPS / 33.4 ms p95; it remains in the aggregate rather than being removed. The full run satisfies the approved p95 gate, not a claim of perfectly uniform frame pacing. The test also asserts visible-page state, uninterrupted duration and no page errors. Ownership is validated separately by the reload/quality suite above. Chrome emitted its platform warning that Windows ignores `powerPreference`; both occurrences are retained in the evidence.

The earlier development-server run was rejected after Windows slept and Chrome displayed `ERR_NETWORK_IO_SUSPENDED`. Its partial samples are not a completed performance result. The production rerun temporarily requests that Windows remain awake; the request is released in a `finally` block and does not change the saved power plan. Steam was corrected from point primitives to textured sprites before this rerun, removing a missing-UV warning and supporting consistent particle size on both backends.

The first uninterrupted production run measured 600.63 seconds on Intel Gen-12LP / Chrome 154: 56.37 mean FPS, p95 33.2 ms, maximum 66.6 ms, nine intervals over 50 ms, no page errors. It **failed** the p95 target. Its complete evidence is retained in `docs/qa/visual-desktop-performance-before-bloom.json`. High bloom was subsequently changed from half- to quarter-resolution while keeping the main scene at full 1440 × 900 resolution; Ultra retains half-resolution bloom. The final rerun explicitly asserts the main render-buffer dimensions so resolution reduction cannot mask cost. All six showcase rendering/lifecycle cases and production isolation were repeated successfully after this change.

This result covers one host/browser/preset and the representative visual scene. It does not establish Phase 2 combat, crowds or physical phone performance.

## Remaining external gate

Physical Android/iPhone performance, thermal behavior and touch ergonomics remain unverified. Phone landscape emulation verifies rendering and layout only. No claim of the physical-phone frame target is made.

## Reviewable artifacts

- Blender: `art/source/iona-desktop.blend`, `iona-mobile.blend`, `ash-quay-desktop.blend`, `ash-quay-mobile.blend`.
- Runtime: `public/assets/showcase/desktop` and `mobile`.
- Provenance/licenses: `art/provenance.json`, [asset record](visual-assets.md), `public/assets/licenses`.
- References: `art/references/iona-design.png`, `ash-quay-composition.png`, exact built-in imagegen prompts in `art/references/generation-prompts.json`.
- Renders, poses, lifecycle, delivery and performance evidence: `docs/qa/visual`, `visual-lifecycle.json`, `visual-delivery.json`, `visual-desktop-performance.json`.

The art build is reproducible through `npm run assets:fetch` and `npm run assets:build`. Manual Blender edits must be preserved before regenerating the procedural masters. App builds do not invoke Blender or download assets.
