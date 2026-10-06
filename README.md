# VESPERWOUND

Phase 2 player prototype for the approved dark horror action game. The default scene lets you control Tony Flanagan's accepted SciFi Medic at Ash Quay. Its appearance and supplied rig are unchanged. Separate CC0 animations from Quaternius provide idle, walk, jog, punch, roll, hit and death.

## Run

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5173 and select **Enter the Works**. **WASD/arrows** walk, **Shift** runs, **click** aims and punches, and **Space** dodges. Touch uses the joystick plus Run, Attack and Dodge. Strike the marked practice target; the orange pressure vent causes damage. At zero health, **Return to the intake** restarts. **Courtyard** and **Medic** pause gameplay for animation previews; **Play** resumes. Eligible desktops offer **Detailed inspection**, with full-body/portrait/equipment views, orbit/zoom and Neutral/Ash Quay lighting. Inspection loads explicitly; cancel, failure and exit retain/restore Ash Quay. Escape opens settings; F3 opens development diagnostics. Mobile/Low use mobile art; Medium/High/Ultra use desktop art. Failed quality loads retain the previous scene. Credits are accessible from entry and settings.

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

Run sustained measurements after `npm run build`. On Windows, use `powershell -NoProfile -File tools/run-performance.ps1`; its temporary idle-sleep protection ends with the process. Elsewhere, set `VESPER_PERFORMANCE=1` and run `npm run test:performance`. Two serial production runs each warm up for 30 seconds and measure ten minutes at 1440 × 900, High quality and adaptive resolution disabled. Gameplay alternates run cycles, exercising physics, skinning and camera follow; inspection loops idle. Chrome frame-rate limiting and GPU vsync are disabled. External requestAnimationFrame intervals include CPU submission/scheduling, rather than isolated GPU timestamps. Reports are `docs/qa/phase2/{gameplay,cinematic}-performance.json`. Targets are p95 ≤18.5 ms gameplay and ≤35 ms inspection. Keep other GPU workloads closed. Development commands remain excluded from production.

## Assets

Editable packed Blender masters live in `art/source`; optimized Meshopt GLBs and mipmapped KTX2 textures live in `public/assets/showcase`. Source downloads are separate from delivery. See [visual asset provenance](docs/visual-assets.md) and `art/provenance.json` for sources, authors, licenses, modifications, and hashes. The original technical fixtures remain reproducible with `npm run assets:generate`.

Install Blender 5.2 and run `npm run assets:build` to export the saved character and animation sources. It reads `art/source/medic-master.blend` and `art/source/medic-player-animations.blend`, verifies both remain unchanged, compresses exports and refreshes provenance. All character tiers retain the supplied native detail. Ash Quay exports are preserved. Set `BLENDER_PATH` if needed. **Normal art builds never regenerate or overwrite authored sources.** Original Medic files are in `art/imports/medic`; the untouched animation archive and license are in `art/imports/animations`. Previous character generators remain removed. Ordinary app builds consume saved exports without Blender or downloads. `npm run size` counts shared animations against every art tier and enforces gzip bootstrap ≤5 MiB, raw initial art ≤20 MiB desktop/≤10 MiB mobile and additional inspection ≤40 MiB. See [Medic workflow](docs/medic-art-workflow.md).

## Module ownership

`src/app/application.ts` composes one session. `core` owns the fixed clock, event contract, input contract, and cleanup helpers without importing Three.js. `assets` owns decoded shared resources; `world` owns the courtyard's meshes/materials and releases asset handles. `rendering` owns the renderer and post-processing passes. `input`, `audio`, `performance`, `platform`, `camera`, and `ui` each own their respective lifecycle. `src/main.ts` only starts the application and disposes it during HMR.

## Decisions and validation

- [Approved architecture](docs/architecture.md)
- [Phase 1 validation](docs/phase-1-validation.md)
- [Visual milestone validation](docs/visual-milestone-validation.md)
- [Visual comparisons](docs/visual-comparison.md)
- [Medic validation and measured performance](docs/qa/medic/validation.md)
- [Medic source/browser comparison gallery](docs/qa/medic/comparison.html)
- [Phase 2 validation and controls](docs/qa/phase2/validation.md)
- [Model policy and engineering instructions](AGENTS.md)
- [Original user brief](master-game-brief.md)

Physical Android/iPhone performance, thermal behavior, and real touch ergonomics require device testing. Emulation does not close those gates. No later development phase starts automatically.
