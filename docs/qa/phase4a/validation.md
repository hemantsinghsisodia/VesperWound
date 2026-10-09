# Phase 4A — first playable melee enemy

Date: 2026-10-09. Implementation and technical validation are complete. **Visual/contact approval remains awaiting user review. Physical-phone performance remains unverified.** No further enemy archetypes or hordes were started.

## Play and review

Enter the Works opens training. Select **Start encounter** to load Zombie 7. Use WASD/Shift, left light, right heavy, Space dodge and Q Ward. Step into punch range manually; there is no automatic attack step. The enemy warns before a committed stationary strike. Break 100 posture, then land a heavy within two seconds for a deliberate critical. Defeat displays victory. Restart encounter restores the fight; Return to training releases enemy art and restores posts and vent.

- [Source/runtime comparison gallery and demonstration](comparison/index.html)
- [Short combat recording](combat-demonstration.webm)
- [Implementation and authored workflow](implementation.md)
- [Desktop stagger](browser/stagger.png), [critical/victory](browser/critical-victory.png), [death](browser/death.png), [mobile landscape](browser/mobile-left.png)

## Asset and visual evidence

The Fab-supported original download is **Zombie Number 7 – Animated by Tony Flanagan**, licensed CC BY 4.0. Original ZIP/GLB hashes, acquisition date, author, listing, license and modifications are in `art/enemy-provenance.json`. Accessible game credits link the listing and license. The package supplied GLB/textures, not a Blender source; the packed editable import is `art/source/zombie7-master.blend`. Automatic script execution was disabled for opening/importing/exporting. Export commands verify the saved master hash remains unchanged.

The original is 21,112 triangles with 65 bones. Actual files contain **12 named actions total: eleven motion clips plus T-Pose**, rather than the listing's advertised twelve plus pose. Attack, Idle, Walk, Scream and Death map the encounter. No additional or retargeted enemy clip was needed. All supplied named actions remain in exports; horizontal hip translation is removed, retaining vertical and limb animation.

| Delivery | Triangles | GLB bytes | Ceiling |
| --- | ---: | ---: | --- |
| Desktop | 5,867 | 2,982,096 | 6K triangles; 2K textures; 8 MiB encounter |
| Mobile / Low | 1,855 | 2,939,620 | 2K triangles; 1K textures; 4 MiB encounter |

Native maps are 512/1024 pixels and are never upscaled. Normal maps use UASTC with supercompression; suitable color/material maps use ETC1S; geometry/animation delivery uses Meshopt. Original rig/material identity is retained. Region weights prioritize face/neck/hands; derivative-only seam welding prevents independent collapses opening cracks at duplicated UV vertices.

Initial import bounds included non-rendering geometry and produced an incorrectly small floating runtime character. Actual skin bounds were used to correct the authored normalization. Final browser Idle bounds are approximately 0–1.8 m on both tiers; desktop compression/reduction introduces less than one millimetre of floor penetration and mobile about 1.5 mm of clearance. See `normalization-correction.json` and `comparison/browser.json`. Blender source captures use the measured skin extents for framing; their raw importer bounds are separately disclosed in `blender-source/render.json`.

Matched front/profile/back/three-quarter, face/hands/feet, walk, attack windup/contact, stagger and death frames were captured on **actual WebGPU and WebGL2** for source, desktop and mobile. Separate read-only Cycles captures show the saved Blender source. Browser comparison panels share lighting/framing; Blender light/tone mapping differs and is not a pixel-equivalent comparison. Browser renders report no page errors or vertex/binding errors.

Observed limitations: mobile has visible face/hand/body faceting in inspection close-ups; its intended use is gameplay distance. The supplied shuffling gait retains some foot drift during turns/knockback despite calibrated walk playback. Attack/idle/reaction/death transitions and source deformation are preserved, but convincing contact and reduced-tier appearance require the user's art/combat review. Passing technical checks does not close that gate.

## Technical checks

- `npm run check`: strict TypeScript, ESLint, **59 unit tests**, production build passed. Tests cover detection/LOS, navigation clearance and unreachable return, eight-metre leash without heal/teleport, attack locking/timing/obstruction, hit deduplication, simultaneous lethal trades, Ward/dodge, stagger recovery/critical consumption, generation rejection, attack slots and restart. Exports validate actual skeleton, normalized weights, joint indices, clip inventory, tier geometry/texture/payload ceilings.
- Selected browser suite: **41 applicable cases passed across the full run and targeted reruns; 18 project-specific skips**. Training, legacy/unavailable spatial audio, touch cancellation, portrait pause, all quality presets, source material comparison, inspection, relocated dependencies and disposal regressions retained. An old fading one-shot could reset a newly selected studio clip; the completion handler now checks the current action and has a focused unit/browser regression.
- Two production tests passed: development commands/flags excluded, no enemy request at startup, selected desktop enemy load, real-input fight through critical/victory, and return to training.
- Enemy loading cancellation, failure/retry, inspection freeze/restore, rapid cycles and failed enemy quality replacement tested. Failed quality replacement retains the simulation and old view; successful quality replacement preserves combat state. Three instances are development-only; measured separation and one attack slot pass, with new entity generations after restart.
- Mobile landscape at 915 × 412, emulated Pixel 7 touch, 140% scale and left-handed layout: Ward blocks, controls remain in bounds, pointer cancellation/portrait pause pass. Requests include only the mobile enemy; no desktop enemy or inspection payload is requested. Emulation is not a physical-phone result.

During the initial broad run, a capture before Q caused a timing miss, two cases were interrupted by development reloads while files changed, and one later capture hit a filesystem overwrite error. Capture order/output location were corrected and affected cases passed with the files stable. Fresh regression evidence is under `regressions`; historical Phase 3 evidence is retained.

## Ownership and delivery

Four start/return cycles on each backend returned to **31 owned resources, 3 references and 43 textures**, without allocation growth. WebGPU returned to 46,798,425 estimated bytes; WebGL2 to 46,079,897. During active high-quality combat, allocation stayed at 57,220,259 estimated bytes and 60 textures; inspection stayed at 73,016,856 bytes and 65 textures. These are renderer estimates, not driver VRAM telemetry. See `browser/*-lifecycle.json`, `browser/loading-pooling.json` and `docs/qa/visual-lifecycle.json`.

`npm run size` passed after the final production build:

| Payload | Bytes | Limit |
| --- | ---: | ---: |
| Bootstrap, gzip | 2,557,531 | 5 MiB |
| Initial desktop art, raw | 16,500,401 | 20 MiB |
| Initial mobile art, raw | 10,358,209 | 10 MiB |
| Additional inspection, raw | 6,759,388 | 40 MiB |
| Additional desktop encounter, raw | 2,982,204 | 8 MiB |
| Additional mobile encounter, raw | 2,939,728 | 4 MiB |

Raw optional payloads include manifests; shared player animations count against initial-art limits. Mobile initial art is close to its ceiling (about 125 KiB spare). Optional enemy art is requested only after selection. Credits/provenance accompany redistribution.

## Five-minute production measurements

Hardware: Windows 11 build 26200, i7-13620H, Intel UHD integrated GPU. Chrome 154.0.8037.98 reported active WebGPU adapter **Intel / gen-12lp**; the installed RTX 4050 was not the measured adapter. High quality, full **1440 × 900**, adaptive resolution disabled, 30-second warmup and **five minutes per scenario**. Chrome `--disable-frame-rate-limit` and `--disable-gpu-vsync`; no app limiter or development commands. External requestAnimationFrame intervals include CPU submission/scheduling, not isolated GPU timestamp queries.

| Scenario | Duration | p95 | Average FPS | >50 ms / >100 ms | Maximum | Result |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Active encounter | 300.6 s | 13.0 ms | 109.0 | 6 / 2 | 151.3 ms | Pass ≤18.5 ms |
| Detailed inspection | 300.3 s | 3.8 ms | 414.8 | 0 / 0 | 28.6 ms | Pass ≤35 ms |

The real-input exercise repeatedly drives pursuit, Ward, heavy attacks, stagger, criticals, defeat and restart. Across warmup plus measurement: 57 victories, 171 successful strikes, 57 criticals and 113 blocks. Idle skeletal playback runs in inspection. Production reports retain all samples, errors, warnings, allocation estimates and long frames. Browser warnings include Windows ignoring `powerPreference` and overlapping KTX2 loaders during optional/transactional loads; no page errors were recorded. Renderer timings on WebGL2 and physical-phone thermal/performance behavior remain unmeasured.

Evidence: `encounter-performance.json`, `cinematic-performance.json`, `workstation.json`, `asset-report.json`, `contact-samples.json`, `comparison/browser.json`, `art/enemy-provenance.json`, editable master and optimized exports.
