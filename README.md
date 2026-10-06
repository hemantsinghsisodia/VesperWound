# VESPERWOUND

Medic and Ash Quay visual milestone for the approved dark horror action game. The default scene presents Tony Flanagan's SciFi Medic, original pressure machinery and scanned materials. The supplied character has no animation clips, so previews use its static pose. The user accepted Medic on 2026-10-06. Phase 2 player movement, collision, combat, health and death remain separate.

## Run

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5173. Select **Enter the Works**, then use **Courtyard**, **Medic**, the turn button and **Static pose**. Eligible desktop configurations also offer **Detailed inspection**, with full-body/portrait/equipment views, orbit/zoom and Neutral/Ash Quay lighting. Inspection art loads only after selection; cancel, failure and exit retain/restore Ash Quay. Escape opens settings; F3 opens development diagnostics. Controls support touch screens. Mobile/Low load the mobile art variant; Medium/High/Ultra load desktop art. Failed quality loads preserve the previous scene. Credits are accessible from the entry screen and settings.

## Validate

```sh
npm run check
npm run test:browser
npm run test:production
npm run size
```

Browser tests use installed Google Chrome (`channel: chrome`). Desktop/mobile integration projects use SwiftShader for repeatable WebGL2 checks; their FPS is not a hardware performance result. The dedicated `hardware-webgpu` and `hardware-showcase` projects inspect WebGPU poses and exercise hardware WebGL2 lifecycle/recovery respectively.

Development-only URLs:
- `/?scene=foundation` — original Phase 1 technical courtyard. WASD moves the light; Space/click releases pressure; touch offers a stick and pressure button.
- `/?backend=webgl2` — force the WebGL2 backend.
- `/?backend=webgpu-required` — fail visibly unless WebGPU is actually selected.
- `/?fixture=missing` — exercise missing-content feedback.

Production ignores these flags and excludes the development diagnostics module.

High quality uses quarter-resolution bloom; Ultra uses half-resolution bloom. The main scene resolution remains governed by the existing preset and adaptive-resolution settings.

Run the sustained desktop measurements after `npm run build`. On Windows, use `powershell -NoProfile -File tools/run-performance.ps1`; it temporarily prevents idle sleep and releases that request when the tests finish. Elsewhere, set `VESPER_PERFORMANCE=1` and run `npm run test:performance`. Two serial production runs each warm up for 30 seconds and measure ten minutes at 1440 × 900, fixed High quality, adaptive resolution disabled. Chrome launches with frame-rate limiting and GPU vsync disabled. External requestAnimationFrame intervals include CPU submission/scheduling; they are not isolated GPU timestamp measurements. Reports are `docs/qa/medic/{gameplay,cinematic}-performance.json`. Targets are p95 ≤18.5 ms courtyard and ≤35 ms inspection. Keep other GPU workloads closed. Application development commands remain excluded from production.

## Assets

Editable packed Blender masters live in `art/source`; optimized Meshopt GLBs and mipmapped KTX2 textures live in `public/assets/showcase`. Source downloads are separate from delivery. See [visual asset provenance](docs/visual-assets.md) and `art/provenance.json` for sources, authors, licenses, modifications, and hashes. The original technical fixtures remain reproducible with `npm run assets:generate`.

To export the saved character, install Blender 5.2 and run `npm run assets:build`. It reads `art/source/medic-master.blend`, verifies that the master remains unchanged, compresses maps/geometry and refreshes provenance. All three tiers reuse the supplied native detail. It preserves Ash Quay exports. Set `BLENDER_PATH` if Blender is installed elsewhere. **Normal art builds never regenerate or overwrite the master.** `npm run assets:fetch` downloads only the retained environment imports; Medic originals are preserved under `art/imports/medic`. Previous character sources and generators have been removed. Ordinary app builds use saved optimized exports and do not invoke Blender or download art. `npm run size` enforces gzip bootstrap ≤5 MiB, raw initial art ≤20 MiB desktop/≤10 MiB mobile, and additional inspection art ≤40 MiB. See [Medic workflow](docs/medic-art-workflow.md).

## Module ownership

`src/app/application.ts` composes one session. `core` owns the fixed clock, event contract, input contract, and cleanup helpers without importing Three.js. `assets` owns decoded shared resources; `world` owns the courtyard's meshes/materials and releases asset handles. `rendering` owns the renderer and post-processing passes. `input`, `audio`, `performance`, `platform`, `camera`, and `ui` each own their respective lifecycle. `src/main.ts` only starts the application and disposes it during HMR.

## Decisions and validation

- [Approved architecture](docs/architecture.md)
- [Phase 1 validation](docs/phase-1-validation.md)
- [Visual milestone validation](docs/visual-milestone-validation.md)
- [Visual comparisons](docs/visual-comparison.md)
- [Medic validation and measured performance](docs/qa/medic/validation.md)
- [Medic source/browser comparison gallery](docs/qa/medic/comparison.html)
- [Model policy and engineering instructions](AGENTS.md)
- [Original user brief](master-game-brief.md)

Physical Android/iPhone performance, thermal behavior, and real touch ergonomics require device testing. Emulation does not close those gates. No later development phase starts automatically.
