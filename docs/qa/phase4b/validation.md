# Phase 4B — three-zombie group encounter

Implemented and validated on 2026-10-10 on `codex/phase4b-group-encounter`, based on `main` commit `1acc2dfa10463186a2892033abf338b85deac2f2`. Main remains unchanged. This phase is ready for user combat/visual review; additional archetypes and hordes remain outside its scope.

## Try it

Check out the phase branch, run `npm ci` if dependencies are missing, then `npm run dev`. Enter the Works, press **F** to acquire the steel baton, and select **Start group encounter**. The original **Start encounter** still starts one zombie. Movement is WASD, light is left click, heavy is right click, dodge is Space and Ward is Q. **T** cycles living targets; pointer movement restores free aim so a swing can pass between two enemies. Touch uses **Next target** with the existing joystick and attack/defense buttons. Restart restores three enemies and retains the baton; Return to training restores the training targets.

## What changed

Three existing Zombie Number 7 actors share one selected-tier model load. No new asset, animation, character modification, dependency or license was introduced. Existing authored masters, optimized tiers and provenance remain the source of the Medic, baton and zombie art.

A deterministic group attack slot covers windup, strike and recovery. Eligible enemies rotate by their previous attack order; death, stagger, return and recovery completion release ownership. Collision synchronization after each enemy movement and bounded separation keep living bodies apart. Stationary waiting enemies play idle. The one-zombie attack cadence is preserved.

CPU-owned focus validates living generation-aware handles, line of sight, range and floor height. Automatic focus uses 0.3 m hysteresis. Explicit target cycling stays selected until invalid. Pointer aim remains free; focus never determines damage. Baton contact paths, damage, timing and once-per-target keys are unchanged. A sweep can hit multiple enemies, restore pressure once and consume each eligible critical opening separately. All three must die for group victory.

Only the focused enemy (or current attacker when unfocused) shows a health/posture panel. A pale green ring identifies focus, with the original amber attack telegraph. Initial browser inspection found overlapping three-panel labels and an oversized touch target button; both were corrected before final captures.

## Automated validation

- `npm run check`: strict TypeScript, ESLint, **81 unit tests across 14 files**, and production build passed.
- Group unit cases cover fair slot rotation/release, stationary committed strikes, real Rapier separation, dead collision, generation-aware restart, multi-target deduplication/pressure, critical consumption, Ward/dodge contacts, focus cycling/obstruction and deterministic simulation without graphics input.
- Browser group fights use real keyboard/pointer actions on WebGPU and WebGL2. Lifecycle tests exercise failed/cancelled loads, failed/successful quality replacement, frozen inspection and repeated return/reload ownership.
- Mobile checks use Chrome Pixel 7 emulation at 915 × 412, enlarged 140% left-handed controls, simultaneous movement/target/attack input, pointer cancellation and portrait pause. They verify selected mobile enemy requests and absence of desktop enemy/inspection requests.
- Final browser run: **21 applicable cases passed**, with 21 project-specific skips (desktop fights do not run in the touch project and touch cases do not run in the desktop project).
- Spatial audio compatibility: **4 passed**, covering legacy and unavailable listener positioning on desktop and mobile emulation.
- Production: **4 passed**, including exclusion of development commands, the original single encounter, optional armed clips/inspection and a real group victory. Three enemies requested exactly one desktop `zombie7.glb`; startup requested no enemy asset.

Initial test runs exposed synchronization errors in new assertions: focus was read before a 60 Hz tick, and a collision fixture included unrelated living blockers. The assertions now await fixed-step state and isolate the collider being checked. Final runs determine acceptance; earlier failures are not counted as passes.

The final recorded WebGPU fight defeated all three with 19 hits, five multi-target attacks, one critical and seven Ward blocks. WebGL2 defeated all three with 20 hits, seven multi-target attacks, two criticals and eight blocks. Both recorded no page errors. The exercises are real input scripts; timing differences produce different fights, while fixed-step unit fixtures verify deterministic rules.

### Resource ownership

The equipped training baseline was **35 owned resources / 5 asset references / 54 renderer textures**, with a 55,698,103-byte renderer allocation estimate. After four group load/return cycles, every snapshot returned to **35 / 5 / 54** and **55,624,167 bytes**. Cancelled late results returned to the baseline; failed quality replacement retained the current view and all enemy state. Successful Low/High replacement preserved health, positions and actions. Inspection froze the enemy snapshots and restored the encounter. These are ownership counts and Three.js allocation estimates, not independently measured VRAM. See [lifecycle evidence](browser/lifecycle.json) and [mobile evidence](browser/mobile.json).

## Delivery limits

`npm run size` passed against the production build. Art ceilings use conservative raw delivery bytes; bootstrap uses gzip.

| Payload | Bytes | Ceiling |
| --- | ---: | ---: |
| Compressed bootstrap | 2,568,955 | 5,242,880 |
| Initial desktop art | 16,509,743 | 20,971,520 |
| Initial mobile art | 10,367,551 | 10,485,760 |
| Additional inspection | 6,768,730 | 41,943,040 |
| Desktop encounter | 2,982,204 | 8,388,608 |
| Mobile encounter | 2,939,728 | 4,194,304 |
| Optional armed animation pack | 427,668 | 524,288 |

Mobile initial art has 118,209 bytes of headroom. The group adds no art delivery. The existing large Rapier JavaScript chunk warning remains; the compressed bootstrap limit passes. See [delivery data](delivery.json).

## Captures and review

[Review gallery](index.html) includes both backend combat recordings, group/victory captures and the mobile landscape layout. [Implementation notes](implementation.md) describe state and resource ownership. The recordings demonstrate existing animation contact and retained equipment across the fight; this phase does not rebuild or retarget their assets.

Technical tests do not replace user approval of contact, timing and encounter feel. Physical-phone performance is unverified. Mobile emulation and desktop WebGL2 rendering are compatibility checks; sustained measurements below are desktop WebGPU only.

## Five-minute production measurements

Measured 2026-10-10 in Chrome 154.0.8037.98 on Windows 11 build 26200, Intel i7-13620H. The actual WebGPU adapter reported **Intel / gen-12lp**. The installed RTX 4050 was not the adapter reported by these runs. Driver/device inventory is in [workstation.json](workstation.json).

Each scenario uses High quality, full **1440 × 900 render resolution**, adaptive resolution disabled, a 30-second warmup and at least 300 seconds of observation. Chrome runs with `--disable-frame-rate-limit --disable-gpu-vsync`, and the application has no frame limiter. An external `requestAnimationFrame` observer records intervals; these include submission/scheduling and are not isolated GPU timestamp queries. Scenarios run serially without other browser rendering tests.

| Scenario | Duration | Frames | Mean FPS | p95 | Maximum | >50 / >100 ms | Target |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Active equipped three-zombie encounter | 300.36 s | 35,291 | 117.50 | **14.30 ms** | 46.60 ms | 0 / 0 | ≤18.5 ms |
| Equipped desktop inspection | 300.24 s | 134,651 | 448.53 | **2.60 ms** | 36.20 ms | 0 / 0 | ≤35 ms |

[Group measurement](group-performance.json) recorded a stable **57,900,710-byte allocation estimate and 62 textures** across all ten samples. The real-input exercise totals, including warmup, were 18 group victories, 54 enemies defeated, 337 hits, 101 multi-target attacks, 33 criticals and 113 Ward blocks. Startup/loading costs are excluded from the timed period.

[Inspection measurement](cinematic-performance.json) recorded a stable **73,175,865-byte allocation estimate and 65 textures** across all ten samples, with the equipped `Baton_Idle` animation looping in the studio. Both scenarios passed their targets. Neither recorded a frame interval above 50 ms; maximum intervals remain listed rather than discarded.

No page errors were recorded. Chrome warned that Windows ignores `powerPreference`; Three.js also warned about multiple active KTX2 loaders while scene/weapon/encounter or inspection owners coexist. Those owners remained bounded in the lifecycle and sustained samples. The warning is retained in the raw reports rather than suppressed; loader sharing is not changed in this milestone.

## Handoff

The review branch stays active with a local phase commit. No merge or push to main is part of this handoff. Fresh older-system regression captures are preserved under [regressions](regressions/), mirroring their original QA paths; historical phase evidence remains unchanged. Validation servers are stopped after completion, including checks of ports 5173, 5180 and 4173. User combat/visual review and physical-phone testing remain open gates.
