# Ash Quay rebuild — Checkpoint A

Date: 2026-10-12. Review branch: `codex/ash-quay-rebuild`, based on main `65cc92e`.
Status: **awaiting visual review**. Technical validation does not approve the art.

## Delivered scope

- Closer player-follow framing and a compact health/pressure/equipment HUD. Scene,
  practice and inspection tools are in the pause menu during play. Preview views
  retain their own controls. Loading/failure messages remain visible during play.
- Curated factory brick, windows, doors, cornices and industrial pipe modules;
  original engine flanges, bolts, gauges, valves, cage and sight glasses;
  maintenance slabs, drainage, drums, quay railing and signage.
- Packed editable `art/source/ash-quay-master.blend`, untouched CC0 downloads and
  hashes, desktop/mobile Meshopt/KTX2 exports and a source-scene reflection bake.
- Named editable district blockout, excluded from runtime exports. The diagram
  describes a future six-space exploration loop inside a 64 m envelope.
- Accepted Medic, zombie, baton, animation sources and CPU combat/navigation rules
  retained. The existing playable collision footprint remains approximately
  16 × 16 m. Expanded traversal, streaming, occlusion treatment and district-wide
  navigation belong to Checkpoint B after this review.

## Art evidence and remaining defects

Open [the before/after gallery](index.html). Captures are actual browser renders,
not concept illustrations. `baseline-player.png` and `baseline-overview.png` show
the accepted main build before these changes. New captures cover real WebGPU,
WebGL2 and Pixel 7 landscape emulation, including enlarged left-handed controls.

The facade placement was inspected and corrected after a library-object transform
error. Source textures retain authored UVs; runtime paving and iron tints are
recorded modifications. Compression uses UASTC/Zstandard for normals and ETC1S
for suitable color/packed maps, with mipmaps and no upscaling. The reflection is
a 512 × 256 approximation of the source scene, not dynamic mirror reflection.

The scene has more architectural presence and closer character readability, but
repeated paving remains conspicuous, the retained covered stores and training
posts are simple, and dressing is sparse. Background harbour/skyline geometry is
a composition proxy, not a finished district. Those limitations remain visible
in the captures and must inform art review. This checkpoint does not establish
that the full world is impressive or that exploration is already implemented.

Recordings: [WebGPU walkthrough](proof-webgpu-walkthrough.webm),
[WebGL2 walkthrough](proof-webgl2-walkthrough.webm),
[mobile landscape walkthrough](proof-mobile-walkthrough.webm).

## Technical validation

`npm run check`: typecheck, lint, **83 unit tests in 15 files**, production build
passed. The pre-existing large Rapier chunk warning remains; compressed bootstrap
passes its ceiling. `npm run size` passed all delivery budgets.

Dedicated art proof: **3 passed** — WebGPU, WebGL2 and mobile landscape. It checks
compact live HUD, pause tools, baton retention, group entry/return, inspection
entry/exit, stable listeners/resources, selected mobile assets, real browser touch
cancellation and portrait suspension.

Foundation/audio regression: **18 passed, 6 configuration-specific skips**.
Legacy and unavailable audio-position properties both remain playable. Other
checks cover settings suspension, touch release, failed fixtures, unavailable
storage, renderer fallback and viewport rotation.

Broader hardware regressions initially found three stale test expectations:
pressure can regenerate between touch actions; Return to training moved into the
pause menu; the baked reflection adds one owned asset reference. The production
diagnostics check likewise needed to open the pause menu to see the tools.
These expectations were corrected without changing combat or regeneration.
All three corrected hardware cases passed on targeted rerun: the complete hardware set has 31 passing cases and 21 configuration-specific skips. Production has four passing cases across the initial run and corrected diagnostics rerun.

Ten scene reloads and six quality swaps passed on **both WebGL2 and WebGPU**
after the glow change. [WebGL2 snapshots](lifecycle.json) and
[WebGPU snapshots](lifecycle-webgpu.json) record resource/reference/listener
counts and renderer allocation estimates. Both retain 35 owned presentation
resources, five asset references and 62 listeners. Estimated renderer bytes
were 56,074,831 initially / 56,115,238 after returning to High on WebGL2, and
56,997,952 / 56,998,456 on WebGPU. No progressive growth was observed. The final
four lifecycle cases passed, including failed reflection loading and relocated
model dependencies; allocation assertions also run after resuming the final view.
Inspection, weapon and group regressions cover failed/cancelled loads, rapid
entry/exit, pooled restart, quality reconstruction and retained equipment.
The new reflection failure check exercises transactional rollback and retry.

## Asset and delivery budgets

| Delivery | Bytes counted | Ceiling | Result |
| --- | ---: | ---: | --- |
| Compressed bootstrap | 2,574,639 gzip | 5 MiB | Pass |
| Desktop initial art | 18,242,338 raw | 20 MiB | Pass |
| Mobile initial art | 10,214,794 raw | 10 MiB | Pass |
| Additional inspection | 6,768,730 raw | 40 MiB | Pass |
| Optional desktop encounter | 2,982,204 raw | 8 MiB | Pass |
| Optional mobile encounter | 2,939,728 raw | 4 MiB | Pass |
| Optional armed animations | 427,668 raw | 512 KiB | Pass |

See [the exact production size report](../visual-delivery.json) and
[environment export report](assets.json). Initial art includes selected Medic,
shared unarmed animations, baton and reflection. Mobile never requests desktop
or inspection assets in the proof. The mobile initial payload has only 270,966
bytes of headroom; further district content needs the planned streaming budget.

Each environment export has 103,494 unique exported triangles and 38 batched meshes.
Desktop environment is 11,443,876 bytes, mobile 3,416,332; each reflection is
29,544 bytes. Maximum texture dimensions are 1024 desktop and 512 mobile.
Mobile currently reduces texture detail but retains environment topology. It is
not evidence of physical-device performance or a completed full-district LOD pass.

## Performance method

Measured desktop: Intel Core i7-13620H laptop, Intel UHD Graphics and NVIDIA
RTX 4050 installed. The selected browser adapter, Chrome version and exact
allocations are recorded in the benchmark JSON rather than inferred from the
installed GPU list. Tests use production at 1440 × 900, High quality, adaptive
resolution disabled, 30-second warmup and five minutes per scenario. Chrome
frame-rate limiting and GPU vsync are disabled. No application limiter is added.

External requestAnimationFrame intervals include CPU submission/scheduling and
are not isolated GPU timestamp queries. Active combat uses real input, three
zombies, equipped baton, light/heavy attacks, Ward, stagger, criticals, victories
and restarts. Inspection loops equipped idle. Renderer memory is an allocation
estimate rather than measured process/GPU residency. Long frames are reported.

Targets: p95 ≤18.5 ms active combat; ≤35 ms inspection. Physical Android/iPhone
performance, thermal behavior and real touch ergonomics remain unverified.
District traversal profiling remains pending until Checkpoint B exists.

The initial courtyard export missed the combat target at p95 19.7 ms over
300.47 seconds, with four intervals above 50 ms and none above 100 ms. Its
[raw measurement](group-performance-before-batching.json) is retained. Static
room batching reduced the starting view from roughly 249 draw submissions to
114. This trades finer culling for fewer submissions in the compact proof; full
district rooms need separate batches. Batching alone still missed at **21.9 ms**
p95 over 300.42 seconds, with zero intervals above 50 ms
([raw measurement](group-performance-batched-initial.json)).

A 20-second Chrome CPU profile showed substantial time in native graphics calls:
6.79 seconds in `writeBuffer` and 5.11 seconds in `createCommandEncoder`. The
dominant command-encoder stacks came from bloom's repeated full-screen passes.
These samples include driver waits and are not GPU shader timings. High quality
now uses quarter-resolution highlight extraction and horizontal/vertical Gaussian
blur (three passes instead of twelve), retaining a restrained glow. Ultra keeps
multi-scale bloom. Both paths have explicit disposal. Full scene resolution,
shadows, encounter density and simulation remain unchanged. Actual WebGPU and
WebGL2 captures were inspected after the change; the mobile proof also passed.
The 30-second diagnostic reached 13.0 ms p95; it is not the sustained acceptance
measurement. Both final five-minute measurements passed:

| Scenario | Duration | Frames | Average FPS | p95 | Maximum | >50 / >100 ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| [Armed group combat](group-performance.json) | 300.49 s | 25,982 | 86.47 | **13.9 ms** | 45.0 ms | 0 / 0 |
| [Equipped inspection](cinematic-performance.json) | 300.28 s | 126,966 | 422.97 | **3.2 ms** | 17.2 ms | 0 / 0 |

Both used Chrome 154.0.8037.98 and the **Intel `gen-12lp` WebGPU adapter**, not
the installed RTX 4050. Combat completed 18 group victories, 54 defeats, 27
criticals and 114 blocks across warmup and measurement. During measurement,
estimated renderer allocation ranged from 58,207,986 to 58,208,146 bytes with
77 textures. Inspection held 73,914,288 estimated bytes and 88 textures. Both
runs recorded zero application errors. The final starting courtyard view uses
105 draw submissions; the glow change removes nine compared with the batched
multi-scale bloom version. The final art is still awaiting visual approval.

The browser logs an existing multiple-active-KTX2-loaders warning while separate
scene managers overlap during loading. Ownership/disposal checks remain bounded.
Chrome also reports that Windows ignores the adapter power-preference option;
the adapter actually selected is recorded in each measurement.

## Sources and reproduction

New modules: James Ray Cock's
[Modular Factory Facade](https://polyhaven.com/a/modular_factory_facade) and
Jorge Camacho's [Modular Industrial Pipes 01](https://polyhaven.com/a/modular_industrial_pipes_01),
under [Poly Haven CC0 terms](https://polyhaven.com/license). Original metadata,
licenses, hashes and modifications are in `art/environment-provenance.json` and
the accessible game credits. Retained material/crate provenance remains in
`art/provenance.json`.

`npm run assets:environment` exports the saved master without saving or modifying
it, verifies its hash and refreshes provenance. The explicit `assets:environment:author`
command recreates/overwrites the composition; it is excluded from normal builds.
See [the authored workflow](../../ash-quay-art-workflow.md).

To test the branch in VS Code:

```sh
npm ci
npm run dev
```

Enter the Works, pick up the baton with F, and open Esc/top-right menu to start
single or group practice. Development diagnostics remain excluded from production.
Main is not merged or pushed by this implementation approval.
All validation servers were stopped after the final run; ports 5173 and 4173
had no listeners at handoff.
