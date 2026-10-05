# VESPERWOUND

Phase 1 technical foundation for the approved dark horror action game. The courtyard exercises rendering, compressed assets, input, audio, quality settings, diagnostics, and resource lifetime. The movable light is an input/camera fixture; Phase 2 introduces the player.

## Run

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5173. Select **Enter the Works** to unlock audio and explore the fixture. WASD moves the light, Space/click releases a pressure pulse, Escape opens settings, and F3 opens development diagnostics. Touch layouts provide a movement stick and pressure button.

## Validate

```sh
npm run check
npm run test:browser
npm run test:production
npm run size
```

Browser tests use an installed Google Chrome (`channel: chrome`). Desktop/mobile integration projects use SwiftShader for repeatable WebGL2 checks; their FPS is not a hardware performance result. The dedicated `hardware-webgpu` project uses Chrome's default graphics path and skips with a reason if WebGPU is unavailable.

Development-only URLs:
- `/?backend=webgl2` — force the WebGL2 backend.
- `/?backend=webgpu-required` — fail visibly unless WebGPU is actually selected.
- `/?fixture=missing` — exercise missing-content feedback.

Production ignores these flags and excludes the development diagnostics module.

Run the optional sustained desktop measurement in PowerShell with `$env:VESPER_PERFORMANCE='1'; npm run test:performance`. It warms up for 30 seconds, measures ten minutes at fixed High quality without adaptive resolution, and writes `docs/qa/desktop-performance.json`. Keep other GPU workloads closed. The development overlay shows recent FPS/p95; the JSON export includes aggregate p95 and stalls for up to 180,000 retained frames. CPU time measures synchronous application/render submission, not asynchronous GPU execution.

## Assets

The committed fixtures are original generated assets. Regenerate with `npm run assets:generate`. Production builds copy version-matched Basis transcoder files and license notices through `tools/sync-runtime.mjs`. See [asset provenance](docs/assets.md).

## Module ownership

`src/app/application.ts` composes one session. `core` owns the fixed clock, event contract, input contract, and cleanup helpers without importing Three.js. `assets` owns decoded shared resources; `world` owns the courtyard's meshes/materials and releases asset handles. `rendering` owns the renderer and post-processing passes. `input`, `audio`, `performance`, `platform`, `camera`, and `ui` each own their respective lifecycle. `src/main.ts` only starts the application and disposes it during HMR.

## Decisions and validation

- [Approved architecture](docs/architecture.md)
- [Phase 1 validation](docs/phase-1-validation.md)
- [Model policy and engineering instructions](AGENTS.md)
- [Original user brief](master-game-brief.md)

Physical Android/iPhone performance, thermal behavior, and real touch ergonomics require device testing. Emulation does not close those gates. No later development phase starts automatically.
