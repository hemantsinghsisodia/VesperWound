# VESPERWOUND

First weapon milestone for the approved dark horror action game. Medic can pick up an original steel baton at Ash Quay and fight Zombie Number 7 with light swings, heavy strikes, stagger, critical follow-up and Ward. The accepted character and rig are retained. Nine unarmed clips and eleven separate armed clips adapt the acquired Quaternius CC0 library.

## Run

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5173 and select **Enter the Works**. **WASD/arrows** walk, **Shift** runs, **left click** aims and queues a light strike, **right click** attacks heavy, **Space** dodges and **Q** activates Ward. Touch uses the joystick plus Run, Attack, Dodge, Heavy and Ward; settings support handedness and enlarged controls. Chain jab/cross/jab, then heavy to reach 100 posture. An exposed target takes double damage from the next heavy within two seconds. Three training targets show health, posture, defeat and automatic reset; **Reset targets** restores them immediately. The orange vent warns for 600 ms before each pulse: move away, dodge or block it with Ward. Ward absorbs one hit for 800 ms and costs 25 pressure. Successful strikes restore 10 pressure once per attack; three quiet seconds start regeneration at five per second.

At zero health, **Return to the intake** restarts. **Courtyard** and **Medic** pause gameplay for animation previews; **Play** resumes. Eligible desktops offer **Detailed inspection**, with full-body/portrait/equipment views, orbit/zoom and Neutral/Ash Quay lighting. Inspection loads explicitly; cancel, failure and exit retain/restore Ash Quay. Escape opens settings; F3 opens development diagnostics. Mobile/Low use mobile art; Medium/High/Ultra use desktop art. Failed quality loads retain the previous scene. Credits are accessible from entry and settings. Reduced Motion disables camera impulses, impact particles and strong flashes. **Start encounter** loads Tony Flanagan's Zombie Number 7 for a single pursuit/strike/stagger/critical/defeat encounter. **Restart encounter** resets the fight; **Return to training** restores posts and the vent. Step into striking range manually. Additional archetypes and hordes remain later work.

Press **F** near the marked baton immediately after entering, or use the contextual **Pick up** touch button. It equips after the separate armed animation pack loads. Use the existing light/heavy controls; no automatic forward step is added. The baton stays equipped through restarts, return to training, inspection and graphics changes for this session. Reload the page to restore the unarmed pickup experience. Detailed inspection includes the baton grip and armed animation selector.

Editable sources: `art/source/steel-baton.blend` and `art/source/medic-baton-animations.blend`. The latter stores the authored hand attachment and baked finger/arm poses. `node tools/build-baton.mjs` reads both masters, verifies unchanged hashes, optimizes exports and exports fixed-step CPU contact paths. `tools/blender/author_baton.py` and `node tools/retarget-medic.mjs --baton` are explicit preparation history; never rerun them over artist edits. The normal `assets:build` includes saved baton export. See [weapon validation](docs/qa/baton/validation.md).

## Validate

```sh
npm run check
npm run test:browser
npm run test:production
npm run size
```

Browser tests use installed Google Chrome (`channel: chrome`). Desktop/mobile foundation projects use SwiftShader for repeatable WebGL2 checks; their FPS is not a hardware performance result. Dedicated hardware projects test player flows, studio animation, WebGPU and repeated scene disposal. Touch emulation does not establish physical-phone performance.

Development-only URLs:
- `/?scene=foundation` — original Phase 1 technical courtyard. WASD moves the light; Space/click releases pressure; touch offers a stick and pressure button.
- `/?backend=webgl2` — force the WebGL2 backend.
- `/?backend=webgpu-required` — fail visibly unless WebGPU is actually selected.
- `/?fixture=missing` — exercise missing-content feedback.

Production ignores these flags and excludes the development diagnostics module.

High quality uses quarter-resolution bloom; Ultra uses half-resolution bloom. The main scene resolution remains governed by the existing preset and adaptive-resolution settings.

Run sustained measurements after `npm run build`. On Windows, use `powershell -NoProfile -File tools/run-performance.ps1`; its temporary idle-sleep protection ends with the process. Elsewhere, set `VESPER_PERFORMANCE=1` and run `npm run test:performance`. Two serial production runs each warm up for 30 seconds and measure five minutes at 1440 × 900, High quality and adaptive resolution disabled. Active encounter equips the baton and repeatedly exercises pursuit, heavy/stagger/critical, Ward, defeat and encounter restarts through real production input; inspection loops armed idle. Chrome frame-rate limiting and GPU vsync are disabled. External requestAnimationFrame intervals include CPU submission/scheduling, rather than isolated GPU timestamps. Reports are `docs/qa/baton/{encounter,cinematic}-performance.json`. Targets are p95 ≤18.5 ms combat and ≤35 ms inspection. Keep other GPU workloads closed. Development commands remain excluded from production.

## Assets

Editable packed Blender masters live in `art/source`; optimized Meshopt GLBs and mipmapped KTX2 textures live in `public/assets/showcase`. Source downloads are separate from delivery. See [visual asset provenance](docs/visual-assets.md) and `art/provenance.json` for sources, authors, licenses, modifications, and hashes. The original technical fixtures remain reproducible with `npm run assets:generate`.

Install Blender 5.2 and run `npm run assets:build` to export the saved character and animation sources. It reads `art/source/medic-master.blend`, `art/source/medic-player-animations.blend` and `art/source/zombie7-master.blend`, verifies they remain unchanged, compresses exports and refreshes provenance. All character tiers retain the supplied native detail. Ash Quay exports are preserved. Set `BLENDER_PATH` if needed. **Normal art builds never regenerate or overwrite authored sources.** Original Medic files are in `art/imports/medic`; the untouched animation archive and license are in `art/imports/animations`. Previous character generators remain removed. Ordinary app builds consume saved exports without Blender or downloads. `npm run size` counts shared animations against every art tier and enforces gzip bootstrap ≤5 MiB, raw initial art ≤20 MiB desktop/≤10 MiB mobile and additional inspection ≤40 MiB, and optional encounter ≤8 MiB desktop/≤4 MiB mobile. Enemy originals and attribution are in `art/imports/zombie7` and `art/enemy-provenance.json`. See [Medic workflow](docs/medic-art-workflow.md).

## Module ownership

`src/app/application.ts` composes one session. `core` owns the fixed clock, event contract, input contract, and cleanup helpers without importing Three.js. `assets` owns decoded shared resources; `world` owns the courtyard's meshes/materials and releases asset handles. `rendering` owns the renderer and post-processing passes. `input`, `audio`, `performance`, `platform`, `camera`, and `ui` each own their respective lifecycle. `src/main.ts` only starts the application and disposes it during HMR.

`player/combat-definitions.ts` defines attack tuning, the unarmed style, combatant state and typed events. `player-simulation.ts` resolves damage on the fixed CPU clock using attack/hurt volumes and collision obstruction; animation never determines damage. The session dispatches events to independently owned sound and visual feedback. Target knockback is swept against authored geometry, other targets and the player. Visual particles have a fixed 48-instance pool; audio has a 24-source ceiling.

## Decisions and validation

- [Approved architecture](docs/architecture.md)
- [Phase 1 validation](docs/phase-1-validation.md)
- [Visual milestone validation](docs/visual-milestone-validation.md)
- [Visual comparisons](docs/visual-comparison.md)
- [Medic validation and measured performance](docs/qa/medic/validation.md)
- [Medic source/browser comparison gallery](docs/qa/medic/comparison.html)
- [Phase 2 validation and controls](docs/qa/phase2/validation.md)
- [Phase 3 combat validation](docs/qa/phase3/validation.md)
- [Phase 3 demonstration and captures](docs/qa/phase3/comparison.html)
- [Phase 4A validation](docs/qa/phase4a/validation.md)
- [Enemy comparison gallery and combat demo](docs/qa/phase4a/comparison/index.html)
- [Encounter architecture and authored workflow](docs/qa/phase4a/implementation.md)
- [Model policy and engineering instructions](AGENTS.md)
- [Original user brief](master-game-brief.md)

Physical Android/iPhone performance, thermal behavior, and real touch ergonomics require device testing. Emulation does not close those gates. No later development phase starts automatically.
