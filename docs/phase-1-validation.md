# Phase 1 validation — VESPERWOUND

Implementation date: 2026-10-05. Status: implementation complete; physical-device acceptance pending. Phase scope: technical foundation and Ash Quay test courtyard. No player, combat, enemies, physics, campaign saving, or streaming is introduced here. Phase 2 has not started.

Implementation model: GPT-6.1 Sol, High reasoning, verified from the active session. The initial scaffold was started on Astra before the mismatch was identified; implementation paused until the user switched to the required model. The routing table in AGENTS.md records the requested policy, but does not change the client's active model.

## Delivered foundation

- Vite, strict TypeScript, pinned Three.js 0.186.1; one WebGPURenderer with its WebGL2 backend.
- Fixed 60 Hz simulation clock with bounded catch-up; separate rendering, camera presentation, typed session events, and explicit lifetime ownership.
- Original courtyard demonstrating PBR color/normal textures, fog, directional shadows, instancing, skeletal GLB animation, TSL emissive material, and optional node bloom.
- Validated asset manifest, shared pending loads, reference-counted resources, Meshopt GLB decoding, KTX2/Basis decoding with self-hosted workers, and late-load disposal.
- Keyboard/mouse and simultaneous touch input; cancellation on blur, visibility change, orientation, pointer cancel, and lost capture.
- Gesture-unlocked Web Audio, four gain buses, spatial ambience, bounded pressure tones, master volume/mute, pause/resume, and cleanup.
- Mobile/Low/Medium/High/Ultra presets, bounded resolution, adaptive resolution with hysteresis, stored preferences with corruption/unavailable-storage recovery, and responsive landscape/portrait behavior.
- Development-only diagnostics, metrics export, fixture reload, and time scale. Production excludes the diagnostics module and ignores debug boot flags.

## Evidence and limits

The browser regression suite uses installed Chrome on Windows. Desktop and Pixel 7 landscape emulation deliberately use SwiftShader for repeatable WebGL2 behavior. They establish integration behavior, not phone GPU speed, thermal stability, or physical touch ergonomics. The dedicated WebGPU test uses Chrome's default graphics path and checks the renderer's actual selected backend.

Screenshots inspected from the automated suite:

- [Desktop WebGL2](qa/courtyard-desktop.png)
- [Desktop WebGPU](qa/courtyard-webgpu.png)
- [Mobile landscape emulation](qa/courtyard-mobile.png)

Final automated results: `npm run check` passed with 16 unit tests; `npm run test:browser` passed 15 applicable cases in two minutes, with six platform-inapplicable cases and the opt-in performance case skipped. The separate ten-minute performance run passed. `npm run test:production` passed its production isolation check. `npm run size` passed. There are no remaining failed automated checks. No physical mobile performance claim follows from these results.

The embedded browser rejected localhost access under its URL policy. Visual inspection therefore used local screenshots produced by the automated regression suite. Open the local dev URL independently to interact with the courtyard.

| Acceptance gate | Evidence / status |
| --- | --- |
| Reproducible typecheck, lint, unit tests, production build | Passed `npm run check`: strict TypeScript, ESLint, 16 unit checks in two files, Vite production build |
| Real WebGPU selection | Passed dedicated default-graphics Chrome test; compressed courtyard renders with backend `WebGPU` |
| WebGL2 compatibility | Passed desktop and mobile-emulation rendering tests |
| Required-backend failure and recovery | Unavailable WebGPU fails visibly; compatibility button initializes WebGL2 |
| Representative render features | All five presets render; GLB skin/animation and Meshopt validated; rendered screenshots inspected |
| Asset compression / hosting | Original GLB + mipmapped KTX2, local Basis decoder/worker; binary fixture checks pass |
| Shared ownership / cancellation | Unit tests cover shared pending loads, surviving references, retries, idempotence, and disposal before late completion |
| Ten fixture unload/reload cycles | Asset references, owned resources, listeners stable; texture count remains within baseline budget |
| Input cancellation / simultaneous touch | Desktop blur/resume and mobile multitouch/pointer cancellation pass |
| Audio unlock / resume | Starts from entry gesture; settings pause and resume retain voice count; master volume/mute and gain buses implemented |
| Responsive layout | Landscape touch controls and portrait pause/return pass in emulation; physical ergonomics open |
| Quality persistence / adaptive hysteresis | Browser persistence and five presets pass; unit checks cover quality bounds and hysteresis |
| Development metrics | FPS/recent p95, aggregate exported frame timing/stalls, synchronous CPU time, draws/triangles/textures, Three memory estimate, resource/reference/listener/voice counts, backend and preset |
| Production isolation | Built game starts despite development failure flags; no debug API, panel, button, or debug module request |
| Compressed entry/output ≤5 MiB | Full dist after audio compatibility fix, including duplicate codec copies and notices: 875,691 gzip bytes (0.84 MiB); raw 2,354,700 bytes |
| Desktop ten-minute p95 ≤18.5 ms | Passed on Intel Gen-12LP WebGPU: 60.004 mean FPS, aggregate p95 16.8 ms, fixed High at 1440 × 900 |
| Phone p95 ≤35 ms / thermal behavior | Open: no physical Android/iPhone test device used |
| No recurring >100 ms application stall | Passed this desktop fixture run: maximum 50.1 ms, zero frames above 100 ms after warm-up |
| Actual Android + iPhone evidence | Open: emulation cannot satisfy this gate |

The ten-cycle regression exposed an ownership leak in node post-processing: disposing RenderPipeline alone did not dispose the owned scene/bloom passes. Explicit disposal of both passes fixed the growth, and the ten-cycle test then passed. The keyboard resume regression waits for the dialog's asynchronous close event and restored canvas focus before issuing movement.

## Performance measurement

`npm run test:performance` with `VESPER_PERFORMANCE=1` performs 30 seconds of warm-up and 600 seconds of measurement at a 1440 × 900 viewport, High quality, adaptive resolution off, and Chrome's default graphics path. It records adapter information, actual backend, browser version, frame timings, and resource samples in [desktop-performance.json](qa/desktop-performance.json).

The development overlay reports the recent 120-frame window; aggregate export computes p95 over up to 180,000 retained measured frames. Visibility and modal pauses reset timing so suspended wall time is excluded. Long running-frame stalls remain in the aggregate. CPU time is synchronous application plus render submission, not GPU execution. Three.js memory is an estimate, not a driver-wide GPU measurement.

Completed result: Chrome 154.0.8037.95, Windows desktop host, headless Chrome default GPU path, Intel adapter architecture `gen-12lp`. Adapter description/device ID were not exposed, so no exact GPU product is inferred. The measured renderer reports WebGPU. A 30-second warm-up preceded the 600-second run; 36,021 measured frames were retained. Mean FPS was 60.0039, aggregate p95 16.8 ms, maximum frame 50.1 ms, and frames above 100 ms zero. Textures stayed at 21, owned resources 23, asset references 3, listeners 33, audio voices 3; the Three.js GPU memory estimate stayed at 49,524,209 bytes. No page errors occurred. One clock catch-up overrun existed before measurement and remained unchanged throughout the run.

The performance test continuously exercises the animated courtyard, ambience, render passes, and camera fixture at rest. It does not simulate player/combat input or crowds. A passing fixture result does not predict combat, crowd, streaming, or physical phone performance. Desktop acceptance is limited to this measured machine/browser/preset; phone gates remain open.

## Audio compatibility correction

The initial Chrome-only integration checks did not cover browsers lacking AudioListener position AudioParams. A user report exposed a runtime crash immediately after entry when `listener.positionX` was undefined. The same assumption existed in ambience PannerNode initialization. This is a documented [AudioListener compatibility limitation](https://developer.mozilla.org/en-US/docs/Web/API/AudioListener/positionX).

Both listener and panner positioning now check all three AudioParams, use the legacy `setPosition(x, y, z)` method when available, and leave default placement intact when neither positioning API exists. Audio remains optional to session rendering. Regression tests remove both sets of AudioParams before entry, verify legacy source/listener coordinates, and separately remove the legacy methods to verify playable degradation. The original test failed before the fix. The earlier ten-minute performance evidence predates this compatibility correction; it was not repeated for the small audio guard change.

Post-fix validation: eight relevant desktop/mobile-emulation browser cases passed, covering legacy/unavailable positioning, modern entry/rendering, and settings/audio resume. `npm run check` passed (TypeScript, ESLint, 16 unit tests, production build), and the updated size gate passed. These tests emulate the missing APIs in Chrome; they are not a claim of physical Firefox/Safari/mobile testing.

## Reproduce

```powershell
npm ci
npm run check
npm run test:browser
npm run test:production
npm run size
$env:VESPER_PERFORMANCE = '1'
npm run test:performance
```

Run browser cases without other GPU workloads when measuring performance. Default browser regression tests skip the ten-minute measurement unless explicitly opted in. The test fixture reload deliberately exercises cached assets and scene/pass destruction; it is not map streaming.

Before accepting Phase 1 on phones, serve the build over an HTTPS development endpoint reachable from actual Android Chrome and iPhone Safari, record device/OS/browser/backend/preset/resolution, repeat portrait/landscape and simultaneous touches, background/resume audio, and measure sustained frame time/thermal behavior after warm-up. Verify the GLB/KTX2 workers load under the intended host's CSP. Hosting is not configured or published in this phase.

## Dependencies and release notes

Three.js is the only runtime npm dependency. Vitest/Playwright/ESLint/TypeScript/Vite are development tools; glTF Transform, Meshopt encoder, and KTX2 encoder generate the original compressed fixtures offline. System fonts avoid downloaded font licenses/network requests. Basis runtime and third-party notices are included in public/assets/licenses. See [asset provenance](assets.md).

This phase delivers an implementation suitable for review. Physical-device acceptance remains open until the above evidence exists; do not mark Phase 1 fully validated or start Phase 2 automatically.
