# Mission reliability — review branch

Branch: `codex/mission-reliability`, based on main `4c99fea`. The user approved the reviewed build and authorized commit, merge into main and push on 2026-10-17. Validation started 2026-10-16 and resumed 2026-10-17 after the approval service's usage limit interrupted execution.

## Changes

- Fixed the recorded crane-corner stall: a physically clear guard position could round to a blocked navigation cell and receive no route indefinitely. Nearby grid connections now require free-space access, and grid edges/direct routes use the same 0.3 m disc clearance as enemy collision. Wall-adjacent player goals account for Medic's narrower capsule without connecting through walls. Returning guards still move through collision at the existing speed; they do not teleport or heal.
- Added regression coverage for both recorded stuck positions using real district collision and the encounter state machine, plus rounded corners, obstruction, wall-adjacent pursuit and planning cadence.
- Added asset-manager-owned sharing of identical imported compressed textures. Content, all mip levels, colour interpretation, UV transforms and sampling settings must match. Each model retains a reference; the final release destroys the shared map. Different quality owners remain independent.
- Kept staged off-scene quay preparation, cancellation and reference-counted model ownership. No renderer throttling, GPU-wait policy, combat balance change, asset redesign or new content ships in this branch.

The investigation verified that all 25 encoded Arrival Quay images also occur in the Pressure Court package. Sharing removes redundant GPU residency/uploads where the complete texture configuration matches; it does **not** reduce the downloaded GLB bytes or eliminate decoding work.

## Checks

- `npm run check`: passed, 113 unit tests across 20 files, TypeScript, ESLint and production build.
- `npm run size`: passed every existing delivery ceiling. Bootstrap gzip 2,588,231 bytes; initial desktop 18,999,728 bytes; mobile 10,470,363 bytes (15,397 bytes below its ceiling). Assets and payload limits are unchanged.
- Complete missions passed on desktop WebGPU and WebGL2, and emulated Pixel 7 landscape WebGL2 with 1.4× left-handed controls. Recorded active-play times were 1m 21s, 1m 28s and 2m 5s respectively; these are known-route automated timings, not first-time pacing evidence.
- Mission lifecycle/presentation checks passed: failed/cancelled loads and late leases, restart with retained baton, inspection visits, quality replacement, reduced-motion compositions, skip input consumption and portrait pause. The suite has eight applicable cases; four duplicate backend lifecycle cases are intentionally skipped.
- Three repeated mission entry/exit cycles returned to the same 55 resources, 7 references, 69 listeners, 72 textures and 49,276,860 estimated GPU bytes. This functional run used adaptive 1152 × 720. The prior report used a different resolution, so its byte estimate is not a direct memory comparison.
- The touch driver initially died by committing a heavy into another guard's available attack slot. Its corrected strategy avoids that opening. A subsequent late-Ward experiment missed every counterattack window and was reverted; one rerun then stopped on a screenshot file-write error. The final complete run in `touch-final/` passed with real input, 80 health remaining and no page errors. No game balance or survival assertions were weakened.
- TypeScript and lint were rerun successfully after the test-driver correction. Both spatial-audio compatibility browser regressions passed (legacy positioning and unavailable positioning).
- All four production regressions passed: development flags excluded, selected-tier enemy loading and encounter completion, baton retention through inspection/restart, and a real-input three-enemy victory with multi-target hits, blocks and criticals.
- Five-minute production mission and inspection measurements passed their overall p95 targets; detailed results and remaining transition limits are below.

The first repeated-mission benchmark completed one route, then the automated player dodged into cargo during a later fight and died. Its 300-second metrics are retained in `mission-performance-driver-failure.json` but are **not valid active-mission acceptance evidence**. The driver now chooses a clear dodge lane from the authored obstacle layout; it still uses ordinary controls and never edits simulation state. The replacement measurement passed with four completed routes, three completed within the measured interval.

## Render evidence

- [Desktop WebGPU completion](mission-webgpu-complete.png) and [recording](mission-webgpu.webm).
- [Desktop WebGL2 machinery](mission-webgl2-winch.png) and [recording](mission-webgl2.webm).
- [Touch objectives/controls](touch-final/mission-mobile-guards.png), [completion](touch-final/mission-mobile-complete.png) and [complete recording](touch-final/mission-mobile.webm).
- Full captures include opening, preparation, approach, regulator, guards, machinery, ramp, departure and completion. Existing map/material appearance and armed presentation remain intact in the inspected images. Enlarged touch controls occupy substantial screen space; this pass does not redesign that layout.

`touch-final/` is the accepted complete touch run; root-level mobile captures are partial earlier attempts. All desktop/touch functional results were collected across the documented runs, not one uninterrupted all-green invocation.

Browser requests confirmed that mobile did not load desktop enemies or cinematic assets. The existing KTX2Loader warning during transactional quality replacement remains nonfatal; separate owners can overlap while replacement is prepared.

## Loading measurements

Chrome 155.0.8059.80, WebGPU, High, 1440 × 900, adaptive resolution off; Chrome frame limiting and GPU vsync disabled. External `requestAnimationFrame` intervals cover clicking Start mission through committed introduction. Each run uses a fresh browser context. These intervals include CPU/scheduling costs and are not GPU timestamp measurements.

| Run | Before seconds | After seconds | Before p95 ms | After p95 ms | Before >100 ms | After >100 ms | Before max ms | After max ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 5.032 | 5.416 | 68.5 | 41.4 | 11 | 3 | 333.6 | 363.9 |
| 2 | 5.040 | 4.781 | 65.6 | 36.8 | 11 | 1 | 489.1 | 376.1 |
| 3 | 5.084 | 5.234 | 60.0 | 36.9 | 10 | 3 | 404.9 | 756.0 |

Evidence: `before/loading-*.json` and `after/loading-*.json`. Baselines were recorded October 16 and final candidates October 17 on the same laptop/configuration. These three-run samples are indicative, not a statistical guarantee. Long-frame counts and p95 improved, but total loading time did not consistently improve and the candidate's worst observed hitch was worse. **Loading is not hitch-free; worst-case transition latency remains a limitation.**

A diagnostic CPU profile identified texture uploads as a major baseline cost. Experiments using GPU completion waits and eager enemy shader compilation increased readiness time and were discarded. The final renderer remains uncapped.

## Production performance

Measured on Windows 11, Intel i7-13620H laptop, Chrome 155.0.8059.80. The actual renderer adapter request selected **Intel gen-12lp**, despite the laptop also containing an RTX 4050; these are not RTX measurements. High quality, fixed 1440 × 900 rendering, adaptive resolution disabled, Chrome frame limiter and GPU vsync disabled. A 30-second warm-up precedes each 300-second measurement. External animation-frame intervals include scheduling and CPU costs, not isolated GPU timestamps.

Inspection passed: 300.162 seconds, **2.9 ms p95**, 24.9 ms maximum, zero frames over 50 or 100 ms. Allocation samples retained 91 textures and 75,437,084 estimated GPU bytes. These are renderer estimates rather than measured driver VRAM. The 35 ms inspection target passed.

The separately captured opening composition had 13.2 ms p95 and 33.9 ms maximum, with no frames over 50 ms. This separate transition observation does not override the cold-loading results above. See `inspection-performance.json` and `opening-performance.json` for raw measurements.

The corrected active-mission run passed: **300.213 seconds, 28,697 frames, 15.0 ms p95**, 49.5 ms maximum, zero frames over 50 or 100 ms. Combat contributed 16,245 frames at **15.7 ms p95**; both full-run and combat p95 meet 18.5 ms. Three routes completed during measurement; the driver finished a fourth after sampling stopped. No page errors or driver failure occurred. See `mission-performance.json`.

Mission allocation samples held at 81 textures. Estimated bytes rose from 59,938,441 to 59,939,609 (1,168 bytes during initial cycles), then remained at that value for the remaining samples. Combined with the repeated entry/exit ownership checks, no continuing resource growth was observed over this test duration.

Short phases remain visible in the data: winch approach/guard activation had 187 frames at **27.5 ms p95** (32.7 ms maximum), above the overall mission target when considered in isolation. Departure had 10.6 ms p95 / 32.1 ms maximum. The replacement run's pre-measurement loading took 2.722 seconds, with an 85.7 ms longest frame. These individual observations do not erase the 756 ms cold-load outlier recorded earlier.

## Review handoff

The user accepted the navigation repair and texture sharing on `codex/mission-reliability` and authorized integration into main. Map, assets, mission structure and accepted 50% damage increase are unchanged. Cold-loading hitches, brief guard-activation cost, first-time human pacing and physical-phone validation remain explicitly open limitations.

Run `npm run dev` from the repository to test the reviewed build, then use **Enter the Works → Start mission**. No additional package dependency is required. Validation servers were stopped before handoff.

## First-time review checklist

Play once without reading the route or watching the recording. Record:

- Time to identify and pick up the baton; any missed prompts.
- Wrong turns or uncertainty about the loading bay, regulator, winch and boarding point.
- Whether guards remain stuck while circling the crane, and whether any enemy crosses solid geometry.
- Deaths, restarts, and whether the increased damage feels satisfying or too forgiving.
- Whether the recovery interval and second encounter feel fair.
- Active-play duration and total wall-clock duration, including loading and menus.
- Any missing/replaced textures after quality changes or return to practice.
- Enjoyment (1–5), the least enjoyable moment, and whether you want another mission.

Automated routes establish functionality and known-route timing; they do not establish first-time clarity, difficulty or enjoyment. Physical-phone performance remains unverified.
