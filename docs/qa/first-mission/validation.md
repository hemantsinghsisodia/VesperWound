# First mission — validation and review

Date: 2026-10-14. Branch: `codex/first-mission`, based on main `7cd870e`.
User review, including the paving-depth correction, is approved. Commit, merge
into main and push were explicitly requested on 2026-10-14.

## What to test

Run `npm run dev`, choose **Enter the Works**, then **Start mission**. Take the
highlighted baton, follow Pump Alley, clear two guards, retrieve the regulator from
the west loading bay, clear three winch guards, install it beside the crane, then
board at the lowered ramp. **F** and the contextual touch button interact. Pause
offers restart and return to practice. Death restarts the mission; the session's
baton is retained. The default practice modes remain available.

There is no map expansion, new combat tuning, character redesign, inventory or save
system. The small ferry is a non-traversable backdrop: boarding is an interaction
at the quay edge, not a new deck area or sailing simulation. Mission props are
original editable TypeScript geometry in `src/world/mission-presentation.ts`;
they add no imported art or textures. Existing asset provenance remains unchanged.

## Functional validation

- `npm run check`: TypeScript, ESLint, 96 unit tests across 18 files, production build.
- Dedicated mission browser suite: four passed, two intentional skips of the
  duplicate lifecycle case. Full routes pass on hardware WebGPU and WebGL2 at
  1440 × 900 and emulated Pixel 7 landscape at 915 × 412. Actual browser:
  Chrome 155.0.8059.41. Touch uses left-handed controls at 140% scale.
- Routes use real keyboard/mouse or CDP touch input. Read-only diagnostics observe
  actors; tests do not teleport, damage enemies or force mission stages.
- Coverage includes objective order, reach/obstruction/action restrictions, retained
  health between waves, frozen/dead progression, generation changes, both fights,
  regulator installation, timed machinery, boarding, restart and practice return.
- Failed/cancelled enemy loads retain practice; delayed results cannot start a
  mission. Inspection retains progress. Quality replacement retains a live mission.
  Death/restart restores health, pressure and progress while keeping the baton.
- Three repeated entry/exit cycles remain at **51 owned resources, 7 references,
  67 listeners and 97 renderer textures**. See `lifecycle.json`. This is a bounded
  observed cycle check, not a proof against every possible driver allocation.
- Both existing legacy/unavailable spatial-audio browser regressions pass.
- All four production regressions pass: diagnostic exclusion, deferred enemy load,
  baton/inspection retention, and group combat through actual controls.
- No page errors in the completed mission routes. Three.js logs its multiple
  KTX2-loader warning during independent/transactional asset loading; retained
  counts settle after cleanup. The existing large-chunk build warning remains.
- The final mobile-only rerun also passes after moving the interaction button
  below Medic; one duplicate lifecycle case is intentionally skipped.

## Visual review

Actual browser captures cover preparation, regulator, powering winch, lowered ramp
and completion on each backend and mobile. The recordings include the complete
pickup/combat/objective route. Browser inspection found and corrected the sign and
wall masking the ramp, controls intersecting Medic, and a raised touch interaction
button obscuring the character after a group fight.
Desktop routes deliberately switch from High to Low at the regulator to exercise
transactional quality replacement; their later captures therefore use Low art.
The production performance runs use High throughout.

The mission uses existing art with simple original machinery/ferry props. It is a
playable first mission, not a claim of final environment or cinematic art quality.
The reported court streaks were subsequently isolated as coplanar floor z-fighting
and corrected in the saved Blender source. See the [paving review fix](paving/validation.md)
for controlled comparisons and refreshed WebGPU/WebGL2/mobile captures. The route
recordings above predate that correction.
First-time objective clarity, encounter difficulty and enjoyment require user review.

Evidence: [WebGPU route recording](mission-webgpu.webm),
[WebGL2 route recording](mission-webgl2.webm), [touch route recording](mission-mobile.webm).
Compare the [desktop boarding view](mission-webgpu-ramp.png),
[touch boarding view](mission-mobile-ramp.png), [regulator](mission-webgpu-regulator.png)
and [working winch](mission-webgpu-winch.png).

## Performance and delivery

Both five-minute production tests pass. Measurements use WebGPU, High quality,
adaptive resolution disabled, a verified 1440 × 900 canvas, 30 seconds of warmup,
and Chrome 155.0.8059.41 with `--disable-frame-rate-limit --disable-gpu-vsync`.
External requestAnimationFrame intervals include CPU/browser scheduling; these
are not isolated GPU timestamps. No concurrent browser test workload ran during
measurement. Mission measurements include traversal, fighting, resting and restart;
active-fight frames are also reported separately.

| Scenario | Measured duration | Frames | p95 | Target | Maximum | Frames >50 / >100 ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Mission | 300.226 s | 28,515 | 14.9 ms | ≤18.5 ms | 101.4 ms | 4 / 1 |
| Inspection | 300.177 s | 131,574 | 2.7 ms | ≤35 ms | 78.6 ms | 8 / 0 |

The mission's 20,136 active-fight frames have **14.7 ms p95**. Its completion
counter reached three during the recorded window; the fourth route finished after
recording stopped and is excluded from timing. Inspection shows the equipped
Medic in the studio while mission progression remains paused. Both tests report
zero page errors and no input-driver failure. Raw results:
[mission-performance.json](mission-performance.json) and
[inspection-performance.json](inspection-performance.json).

Machine inventory: Intel Core i7-13620H, Intel UHD Graphics and NVIDIA GeForce
RTX 4050 Laptop GPU. The browser adapter query reports `intel / gen-12lp` and
Chrome warns that Windows ignores `powerPreference`. That metadata is from a
separate adapter query, not a direct renderer-device probe; do not attribute these
results to the NVIDIA GPU. Actual rendering backend and canvas dimensions are
read from the running renderer's diagnostics.

Ten sampled renderer allocation estimates stay between **59,728,987 and
59,738,171 bytes** with **105 textures** for mission play, and at **74,235,480
bytes / 91 textures** throughout inspection. These are renderer-accounted estimates,
not total process or physical VRAM usage. The earlier interrupted two-minute run
is not accepted as performance evidence. Final validation servers exited normally;
ports **5173, 5182 and 4173** were verified clear at handoff.

`npm run size` passes all existing delivery limits. Mission props require no extra
downloaded art. The mobile initial-art raw payload remains close to its limit;
there is no implicit budget increase for future milestones.

| Payload | Measured MiB | Limit MiB |
| --- | ---: | ---: |
| Bootstrap, gzip | 2.465 | 5 |
| Desktop initial art, raw | 18.120 | 20 |
| Mobile initial art, raw | 9.985 | 10 |
| Optional inspection, raw | 6.455 | 40 |
| Enemy desktop / mobile, raw | 2.844 / 2.804 | 8 / 4 |
| Armed animations, raw | 0.408 | 0.5 |
| Quay desktop / mobile, raw | 7.571 / 2.166 | 12 / 6 |

Full byte counts and compressed art sizes are in `../visual-delivery.json`.

## Remaining review gates

Final scripted browser runs take 1m28s (WebGPU), 1m49s (WebGL2), and 2m06s
(touch) of simulated mission time. This does not establish the proposed
5–8-minute first-play pacing; no padding
timers were added. Physical-phone performance is unverified. Initial quay loading
still involves download/decode/upload and can pause traversal at the gate; the
retained warm section smooths subsequent trips. Performance passing does not grant
visual or gameplay approval. User review is now approved; these remaining
limitations are retained for subsequent playtesting.
