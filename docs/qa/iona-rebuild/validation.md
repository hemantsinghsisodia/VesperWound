# Iona cinematic rebuild — validation and art review

Candidate date: 2026-10-06 (Asia/Calcutta). **Awaiting art review.** The authored source, three exports and optional inspection presentation are delivered. The requested visual standard is not yet demonstrated; the open issues below prevent treating this as an art-approved cinematic character.

## Review evidence

Open [comparison gallery](comparison.html) or [overview image](comparison.png). The original [concept sheet](../../../art/references/iona-design.png) is a 2D illustration. It is not a neutral-light render or calibrated orthographic model. The old model is preserved in `art/baseline/iona-v1`; matched front, profile, back and three-quarter Blender renders use the same pose, cameras and neutral lighting. Both candidates have clay and textured views and face, hair, hand, boot, lantern and hook close-ups.

Actual browser captures in `browser/` include both WebGPU and WebGL2, full-body/portrait/equipment views, orbit, both lighting presets, all five clips and four turn angles. `materials-source-*` and `materials-compressed-*` compare the uncompressed PNG intermediary with KTX2 in the same runtime studio. The gallery also includes desktop and 915 × 412 mobile landscape gameplay-distance captures. These are actual renders, not concept images substituted for gameplay.

The build initially replaced authored hair blending with a binary alpha cutoff. Minified strand alpha fell below that threshold, erasing the swept layers. Paired renders caught this; exports now preserve authored blending. Both backend captures and resource tests were repeated after the correction. Source and compressed face/equipment/hair renders were visually inspected; remaining broad card edges are an authoring defect, not evidence of approved hair quality.

## Authored delivery

The canonical [master](../../../art/source/iona-master.blend) retains complete anatomical reference, garment panels, groom curves/runtime cards, sculpt and bake proxies, offline cloth study, equipment, rig and separate export collections. The authoring was performed with explicit Blender scripts and saved incremental editing; normal builds open this saved work without rerunning those authoring scripts. `assets:build` verifies that the master SHA-256 does not change during export. `assets:legacy` is an explicit separate command.

There are 22 extracted source images in [texture sources](../../../art/textures/iona/sources.json). Clothing has padded panel UV regions, tangent-space normals and AO/color bakes. Failed projection regions were repaired and packed images refreshed. Complete anatomy remains in the master; hidden anatomy is removed only from exported derivatives. Reduced topology uses per-part garment grids, facial feature preservation, hand meshes and smaller fittings, without uniform whole-character decimation.

| Tier | Triangles including equipment | Texture maximum | Optimized character bytes |
| --- | ---: | --- | ---: |
| Cinematic | 135,152 | Face 3072; clothing/other ≤2048 | 18,619,436 |
| Desktop | 49,964 | ≤2048 | 11,098,524 |
| Mobile | 19,913 | ≤1024 | 3,889,672 |

All tiers use 63 deformation bones: original 19, two clavicles, four twists, 30 finger bones, two eyes and six additional coat bones. Bone presence, normalized skin weights, hand-parented `socket_lantern`/`socket_wake_hook`, five clip names and in-place walk/run are checked from the optimized files. Clothing and equipment use skeletal motion; cloth simulation is an offline aid.

Normals and cinematic hair opacity use UASTC with Zstandard; suitable color and packed maps use ETC1S. The licensed skin photograph is 2K. Original tone, pore and roughness authoring at 4K does not turn it into native 4K photography. The pinned encoder's 12M-texel limit requires a 3K cinematic face export, within the approved 4K maximum. Small equipment wear maps use 512 pixels cinematic and 256 desktop/mobile. Every imported source and output hash is in [provenance](../../../art/provenance.json); verified imports are CC0. See [workflow](../../iona-art-workflow.md).

## Technical behavior

`ArtVariant` remains desktop/mobile for the environment. `CharacterTier` independently adds cinematic; inspection state is a typed union. Eligible desktop configurations load cinematic assets only after explicit selection. The courtyard remains resident and visible during loading. Failure retains the courtyard and provides retry; cancel, late completion and quality changes recover safely. Exit restores the courtyard and releases the cinematic owner, animation mixer, controls, reflection and shadow resources.

Manifest-relative dependencies and reference-counted ownership are retained. Fetch cancellation covers response bodies; disposal waits for outstanding decoders before terminating workers and destroys late results. The original technical courtyard remains development-only. No Phase 2 movement, collision, damage, health or death has been introduced.

Final verification:

- TypeScript, lint, production build and 19 unit tests passed; asset contracts include triangle/texture limits, 63 bones, normalized weights, sockets, in-place clips, semantic compression and authored hair blending.
- Eight final hardware browser checks passed: WebGPU/WebGL2 inspection, paired source/compressed output, failed/cancelled/rapid inspection loads and quality recovery, courtyard poses, ten scene reloads/six quality swaps, failed variant retry and relocated glTF dependencies.
- Production compatibility startup ignores development flags and excludes diagnostics.
- Six final desktop/mobile regressions passed: legacy and unavailable spatial audio positioning on each surface, plus final showcase rendering/clip controls and mobile touch/landscape/High-quality cinematic exclusion.

Four inspection entry/exit cycles per backend return to two courtyard references and nine owned resources; application-accounted listener counts return to baseline. That counter does not enumerate OrbitControls' internal browser listeners; its disposal is explicit in the studio owner. Exact renderer estimates and texture counts are in [WebGPU disposal evidence](inspection-webgpu-required.json) and [WebGL2 disposal evidence](inspection-webgl2.json). These are renderer accounting estimates, not hardware VRAM residency measurements. Late cancellation and retry checks passed without page errors. Mobile startup and even a coarse-pointer High quality selection never request the cinematic manifest/model.

## Delivery limits

Measured from the final production build; initial art includes only the selected environment and character variant. Additional cinematic art is separate. Bootstrap measurement conservatively includes all non-variant files, even optional JavaScript chunks.

| Group | Measured | Approved limit | Result |
| --- | ---: | ---: | --- |
| Bootstrap (gzip) | 893,582 bytes / 0.85 MiB | 5 MiB | Pass |
| Desktop initial art (raw) | 20,839,641 bytes / 19.87 MiB | 20 MiB | Pass; 131,879 bytes headroom |
| Mobile initial art (raw) | 7,488,597 bytes / 7.14 MiB | 10 MiB | Pass |
| Additional cinematic art (raw) | 18,619,540 bytes / 17.76 MiB | 40 MiB | Pass |

[Size report](../visual-delivery.json) and [asset report](../../../art/asset-report.json) contain exact values. Source .blend files, PNGs and uncompressed GLB intermediates are development deliverables, not startup payloads.

## Sustained production performance

The serial measurements use Chrome 154.0.8037.95, WebGPU on the reported Intel `gen-12lp` adapter, full 1440 × 900 High quality, adaptive resolution disabled, 30-second warmup, ten-minute sample window, `--disable-frame-rate-limit` and `--disable-gpu-vsync`. The browser did not expose an exact GPU model. The application has no frame limiter. An external requestAnimationFrame observer measures CPU submission and scheduling intervals; it is not an isolated GPU timestamp measurement. No simultaneous agent-driven graphics tests or Blender renders ran during either measurement. Targets: courtyard p95 ≤18.5 ms; cinematic p95 ≤35 ms.

| Mode | Duration | Average FPS | p95 | Maximum | >50 ms / >100 ms | Result |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Courtyard | 600.56 s | 118.62 | 10.10 ms | 94.70 ms | 6 / 0 | Pass ≤18.5 ms |
| Cinematic | 600.39 s | 262.47 | 4.40 ms | 85.60 ms | 7 / 0 | Pass ≤35 ms |

[Courtyard raw measurement](gameplay-performance.json) records 71,239 frames, zero page errors and a renderer allocation estimate of 48,598,946 bytes (50 textures) after warmup. The only console warnings state that Windows ignores the WebGPU `powerPreference` hint; the actual adapter evidence is recorded rather than assuming a discrete GPU.

[Cinematic raw measurement](cinematic-performance.json) records 157,574 frames, zero page errors and a renderer allocation estimate of 60,753,850 bytes (60 textures) after warmup, including the retained courtyard. It also records Three.js' advisory about multiple active KTX2 loaders: the retained courtyard and optional cinematic asset owners currently have separate decoder pools. Exiting inspection disposes the cinematic pool; lifecycle tests show no retained resource growth. Sharing the transcoder pool would avoid this advisory but was not required to meet the measured targets. The Windows power-preference warning also appears here.

Both ten-minute tests passed. The temporary Windows keep-awake request was released by the benchmark helper after completion. These results do not certify phone performance or eliminate the recorded long frames.

The courtyard benchmark measures the visual showcase, because Phase 2 controlled gameplay does not exist yet. The cinematic benchmark uses the default full-body studio view and idle preview; it does not establish worst-case performance for every orbit, portrait and transition. Other agent-driven graphics jobs must finish before the benchmark. Physical phones remain unmeasured.

Earlier milestone reports used normal display cadence. Those numbers cannot establish a rendering-cost improvement relative to the new uncapped method; the final candidate is assessed against the approved absolute targets instead.

## Open art acceptance and limitations

- Face likeness, eyelid/lip forms, expression and skin realism remain below the concept. The current young anatomical morph and photographic texture are an approximation; no recognizable-likeness acceptance is claimed.
- Swept hair is present, but broad card edges, stepped hairline, scalp-layer silhouette and simplified bun remain visible. Brows are too uniformly hatched; the eyes still read as a mannequin in some views.
- The fitted split coat and continuous sleeves improve the silhouette, but folds are broad and mechanically repeated. Scarf/cape layering, seam construction, weathering and tonal separation need artist refinement; the runtime lantern can produce a strong brass-like highlight on the waxcloth.
- Fingers are articulated and sockets follow hands, but grip clearance and glove deformation need close-up review. Boots have uppers/soles/heels/straps, yet proportions and ground contact are not art-approved; neutral captures show a contact gap.
- Lantern pressure details and the curved metal hook are modeled, but the pressure housing and blade silhouette remain simplified relative to the concept.
- All clips play and transition, with stable attachment transforms and bounded foot heights in sampled poses. That does not prove planted contact, zero foot sliding or zero penetration for every frame. Weight shifts, shoulder deformation, coat clearance and hair transparency need frame-by-frame artist review. No complete all-pairs transition visual audit is claimed.
- Final matched comparison evidence is delivered. A complete archived capture set for every intermediate authoring stage was not retained; the authoring scripts and saved master preserve construction history, not that full stage-by-stage review record.
- Three.js cinematic skin uses the installed experimental SSS node material. Both current backends pass, but future Three.js upgrades need visual regression checks.
- The existing renderer uses no multisample antialiasing. Portrait captures expose some jagged silhouette/card edges; passing the performance gate does not approve that presentation quality.
- No physical Android/iPhone thermal or performance acceptance, no environment reconstruction and no Phase 2 work. Technical success does not close these gates.

The next art pass should resolve face likeness and groom structure first, then garment layering/wear and equipment silhouettes, then grip/contact/deformation. Review the delivered comparison evidence before accepting this candidate as the character's final visual standard.
