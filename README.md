# VESPERWOUND

Iona and Ash Quay visual milestone for the approved dark horror action game. The default scene presents the mortuary engineer, original pressure machinery, scanned materials, and five in-place animation previews. Phase 2 player movement, collision, combat, health, and death are not introduced here.

## Run

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5173. Select **Enter the Works**, then use **Courtyard**, **Iona**, the turn button, and the animation selector. Eligible desktop configurations also offer **Detailed inspection**, with full-body/portrait/equipment views, orbit/zoom, Neutral/Ash Quay lighting and animation pause. Cinematic art loads only after selection; cancel, failure and exit retain/restore Ash Quay. Escape opens settings; F3 opens development diagnostics. The showcase controls work on touch screens. Mobile/Low load the mobile art variant; Medium/High/Ultra load desktop art. Failed quality loads preserve the previous scene. The rebuilt character remains **awaiting art review**.

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

Run the sustained desktop measurements after `npm run build`. On Windows, use `powershell -NoProfile -File tools/run-performance.ps1`; it temporarily prevents idle sleep and releases that request when the tests finish. Elsewhere, set `VESPER_PERFORMANCE=1` and run `npm run test:performance`. Two serial production runs each warm up for 30 seconds and measure ten minutes at 1440 × 900, fixed High quality, adaptive resolution disabled. Chrome launches with frame-rate limiting and GPU vsync disabled. External requestAnimationFrame intervals include CPU submission/scheduling; they are not isolated GPU timestamp measurements. Reports are `docs/qa/iona-rebuild/{gameplay,cinematic}-performance.json`. Targets are p95 ≤18.5 ms gameplay and ≤35 ms cinematic. Keep other GPU workloads closed. Application development commands remain excluded from production.

## Assets

Editable packed Blender masters live in `art/source`; optimized Meshopt GLBs and mipmapped KTX2 textures live in `public/assets/showcase`. Source downloads are separate from delivery. See [visual asset provenance](docs/visual-assets.md) and `art/provenance.json` for sources, authors, licenses, modifications, and hashes. The original technical fixtures remain reproducible with `npm run assets:generate`.

To export the saved character, install Blender 5.2 and run `npm run assets:build`. It reads `art/source/iona-master.blend`, exports its three authored selections, checks that the master hash is unchanged, compresses maps/geometry and records provenance. It preserves Ash Quay exports. Set `BLENDER_PATH` if Blender is installed elsewhere. **Normal art builds never regenerate or overwrite the master.** `npm run assets:legacy` explicitly runs the old generator; it never edits the canonical Iona master. Source fetches are `assets:fetch` and `assets:fetch:morphs`. Ordinary app builds use saved optimized exports and do not invoke Blender or download art. `npm run size` enforces gzip bootstrap ≤5 MiB, raw initial art ≤20 MiB desktop/≤10 MiB mobile, and additional cinematic art ≤40 MiB. See [Iona authoring workflow](docs/iona-art-workflow.md).

## Module ownership

`src/app/application.ts` composes one session. `core` owns the fixed clock, event contract, input contract, and cleanup helpers without importing Three.js. `assets` owns decoded shared resources; `world` owns the courtyard's meshes/materials and releases asset handles. `rendering` owns the renderer and post-processing passes. `input`, `audio`, `performance`, `platform`, `camera`, and `ui` each own their respective lifecycle. `src/main.ts` only starts the application and disposes it during HMR.

## Decisions and validation

- [Approved architecture](docs/architecture.md)
- [Phase 1 validation](docs/phase-1-validation.md)
- [Visual milestone validation](docs/visual-milestone-validation.md)
- [Visual comparisons](docs/visual-comparison.md)
- [Cinematic rebuild validation](docs/qa/iona-rebuild/validation.md)
- [Model policy and engineering instructions](AGENTS.md)
- [Original user brief](master-game-brief.md)

Physical Android/iPhone performance, thermal behavior, and real touch ergonomics require device testing. Emulation does not close those gates. No later development phase starts automatically.
