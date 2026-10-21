# Edge quality — review build

Branch: `codex/edge-quality`, from main `b0b3f3d`. Authorized 2026-10-18; final validation resumed 2026-10-19 after the automatic approval service reached its usage limit. Awaiting user review; do not merge or push without explicit instruction.

## Changes

- Added persisted **Smooth edges (FXAA)**, enabled by default including migration of older preferences. It applies to gameplay and inspection on both WebGPU and WebGL2. HTML text and controls are outside the filter.
- FXAA receives tone-mapped sRGB exactly once through an owned RGBA8 render target with no depth or multisampling. Render resolution, adaptive-resolution limits and quality-tier shadow sizes are unchanged.
- When smoothing is enabled, High quality uses a nine-sample quarter-resolution tent filter for its restrained highlight glow, combining extraction and filtering in one pass instead of three. This offsets part of the extra full-resolution AA pass. Ultra retains its existing bloom; lower tiers retain no bloom. Switching smoothing off restores the previous post-processing path.
- Softened the courtyard directional shadow radius from 1 to 1.5 using the existing five PCF samples. The 24-metre shadow footprint is retained to avoid cutting off shadows during traversal/cinematics. No extra shadow samples or larger maps.
- Render targets belong to `RendererAdapter` and are released during reconfiguration/disposal. CPU simulation, combat, assets and camera framing are unchanged.

## Visual evidence

Actual Chrome renders, not generated mockups:

- [Before](before.png) and [WebGPU after](edge-webgpu/court-smooth.png).
- [WebGPU smoothing off](edge-webgpu/court-off.png) / [on](edge-webgpu/court-smooth.png).
- [WebGL2 off](edge-webgl2/court-off.png) / [on](edge-webgl2/court-smooth.png).
- [Mobile landscape off](edge-mobile/court-off.png) / [on](edge-mobile/court-smooth.png), emulated Pixel 7, left-handed controls at 1.4×.
- Inspection portraits: [WebGPU off](edge-webgpu/portrait-off.png) / [on](edge-webgpu/portrait-smooth.png); [WebGL2 off](edge-webgl2/portrait-off.png) / [on](edge-webgl2/portrait-smooth.png).
- District coverage: [WebGL2 loading bay](webgl2-quay.png), [WebGL2 departure](webgl2-departure.png), [touch loading bay](mobile-quay.png).

The camera is matched; live idle poses and vent markers can differ. Visible improvement is concentrated on rails, paving diagonals, the engine base and character outlines. FXAA mildly softens fine image detail. It cannot reconstruct geometry/detail lost at reduced resolution, remove all subpixel shimmer, or replace a higher-resolution shadow map. These are spatial filters with no temporal history/ghosting system.

The original FXAA-only screening had too much cost. `screening.json` and `optimized/screening.json` retain those short exploratory runs. System variability was substantial between them; use the five-minute comparisons below for acceptance rather than comparing across the two short sessions.

## Functional and ownership validation

- `npm run check`: passed TypeScript, ESLint, 113 unit tests in 20 files, and production build. The final isolated rerun passed unchanged after an earlier concurrent run hit three 5-second unit-test timeouts.
- `npm run size`: all existing ceilings passed. Bootstrap gzip 2,589,696 bytes; initial desktop 18,999,728 bytes; initial mobile 10,470,363 bytes. Art payloads are unchanged; mobile still has only 15,397 bytes of margin.
- `npx playwright test --config playwright.edge.config.ts`: all three production-browser cases passed, on desktop WebGPU, desktop WebGL2 and mobile landscape WebGL2.
- Targeted foundation browser regressions: seven passed (legacy/unavailable spatial audio, settings pause/persistence and touch pointer cancellation); one desktop duplicate of the touch-only test was intentionally skipped.
- `npm run test:production`: all four cases passed, covering excluded development commands, selected enemy loading and real combat, armed-animation loading/session retention/inspection, and the three-enemy encounter.
- Complete WebGPU missions passed in both production performance runs. The isolated WebGL2 route passed with quality replacement, departure, restart and return to practice; its first concurrent attempt timed out waiting for quality replacement. See `mission-webgl2.json`.
- **Full touch-mission automation did not pass this run.** With smoothing on, the driver died during the three-guard fight in both the concurrent and isolated runs. A control run with persisted `smoothEdges:false` also died, during the first fight. This does not isolate the failure to AA; it also does not establish a successful full touch route. No combat or driver behavior was changed to force a pass. Actual touch loading-bay/guard renders, enlarged left-handed controls and the dedicated edge/input tests passed. Human touch-mission review remains needed. Local diagnostic logs: `.cache/edge-mobile-isolated.log` and `.cache/edge-mobile-off.log`.
- Validated default/migrated preferences, persistence after reload, off/on cycles, fixed drawing-buffer dimensions, inspection visits, Low/Ultra/High replacements, portrait pause and mobile exclusion of cinematic assets.
- Three off/on cycles returned identical allocations for each mode. High WebGPU: off 72 textures / 57,506,924 estimated bytes; on 71 textures / 61,395,734 bytes. The net increase is approximately 3.71 MiB, with two small glow targets removed and one full-resolution AA input added. These are renderer allocation estimates, not measured driver VRAM.
- WebGL2: off 72 / 56,539,428; on 71 / 60,423,307. Mobile: off 68 / 26,195,010; on 69 / 27,716,201. See each `edge-*/lifecycle.json`.

## Initial edge-pass performance (before the label review fix)

Measured 2026-10-18 on the same Windows laptop used for the prior milestone (Intel i7-13620H), Chrome 155.0.8059.80, WebGPU. The renderer's actual `high-performance` adapter request selected **Intel gen-12lp**, not the laptop's RTX 4050. The candidate records adapter requests explicitly; baseline files record a separate adapter probe returning the same Intel family.

High quality, **1440 × 900**, adaptive resolution disabled, Chrome frame limiter and GPU vsync disabled. Each run had 30 seconds of warm-up followed by at least 300 seconds of external `requestAnimationFrame` measurements. These intervals include scheduling/CPU cost; they are not isolated GPU timestamps. Other browser validation was idle during these measurements. The off baseline uses the old High glow and no FXAA, with the same revised shadow radius as the candidate.

| Scenario | Off p95 | Smooth p95 | Off max | Smooth max | Off / smooth frames >50 ms | Target |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Full mission | 15.2 ms | **11.8 ms** | 261.2 ms | 80.8 ms | 12 / 7 | ≤18.5 ms |
| Combat frames within mission | 15.6 ms | **12.1 ms** | — | — | — | ≤18.5 ms |
| Detailed inspection | 3.0 ms | **3.5 ms** | 10.0 ms | 12.3 ms | 0 / 0 | ≤35 ms |

Mission durations: off 300.237 seconds / 30,416 frames; smooth 300.201 seconds / 31,288 frames. Both completed three mission routes during sampling and finished the active route afterward. No page errors or driver failures. The smooth run had no frame over 100 ms; the off run had three. Inspection durations were 300.149 / 300.158 seconds; neither had a frame over 50 ms. Evidence: [`baseline/mission-performance.json`](baseline/mission-performance.json), [`smooth/mission-performance.json`](smooth/mission-performance.json), [`baseline/inspection-performance.json`](baseline/inspection-performance.json), [`smooth/inspection-performance.json`](smooth/inspection-performance.json).

This pair meets both targets and shows no mission regression, while inspection adds **0.5 ms p95**. It is one paired measurement, not a statistical guarantee of a speed-up. Workload timing and system variability affect the mission tail; the simpler glow also changes GPU/submission work. No blanket claim of free AA or a guaranteed FPS gain is justified.

Smooth mission allocations held at 80 textures. Estimated bytes rose 880 bytes during initial cycles (63,827,539 → 63,828,419), then stayed constant. Inspection held 92 textures / 80,630,653 bytes for all ten samples. Combined with the repeated mode/quality/inspection checks, no continuing allocation growth was observed over the tested duration.

### Loading and brief transitions

Cold mission preparation is outside the steady-state samples. Off runs took 3.919 / 3.116 seconds, with longest frames 554.2 / 338.5 ms. Smooth runs took 2.685 / 2.651 seconds, with longest frames 44.6 / 65.4 ms. These isolated observations do not establish a loading fix; previously documented cold-loading hitches remain a limitation.

Within the smooth mission run, the short winch-approach/guard-activation phase had only 196 frames and **26.5 ms p95**, above the overall target in isolation. Departure had 8.8 ms p95 / 43.6 ms max. Passing the aggregate target does not erase this brief activation cost.

Existing warnings remained: Chrome ignores `powerPreference` on this Windows path, and separately owned KTX2 loaders can overlap during transactional loading. No new shader errors were observed in the inspected renders. Five-minute WebGL2 and physical-phone measurements were not performed; WebGL2/mobile evidence here establishes functional/render compatibility.

## Floating-label review fix — 2026-10-19

The reported blur came from enemy text painted into a canvas texture, rendered at the scene's drawing-buffer resolution and then filtered by FXAA. Increasing that texture alone would leave the scene-resolution and post-processing bottleneck in place.

Enemy, training-target and mission labels now use scene-owned HTML anchored to their existing world positions. Text is rasterized at screen resolution, outside FXAA and adaptive resolution. Interface scaling changes font/layout dimensions rather than scaling a rendered text image. Labels remain non-interactive, hide outside the camera or during inspection/cinematics, and release with their scene or enemy presentation. Gameplay, combat timing and rendering-resolution budgets are unchanged.

The label layer uses integer-pixel translations, updates visibility only when it changes, and reads canvas layout dimensions only during resize. This avoids the first implementation's per-frame layout reads after HUD updates. Content and bars update only when their values change. The previous sprite textures, materials and geometries are removed.

Actual renders: [WebGPU label](labels-edge-webgpu/text-smooth.png), [WebGL2 label](labels-edge-webgl2/text-smooth.png), [enlarged left-handed touch label](labels-edge-mobile/text-smooth.png). Full-screen context: [desktop](labels-edge-webgpu/encounter-smooth.png), [touch](labels-edge-mobile/encounter-smooth.png). Matching smoothing-off captures are in the same folders; live enemy states can differ between captures.

Validation of the optimized label code:

- `npm run check` passed TypeScript, ESLint, all 113 unit tests and the production build. `npm run size` passed every ceiling; final bootstrap gzip is **2,589,968 bytes**. Art payloads remain unchanged.
- Dedicated production label regressions passed on WebGPU, WebGL2 and emulated Pixel 7 landscape with left-handed controls at 1.4×. They cover text/bar state, constant screen-space font/width with smoothing on/off, world anchoring, inspection hiding, Low-quality replacement and repeated encounter creation/disposal. Exactly one layer remains; enemy labels are removed on return to training. No page errors.
- The first optimized WebGL2 run failed a positioning assertion because separate observations were taken while the enemy was moving (11.62-pixel discrepancy against a 10-pixel tolerance). The test now pauses through the actual settings UI before reading camera/position/bounds; the unchanged application passed the isolated WebGL2 rerun without widening tolerance. WebGPU and mobile passed the original check. Logs are in `.cache/label-optimized-browser.log` and `.cache/label-webgl2-stable.log`.
- The full touch-mission automation limitation documented above remains open. These label regressions are not a replacement for a complete human touch playthrough or physical-phone performance measurement.

The first five-minute measurement of the HTML implementation **failed the combat target**: full mission p95 18.5 ms, combat p95 19.6 ms, max 69 ms, two frames over 50 ms and none over 100 ms over 300.347 seconds. Three missions completed during sampling, four including the final active route. No driver or page errors. Allocations stayed at 76 textures, with estimated bytes settling at 62,844,250 after a 1,040-byte initial rise. Loading took 2.656 seconds with an 82.9 ms maximum frame. See [initial label measurement](labels-performance/mission-performance.json). This run is retained rather than replaced by a rerun. Its conditions match the earlier protocol, but it occurred on a different day and does not isolate the label change's cost from machine variability.

The optimized implementation's five-minute mission run also **failed performance acceptance**: 300.346 seconds / 15,717 frames, full mission and combat **p95 44.5 ms**, max 75.4 ms, 40 frames over 50 ms and none over 100 ms. Two routes completed during sampling and three including the final route; no driver or page errors. Allocations remained 76 textures / 62,844,250 estimated bytes after an initial 880-byte rise. Hardware remained Chrome 155 / WebGPU Intel gen-12lp, High, 1440 × 900, uncapped with adaptive resolution off. Evidence: [optimized label measurement](labels-optimized-performance/mission-performance.json). The subsequent inspection attempt timed out after 30 seconds still in the loading state, before warm-up/sampling; **there is no new five-minute inspection result for the label fix**. The successful inspection numbers above describe the earlier edge-only build, not this final code. Diagnostic log: `.cache/label-optimized-performance.log`.

A short controlled training-scene diagnostic then alternated HTML labels visible/hidden in ABBA order, keeping WebGPU High, FXAA, 1440 × 900 and the rest of the scene unchanged. After 20 seconds of warm-up, four 20-second samples returned p95 **46.4 / 24.7 / 36.8 / 21.1 ms** respectively. Chrome layout plus style work averaged approximately **0.56 / 0.43 / 0.47 / 0.46 ms per frame**. The large variation with labels both visible and hidden does not isolate a repeatable label-rendering penalty or demonstrate zero cost. This diagnostic disables label display, not the CPU anchor projection work, and does not substitute for active-mission acceptance. See [raw label screening](labels-screening.json).

**Status at the label-only handoff:** crisp labels and functional regressions were ready for visual review, but that build's performance gate remained unmet. The follow-up below supersedes this handoff; the failed measurements remain recorded.

## FPS follow-up — 2026-10-20

Authorized on the same review branch with sharp text retained and no merge. A 15-second Chrome CPU profile of the preceding production build attributed about 46% of sampled CPU time to native `GPUQueue.writeBuffer` calls. This is CPU time at the API boundary, not isolated GPU timing or proof of a particular driver fault. The unmodified scene also produced short p95 samples of 14.3–16.4 ms during the resumed investigation, so the earlier 44.5 ms result was not consistently reproducible.

Diagnostic experiments retained in the evidence:

- [Initial draw/upload counts](fps-counts-before.json): approximately 173 buffer writes, 111 draws and five render passes per frame with smoothing enabled in the training view. These are short instrumented samples, not acceptance measurements.
- [Static batching experiment](fps-counts-batched.json): no useful reduction in that view. The experimental batching code was removed rather than retained without a measured benefit.
- [Reduced Motion diagnostic](fps-counts-reduced-motion.json): fewer uploads, but no consistent frame-time improvement. Lighting and animation behavior were therefore preserved.

Retained changes:

- HUD properties, text and state attributes are written only when their actual values change. Reads use the real DOM value so multiple HUD owners cannot leave stale state behind. Stable element references are cached, cleared on canvas replacement and released on disposal.
- Removed redundant actor/scene matrix propagation during fixed updates. Rendering now propagates transforms after interpolation; synchronous rig/contact diagnostic reads still update the matrices explicitly. Fixed-step gameplay and animation clocks are unchanged.
- The sharp scene-owned HTML labels, FXAA, lighting, assets, quality profiles and resolution budgets remain in place. No frame limiter was added.
- Added a real-browser regression that observes stable HUD text for 30 rendered frames and requires zero text-node replacements, while the existing label tests continue to check live content, anchoring, quality changes and disposal.

Follow-up functional validation:

- Final `npm run check` passed TypeScript, ESLint, all 113 tests and the production build. `npm run size` passed every ceiling: bootstrap gzip **2,590,207 bytes**, initial desktop **18,999,728 bytes**, initial mobile **10,470,363 bytes**. Mobile retains only **15,397 bytes** of initial-art headroom; this change adds no art.
- All six edge-quality browser cases passed across WebGPU, WebGL2 and emulated Pixel 7 landscape. Stable HUD text produced zero mutations over the observed 30 frames. Live labels, smoothing preference, resolution, quality replacement, inspection and bounded ownership also passed. Captures linked above show the current HUD/matrix optimization; the subsequent canvas-cache invalidation line does not alter their rendered content.
- All four production cases passed, including real encounter input, optional enemy loading, baton acquisition/retention through inspection, and the three-zombie encounter.
- Eight audio/settings/input regressions passed on desktop and emulated mobile; two platform-inapplicable cases were skipped. Legacy and unavailable spatial positioning remain supported, settings preserve audio ownership, and blur/pointer cancellation release input.
- Final production regressions include the canvas-replacement cache invalidation. Logs: `.cache/fps-final-check.log`, `.cache/fps-final-size.log`, `.cache/fps-edge-browser.log`, `.cache/fps-final-production.log`, `.cache/fps-final-foundation.log`.

The first follow-up five-minute mission run still **failed**: overall p95 **18.7 ms**, combat p95 **21.8 ms**, against 18.5 ms. It sampled 300.261 seconds / 26,728 frames, with a 94.1 ms maximum, 34 frames over 50 ms and none over 100 ms. The winch fight was the slowest combat phase (p95 27.7 ms). Three routes completed during sampling, four including the final route; no driver or page errors. Cold mission loading took 2.670 seconds with a 62.1 ms maximum frame. See [first follow-up mission](fps-final-performance/mission-performance.json). Chrome had updated to **155.0.8059.85**; the actual adapter remained WebGPU Intel gen-12lp. This result is not a successful acceptance run.

The companion inspection measurement **passed**: p95 **4.9 ms** over 300.207 seconds / 96,227 frames, max 60.1 ms, one frame over 50 ms and none over 100 ms. All ten allocation samples were **92 textures / 80,630,653 estimated bytes**, with no page errors. See [inspection measurement](fps-final-performance/inspection-performance.json). Both scenarios used High, 1440 × 900, smoothing on, adaptive resolution off, uncapped Chrome and 30 seconds of warm-up. Intervals include browser scheduling and CPU work; they are not isolated GPU timestamps.

The missed mission gate prompted a targeted second change: original repeated box props are combined by material **within each existing parent component**. Local authored transforms are baked into the existing box geometry, retaining normals, UVs, shadow flags, shared materials and ferry/ramp/gauge/drum motion. The scene owns and disposes the combined geometries. This is separate from the discarded imported-environment batching experiment above.

An instancing candidate was tested first and replaced because it added buffer writes. Short, instrumented winch-side samples reached through real mission controls recorded:

| Version | Draws/frame | Buffer writes/frame | p95 |
| --- | ---: | ---: | ---: |
| [Separate original pieces](fps-quay-before.json) | 336.6 | 246.2 | 42.1 ms |
| [Discarded instancing candidate](fps-quay-instanced.json) | 277.4 | 273.7 | 23.5 ms |
| [Combined geometry](fps-quay-merged.json) | 277.6 | 245.8 | 45.6 ms |

The combined version reduces draws about 18% without the instancing candidate's additional uploads. These ten-second samples **do not demonstrate a frame-time improvement**: session variability remains large, and player position/camera framing differ slightly within the route helper's tolerance. Actual renders: [before](fps-quay-before.png), [combined](fps-quay-merged.png). Character poses and defeated-enemy locations differ after real-input combat; machinery construction is retained. The new geometry increases the renderer estimate by approximately 18 KiB in this view; texture count remains 76.

### Final validation follow-through — 2026-10-21

The combined-geometry build's first five-minute sample met the numerical frame-time targets: **11.4 ms overall p95 / 11.5 ms combat p95**, 300.202 seconds, 31,311 frames including 17,110 combat frames, max 35.2 ms and zero frames over 50 ms. Three complete missions occurred during sampling. Estimated allocations settled at **76 textures / 62,862,986 bytes** after an initial 1,344-byte increase. Cold mission loading took 2.663 seconds, max 45.5 ms. However, the **overall test failed after sampling** when its fourth route tried to walk through the west canopy pier. The raw result is retained as a failed test, not relabeled: [combined build measurement](fps-merged-performance/mission-performance.json).

The route helper now approaches around the west canopy pier as well as the existing east crane plinth. No application navigation, collision or combat was changed. A new real-Rapier capsule regression verifies the reported position `(-4.045, 0.03, 25.046)` can follow the seaward waypoints to the winch. An initial clearance check with the enemy's larger 0.3 m disc reported an intersection at the starting corner; the actual player uses a 0.28 m capsule with a 0.015 m controller offset. The real player-collider test passed.

Backend/presentation checks:

- The full WebGPU mission passed with screenshots and recording, including quality replacement, winch progression, ramp, departure, replay and return to training. WebGPU cancellation/failure cleanup and cinematic pause/skip checks also passed. See [WebGPU departure](fps-merged-renders/mission-webgpu-departure.png).
- The video-recorded WebGL2 full-mission attempt failed when the automated player missed attack opportunities and died in the first fight. The same mission test, unchanged assertions and game rules, **passed with video capture disabled**. This supports recording overhead as a contributor; it does not isolate the exact cause. Screenshots remain available: [WebGL2 guards](fps-merged-no-video/mission-webgl2-guards.png), [WebGL2 ramp](fps-merged-no-video/mission-webgl2-ramp.png). The recorded failure remains in `.cache/fps-merged-mission-browser.log`; the passing run is `.cache/fps-webgl2-no-video.log`.
- Mobile landscape cinematic pause, Reduced Motion, quality replacement and skip-input consumption passed (`.cache/fps-merged-touch.log`). The full touch-playthrough limitation noted earlier remains separate.
- Mission HUD stacking now places objectives above world labels. A quay capture exposed a label covering the objective panel; screen-space label sharpness is retained.
- Final `npm run check` passed TypeScript, ESLint and **114 tests**, including the capsule regression; production build and every size ceiling passed. Bootstrap gzip is **2,591,236 bytes**; art payloads remain unchanged. Logs: `.cache/fps-review-check.log`, `.cache/fps-review-size.log`.

The corrected-route production benchmark **passed** on 2026-10-21: [final mission measurement](fps-review-performance/mission-performance.json). It used Chrome **155.0.8059.85**, WebGPU **Intel gen-12lp** on the same Windows laptop, **High / 1440 × 900 / FXAA on / adaptive off**, uncapped rendering, 30 seconds of warm-up and **300.215 seconds** of sampling.

| Final measurement | Result | Target |
| --- | ---: | ---: |
| Whole mission p95 | **11.4 ms** | ≤18.5 ms |
| Active combat p95 | **11.6 ms** | ≤18.5 ms |
| Inspection p95, companion five-minute run above | **4.9 ms** | ≤35 ms |

The final mission sample contains 31,067 frames, including 16,925 combat frames; max **33 ms**, **zero frames over 50 ms** and zero over 100 ms. Three missions completed during sampling, four including the final route, with **no driver or page errors**. Texture count stayed at **76**; estimated allocation rose by 880 bytes initially and then stayed at **62,862,986 bytes** through all remaining samples. Cold loading was **2.629 seconds**, max frame **44.4 ms**. Brief guard activation (`winch-approach`) remains more expensive than sustained combat: phase p95 **27.5 ms**, max 29.2 ms. Loading and that transition are reported separately rather than hidden by the aggregate.

The inspection result predates only the mission-prop batching, mission HUD stacking and test-route correction; the inspection rendering/animation path is unchanged. No second inspection benchmark is claimed. Earlier failed runs and noisy short screenings remain recorded. These results establish passing measurements on this machine, not a guaranteed speedup on every run/device or proof that all variation was caused by application changes.

**Handoff:** ready for user review on `codex/edge-quality`; no commit, merge or push performed. All validation servers were stopped, with no listeners on **4173, 4184, 5173 or 5182** at final verification. Physical-phone performance and a complete first-time human touch playthrough remain unverified.

## Review

The user approved the reviewed build on **2026-10-21** and explicitly authorized committing, merging into `main` and pushing. The handoff above records the pre-approval state; the measured results and remaining limitations are unchanged.

Run `npm run dev`, enter the works and compare **Settings → Smooth edges (FXAA)** at the same quality and resolution. Check rail/paving diagonals, the engine silhouette, moving Medic and inspection hair/glasses. Judge whether the smoothing/detail trade-off is acceptable on your display.

Physical-phone performance remains unverified. No claim of zero GPU cost or guaranteed FPS on other devices is made. Validation servers were stopped; no listeners remained on ports 4173, 4184, 5173 or 5182 at handoff. The branch remains active and unmerged, with no push performed.
