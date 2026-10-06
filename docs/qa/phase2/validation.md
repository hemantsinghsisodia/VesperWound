# Phase 2 player prototype — validation

Date: 2026-10-06. Scope: the approved Medic player prototype at Ash Quay. Technical checks and visual review are separate. This report does not approve a later phase or establish physical-phone performance.

## Delivered behavior

Entering the Works opens **Play**. WASD/arrows move relative to the elevated camera, Shift runs, a mouse click aims and punches, and Space dodges. Touch uses a joystick with independent Run, Attack and Dodge controls; handedness and interface scaling are retained. The camera follows smoothly. A Rapier capsule resolves static courtyard collision, gravity, ground contact and steps at a fixed 60 Hz simulation rate.

The marked practice target records successful punches. The orange pressure vent deals damage; a short dodge window grants invulnerability. At zero health, movement and attacks stop, the death animation holds, and **Return to the intake** restores the spawn and health. Courtyard/Medic previews, settings and detailed inspection pause simulation. Play resumes it. Quality changes retain player state and reuse the session's physics world.

This is an unarmed prototype. Enemy AI, weapons, encounters and subsequent phases are outside this delivery.

## Character and animation sources

The accepted Tony Flanagan Medic's appearance, equipment, materials and 67-bone rig remain unchanged. Each character tier still has 18,745 triangles and uses the original native texture detail (128–1024 pixels). The character master and three exported character files retain their previous hashes. No subdivision, new clothing or equipment was added. The original Fab source has no animations.

Seven separate clips were acquired from Quaternius's free **Universal Animation Library Standard** under CC0 1.0, with contributor Gonzalo Furnier credited: `Idle_Loop`, `Walk_Loop`, `Jog_Fwd_Loop`, `Punch_Cross`, `Roll`, `Hit_Chest`, and `Death01`. These are Phase 2 additions, not animations supplied with the Fab Medic. Retargeting corrects the source T-pose versus Medic's lowered-arm bind pose, transfers rotations in world space, bakes at 30 Hz, removes horizontal hip travel and retains vertical motion. Gameplay applies clip playback rates to match its action durations; preview names and authored durations remain intact.

- Editable accepted character: [medic-master.blend](../../../art/source/medic-master.blend).
- Editable retargeted animation master: [medic-player-animations.blend](../../../art/source/medic-player-animations.blend).
- Acquisition, license, modifications and hashes: [animation provenance](../../../art/animation-provenance.json), [combined provenance](../../../art/provenance.json).
- Runtime clip inventory: [animations.json](animations.json); shared compressed animation pack: 148,544 bytes.
- Reproduction and read-only export workflow: [Medic art workflow](../../medic-art-workflow.md). `npm run assets:build` exports saved masters and verifies that neither source changes. One-time acquisition/retargeting tools are separate from this normal build.

Accessible game credits retain Medic's CC BY 4.0 attribution and add the separate CC0 animation source. Untouched animation downloads and their license remain under `art/imports/animations`.

## Functional and rendering checks

| Check | Result |
| --- | --- |
| `npm run check` | Passed strict TypeScript, ESLint, 31 unit tests and production build. |
| Saved-source art build | Passed; seven clips exported and character/animation master fingerprints unchanged. |
| Movement and collision | Walk/run speeds, diagonal normalization, wall sliding, blocked fast dodge, and authored stair/landing traversal passed. |
| Combat state | Buffered input, one hit per punch, dodge distance/window/recovery, death lock and restart passed. Browser target/damage/death flows passed on hardware Chrome. |
| Asset contracts | Tier ceilings, 67-bone skeleton, normalized weights, valid joint indices, clip names/channels, finite normalized animation rotations and in-place motion passed. |
| Animation presentation | All seven clips and transitions rendered in the studio; static-to-clip fading and held gameplay death checked. No broken animation bindings or vertex attribute errors. |
| Actual browser rendering | WebGPU hardware and WebGL2 rendered Medic and Ash Quay. Desktop and mobile landscape captures retained. |
| Touch input | Simultaneous joystick/run, action taps, pointer cancellation, left-handed enlarged controls and portrait pause passed. Enlarged controls no longer overlap. |
| Scene and quality lifecycle | Ten scene reloads, six quality swaps, and four inspection entry/exit cycles passed with bounded resources/listeners/texture allocations. |
| Failure and cancellation | Failed quality/inspection loads retain the current scene, retry works, leaving during load disposes late results, and rapid entry/exit recovers. |
| Audio and foundation regressions | Legacy/unavailable spatial-audio paths, movement cancellation/resume, multi-touch cancellation and orientation handling passed; applicability skips remain explicit. |
| Production smoke | Passed fallback to WebGL2, entry, exclusion of diagnostics/development flags, and no fixture requests. |
| Mobile requests | Only mobile art and shared animations requested; detailed inspection assets were never requested. |

Evidence: [player hit flow](player-desktop.json), [death/restart](player-death.json), [clip rendering](animation-browser.json), [WebGPU inspection lifecycle](inspection-webgpu-required.json), [WebGL2 inspection lifecycle](inspection-webgl2.json), [mobile requests](mobile-requests.json), and [scene/quality lifecycle](../visual-lifecycle.json).

The courtyard owns three asset references (character, environment and shared animations); active inspection brings the total to five. Across ten reloads, the restored courtyard retained 22 owned resources, three references, 47 listeners and 53 textures. Its estimated renderer allocation changed by 734 bytes. Four WebGPU inspection cycles returned to the same resource/reference baseline, with an eight-byte estimate change. Renderer byte counts are allocation estimates, not a physical VRAM profiler. Scene reload captures include shader compilation and asset-loading stalls and are not used as steady-state performance evidence.

## Visual review

[Browser capture gallery](comparison.html) includes gameplay distance, mobile controls, all seven animation poses, character angles, material source/compressed comparisons and equipment detail. The earlier retargeting defect that raised the arms into a T-pose was corrected before these captures. Inspected browser images show a coherent Medic silhouette, attached pouch/equipment and intact skinning through walk, punch and roll. The roll preserves the licensed clip's vertical tuck.

These captures establish prototype functionality, not cinematic animation polish. There is no foot IK or cloth simulation. Stride matching is approximate; foot contact, clothing/pouch intersections and transitions need further artist review in motion. The accepted Medic remains the likeness reference. No comparison against the retired Iona concept is used to claim acceptance.

## Delivery sizes

| Delivery | Measured bytes | MiB | Budget | Result |
| --- | ---: | ---: | ---: | --- |
| Bootstrap, gzip | 2,546,238 | 2.428 | 5 MiB | Pass |
| Initial desktop art, raw | 16,468,133 | 15.705 | 20 MiB | Pass |
| Initial mobile art, raw | 10,325,941 | 9.848 | 10 MiB | Pass |
| Additional inspection, raw conservative total | 6,727,120 | 6.416 | 40 MiB | Pass |

[Production delivery evidence](../visual-delivery.json). Shared animations count against every initial art tier. Inspection conservatively counts that pack again, although an already loaded pack is reused. Mobile art has only 159,819 bytes of headroom. Rapier's lazy JavaScript/WASM chunk contributes about 1.67 MB gzip to the counted bootstrap total; the large-chunk build warning is retained.

## Sustained desktop performance

Both Phase 2 runs passed on Chrome 154.0.8037.98 with an Intel `gen-12lp` WebGPU adapter. The adapter did not expose a device/description string. These are new measurements of this production build; no earlier static Medic results are substituted.

| Mode | Duration | Frames | Mean FPS | p95 interval | Maximum interval | >50 ms / >100 ms | Result |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Active gameplay | 600.994 s | 68,095 | 113.31 | 11.5 ms | 44.2 ms | 0 / 0 | Pass ≤18.5 ms |
| Detailed inspection | 600.562 s | 248,470 | 413.82 | 3.2 ms | 40.9 ms | 0 / 0 | Pass ≤35 ms |

Both runs had no runtime errors. Gameplay's sampled renderer allocation remained 56,378,004 estimated bytes (53 textures); inspection's remained 72,803,343 estimated bytes (64 textures, including the retained courtyard assets). Warnings reported Chrome's ignored Windows `powerPreference` option and, in inspection, the multiple-KTX2-loader warning already noted below.

Method: production Chrome at full 1440 × 900, High quality, adaptive resolution disabled, 30-second warmup and ten-minute measurement per mode. Chrome frame-rate limiting and GPU vsync are disabled; the application has no frame limiter. Gameplay alternates 450 ms run cycles, exercising fixed physics, skeletal animation and camera follow. Inspection loops idle. An external requestAnimationFrame observer measures presented intervals including CPU submission and scheduling; it does not isolate GPU execution time. Other rendering tests and art builds are kept off during these runs.

Targets: gameplay p95 ≤18.5 ms; detailed inspection p95 ≤35 ms. Raw evidence: [gameplay-performance.json](gameplay-performance.json) and [cinematic-performance.json](cinematic-performance.json), including adapter, duration, allocation samples, long intervals, warnings and errors. `powershell -NoProfile -File tools/run-performance.ps1` finished with both tests passing in 21.6 minutes.

## Remaining limits

- Courtyard collision uses 49 static box proxies, not exact decorative-mesh collision. Covered stores and solid landmarks block movement; small pipes/debris are not individually collidable.
- The existing landing overlaps narrow stair meshes, presenting a 0.53 m lip to the capsule. Autostep is 0.6 m to traverse it. Rebuilding that stair geometry is environment work; it is not hidden as a solved realistic traversal problem.
- Chrome on Windows reports that WebGPU `powerPreference` is ignored. Overlapping courtyard/studio loading also emits Three.js's multiple-KTX2-loader warning; disposal checks show bounded allocations, but this does not prove driver-level memory behavior.
- Physical Android/iPhone performance, thermal behavior, input latency and real touch ergonomics remain unverified. Emulation and desktop hardware tests cannot close that gate.
- This report does not certify final animation/art quality or authorize Phase 3.
