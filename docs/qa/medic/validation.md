# Fab Medic replacement — validation, 2026-10-06

The active character is Tony Flanagan's **SciFi Medic – Rigged**, labelled **Medic**. Enter the Works opens Ash Quay with this character. This milestone does not implement movement, collision, combat or new animations. The user **accepted Medic on 2026-10-06** and requested removal of the previous generated character. Visual approval and technical measurements are recorded separately.

## Acquisition and source

The original ZIP and converted GLB were downloaded through Fab's supported browser flow after the user explicitly approved accepting the download agreement. The listing records CC BY 4.0. Attribution, source and license links, and modification notices are accessible from the entry screen and settings at `/credits.html`.

- [Listing](https://www.fab.com/listings/2c775e7c-06e8-4b6c-96a0-c57c17987634), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- Untouched downloads, extracted Blender file and texture files: `art/imports/medic/`.
- Original download hashes and modifications: `art/medic-provenance.json`.
- Canonical editable, packed source: `art/source/medic-master.blend`.
- Original ZIP SHA-256: `ad0a58ac7133179c91aa57de99412458645372b24bf45445c57c228d9af01342`.
- Original converted GLB SHA-256: `4e0e95df851f7884b39e683ada3350f0aa5e87f1e75b2528f22451b829dd9a78`.

Blender was opened with automatic script execution disabled. Inventory found nine meshes, a 67-bone armature, 18,745 triangles and packed source textures at native 128–1024 pixel resolutions. The head color texture is 512 pixels. **Neither the downloaded Blender file nor the converted GLB contains animations**, despite animation-related listing tags. Static pose uses the supplied A-pose. There are no fabricated idle, walk or combat clips. Root-motion conversion and animated deformation/transition inspection are therefore not applicable to this delivery.

The master retains the source anatomy, equipment, materials and rig. A parent empty uniformly normalizes height to 1.8 metres and ground contact to zero. The normal build exports the saved master without saving over it and checks its hash. Ash Quay art remains unchanged. At the user's request, previous character source files, textures, comparisons, runtime backups and generators have been removed. The unfinished portrait route and its production assets are excluded. Cleanup is recorded in [cleanup.json](cleanup.json).

## Runtime exports and delivery

All three tiers retain 18,745 triangles, 67 bones, 15 textures and zero clips. The source already fits the mobile ceiling, so the same optimized export is reused for every tier. Inspection adds studio cameras and lighting, not extra mesh or texture detail. No subdivision, upscaling or uniform decimation was applied.

Meshopt compresses geometry. Normal and color maps use UASTC with Zstandard; packed material maps use ETC1S. Mipmaps preserve native sizes. Initial ETC1S color compression visibly blocked the coat in portrait views; paired source/compressed captures prompted the UASTC color correction. The rejected portrait compression capture is retained in `texture-compression-baseline/`. Final exported character SHA-256: `d61ab0b64fdfd01190b20ccb251c535bbcfb1cd243f2e755d6e82427a91e04f4`.

| Delivery | Measured bytes | MiB | Limit | Result |
| --- | ---: | ---: | ---: | --- |
| Compressed bootstrap | 893,843 | 0.85 | 5 MiB | Pass |
| Initial desktop art | 16,319,499 | 15.56 | 20 MiB | Pass |
| Initial mobile art | 10,177,307 | 9.71 | 10 MiB | Pass |
| Additional inspection art | 6,578,486 | 6.27 | 40 MiB | Pass |

Art budgets above use uncompressed transferred-file sizes, conservatively including manifests. Bootstrap uses gzip. Each character GLB is 6,578,372 bytes. Size checks load only the selected tier; mobile request evidence confirms no desktop or cinematic asset requests at startup or when selecting High on the emulated phone. Detailed inspection remains explicitly loaded on eligible desktop configurations.

## Visual evidence and findings

Open [comparison.html](comparison.html) for the Fab reference, Blender source and actual browser comparisons. Front, profile, back and three-quarter captures cover WebGPU and WebGL2. Source close-ups cover the face, hands, boots and medical pouch. Browser captures cover portrait, pouch, Neutral/Ash Quay lighting, orbit/zoom, desktop gameplay distance and mobile landscape/touch views. Source renders use neutral lights and an orthographic camera; browser studio captures use perspective and different tone mapping, so they are angle comparisons rather than pixel-identical images.

The untouched Fab converted GLB rendered visibly collapsed at the floor in the existing browser studio. `raw/` preserves this defect. The fresh export from the original Blender source restores the supplied shape. The exact failure in Fab's conversion was not isolated; the report does not attribute it to a proven specific joint or bind-matrix error.

The active export preserves the recognizable short hair, glasses, layered purple coat, glove fingers, boots, straps and medical pouch. Static renders show attached equipment and boots contacting the ground without the raw conversion's collapse. Native low-resolution textures and stylized sculpting remain apparent at portrait distance. Glasses reflections and material brightness differ from the Fab preview with lighting. Final UASTC color captures are materially closer to the source texture renders than the rejected ETC1S version. No animated foot-sliding, penetration or grip assessment is possible without supplied clips.

## Technical checks

- `npm run check`: type checking, lint, 23 unit tests across four files, and production build passed after the final texture change.
- Asset checks validate the actual 67 source bone names, normalized nonnegative weights, valid joint indices, zero exported clips, tier triangle/texture ceilings, KTX2 mipmaps, normal-map UASTC/Zstandard and Meshopt.
- Preview unit tests validate static-only assets, first-frame static poses, named clip selection, pause behavior, idle default and duplicate clip rejection using synthetic fixtures; these fixtures are not delivered game animations.
- Final replacement browser batch: **10 passed**, covering desktop/mobile layouts, actual hardware WebGPU/WebGL2 inspection, four inspection entry/exit cycles per backend, source/compressed texture comparisons, mobile touch/request isolation, failed/cancelled inspection, rapid requests, scene recovery, ten scene reloads, six quality swaps and manifest-relative external-buffer resolution.
- Hardware WebGPU courtyard test: **1 passed** with final assets.
- Existing legacy/missing spatial-audio API regression: **4 passed** across desktop/mobile. No audio implementation changed for this replacement.
- Production flag/diagnostic exclusion browser test: **1 passed**. The final production benchmark also checks that diagnostics are absent.
- `npm run size`: all four delivery limits passed after the final production build.

Inspection exits restore two asset references. Inspection, scene and quality tests retain bounded texture/allocation estimates and stable owned resources/listeners. These are renderer estimates and application ownership checks, not direct driver VRAM measurements. Scene reloads can include multi-second shader compilation stalls; lifecycle timing is not used as steady-state performance evidence.

Earlier concurrent jobs caused browser timeouts, and editing development source during a retry caused a Vite reload to destroy its page context. The final frozen-source, sequential browser batch passed all ten cases. Those interrupted runs do not establish performance results.

## Sustained production performance

Both final ten-minute production measurements passed. Chrome 154.0.8037.98 reported an Intel `gen-12lp` WebGPU adapter; the browser did not expose its exact device model. Evidence is in [gameplay-performance.json](gameplay-performance.json) and [cinematic-performance.json](cinematic-performance.json).

| View | Duration | Mean FPS | p95 frame interval | Target | Longest interval | >50 ms | >100 ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Courtyard | 600.59 s | 115.58 | 11.2 ms | ≤18.5 ms | 58.7 ms | 1 | 0 |
| Inspection, neutral full body | 600.59 s | 390.11 | 3.7 ms | ≤35 ms | 165.9 ms | 9 | 6 |

Renderer allocation estimates remained constant through all 20 samples: 55,978,928 bytes / 51 textures in the courtyard and 72,404,252 bytes / 62 textures in inspection, which retains the courtyard assets for restoration. Inspection entry/exit evidence separately returns to baseline within eight estimated bytes with nine owned resources and two references after every cycle. These measurements do not claim direct VRAM accounting or a worst-case result for every orbit/portrait position.

Both runs recorded no page errors. Chrome warns that Windows ignores the adapter power-preference hint. Inspection also emits Three.js's multiple-active-KTX2-loader warning because courtyard and inspection asset managers coexist. Their ownership is bounded and disposal checks pass, but the warning remains recorded rather than concealed. The cause of occasional long presentation intervals was not isolated.

Method: Chrome hardware WebGPU, production build, High quality, full 1440 × 900 canvas, adaptive resolution disabled, 30-second warmup, then ten minutes per view. Chrome disables the frame-rate limiter and GPU vsync. An external requestAnimationFrame observer records presentation intervals; measurements include CPU submission and scheduling and are not isolated GPU timestamp queries. Other build, render and browser jobs are stopped during sampling.

Physical-phone performance remains **unverified**; browser emulation and desktop hardware mobile layouts do not establish that gate. Technical acceptance passed for this measured desktop. The user accepted the visual presentation on 2026-10-06. Character cleanup does not alter the measured Medic or environment exports; their hashes were verified unchanged.

## Deliverables

Cleanup on 2026-10-06 removed 338 old-character files and 159 obsolete texture-cache files, freeing approximately 2.08 GiB. Legacy generation/fetch commands are gone; combined provenance and public notices now cover only the five retained imports. The Medic-only art build, `npm run check` (23 unit tests and production build), `npm run size`, and three WebGPU/WebGL2/mobile inspection regressions passed after cleanup. Hash comparisons verified all ten protected masters, original downloads and runtime models unchanged. Performance was not repeated because rendering code and measured assets are unchanged.

Editable master, untouched downloads and native texture sources, optimized exports/manifests, provenance and game credits, source/browser comparison captures, reusable read-only export tooling and this report are included in the workspace. [medic-art-workflow.md](../../medic-art-workflow.md) documents the retained build. Missing animation acquisition, player controls and mechanics remain Phase 2 work.
