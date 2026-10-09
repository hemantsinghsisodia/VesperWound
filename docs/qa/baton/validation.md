# First weapon — steel baton pickup

Date: 2026-10-09. The weapon milestone is implemented. Visual/contact approval remains awaiting user review; passing technical checks does not close that gate. Group encounters and subsequent phases were not started. Physical-phone performance remains unverified.

## Play and review

Run `npm run dev`, enter the Works and press **F** beside the marked baton, approximately 1.1 m ahead of Medic. Touch has a contextual **Pick up** button. Select **Start encounter** after equipping. Left click/touch Attack chains three swings; right click/Heavy performs an overhead strike. Space/Dodge and Q/Ward retain existing defenses. Step into reach manually: attacks add no movement. The HUD shows **Steel baton**. Equipment survives death/restart, encounter restart, return to training, inspection and quality replacement in this session. Reloading the page restores the pickup and unarmed combat.

- [Browser comparison gallery, all eleven armed clips and recording](index.html)
- [Pickup-and-combat recording](pickup-combat.webm)
- [Fitted hand grip](browser/webgpu-required-grip.png)
- [Mobile landscape, enlarged left-handed controls](browser/mobile-left.png)
- [Simulation, loading and ownership implementation](implementation.md)

## Authored assets and provenance

Editable originals are `art/source/steel-baton.blend` and `art/source/medic-baton-animations.blend`. Medic's accepted character and original unarmed animation masters are unchanged. The baton is approximately 55 cm, **816 triangles**, two PBR materials and no texture downloads; worn steel and a ribbed dark wrap keep the small prop readable. It uses Medic's existing RightHand and an authored attachment saved in the animation master. Finger curls, opposing thumb and swing arm poses are baked offline; no runtime IK or animation-driven damage is used.

The acquired Quaternius Universal Animation Library is CC0 1.0. Sword_Idle and Sword_Attack supply the starting poses; the saved actions add forehand, backhand, finishing and overhead paths, fitted fingers, and armed locomotion/dodge/Ward/hit/death. These are **modified Quaternius animations**, not supplied Fab clips. `art/baton-provenance.json` and the public license record retain the author/contributor, original archive hash, acquisition date, source/license links, modifications, saved-master hashes and runtime hashes. Accessible game credits distinguish original baton authorship from the licensed animation source.

`node tools/build-baton.mjs` and the normal art build export saved masters with Blender automatic script execution disabled, never save over them, and compare their hashes before/after. Model and animation delivery use Meshopt. The explicit preparation scripts are retained as history and must not be rerun over authored edits. Exported immutable 60 Hz hilt/tip samples live in `src/player/baton-contact.json`; runtime hand metadata is `src/world/baton-grip.json`.

## Technical and visual validation

- Final `npm run check`: strict TypeScript, ESLint, **68 unit tests in 13 files**, and production build pass. `npm run size` passes all delivery limits.
- Broad browser regressions: **26 passed, 17 project-specific skips**, covering weapon flows on actual WebGPU/WebGL2, unarmed training, enemy encounter, original animations/materials, touch, inspection failures/cancellation, quality replacement, manifest-relative dependencies and resource disposal. Historical Phase 4A artifacts were preserved; fresh regression outputs are under `regressions/`.
- Follow-up mobile pickup/layout test: **1 passed**. Legacy/unavailable spatial audio on desktop/mobile: **4 passed**. Production: **3 passed**, including no armed-pack request before pickup, explicit request on F, armed inspection and equipment retention through encounter restart/return. Development commands/diagnostics remain excluded.
- CPU tests cover eligibility, living/free-action/range/obstruction checks, request deduplication, failure/retry, generation/range/scene cancellation, fixed-tick equip, session retention/page reset, armed damage/chain/timing/buffering/reset, recovery dodge, pressure once per attack, contact boundaries, obstruction, deduplication and critical consumption. Simulation receives no graphics-quality input; identical armed and unarmed encounter state sequences are checked separately.
- Actual captures show all eleven armed actions on both backends, grip and gameplay distance. A real-input fight delivers ordinary hits, stagger, a consumed heavy critical, two Ward blocks and victory. Four sampled heavy-contact frames in the latest capture differ from the exported world tip by at most **1.12 mm**, accounting for the presentation's one-tick advance. This samples selected frames; it does not prove every transition. Every armed attack also has CPU near/far/side/rear/obstruction checks.
- Emulated Pixel 7 landscape, 915 × 412 CSS pixels, 140% scale and left-handed controls: pickup, simultaneous movement/attack, pointer cancellation and portrait freeze pass. Only mobile character art and the shared weapon pack are requested; no desktop/inspection payload is needed. Emulation does not establish phone thermals or touch hardware behavior.

Visual limits: the imported sword base retains a crouched combat stance; the small baton uses simple PBR shading rather than high-detail scratch textures. Preview images are sampled poses. Clothing, feet and equipment should still be judged in the continuous recording and interactive previews; passing checks is not a substitute for user approval of swing feel and appearance.

## Ownership and payloads

Failed/delayed loads leave the pickup and unarmed gameplay available. Leaving reach, changed player generation and scene transitions invalidate the interaction; late results are disposed. Equipment commits only after clips are available and eligibility is revalidated at a fixed tick. Inspection/quality reconstruction uses session-owned clips without resetting combat or equipment.

The baseline has **34 owned resources / 4 references**; equipping adds the optional animation pack, producing **35 / 5**. Three repeated inspection/reload cycles return to **35 / 5**. Estimated renderer allocations decrease across those cycles (55.70 → 55.66 → 49.34 → 43.65 MB), with 54 textures; no owned-resource growth occurred. Broader ten-reload/six-quality-change checks also pass. Renderer estimates are not driver VRAM telemetry.

| Delivery | Bytes | Ceiling |
| --- | ---: | ---: |
| Baton GLB | 9,252 | 32 KiB |
| Optional armed animations + manifest | 427,668 | 512 KiB |
| Compressed bootstrap | 2,567,625 | 5 MiB |
| Initial desktop art, raw | 16,509,743 | 20 MiB |
| Initial mobile art, raw | 10,367,551 | 10 MiB |
| Additional detailed inspection, raw | 6,768,730 | 40 MiB |
| Additional desktop encounter, raw | 2,982,204 | 8 MiB |
| Additional mobile encounter, raw | 2,939,728 | 4 MiB |

All size checks pass. Initial art includes the ground baton; armed animations load only on interaction. Mobile character plus equipment is **19,561 triangles**, under 20K. The mobile initial-art budget has 118,209 bytes spare. Credits/provenance accompany delivery. The existing large Rapier chunk advisory remains, while compressed bootstrap stays below its limit.

## Five-minute production measurements

| Scenario | Duration | p95 | Average FPS | >50 ms / >100 ms | Maximum | Result |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Armed active encounter | 300.34 s | 11.5 ms | 116.8 | 1 / 0 | 53.0 ms | Pass ≤18.5 ms |
| Equipped detailed inspection | 300.24 s | 3.2 ms | 419.0 | 0 / 0 | 15.9 ms | Pass ≤35 ms |

Across warmup plus combat measurement: **55 victories, 165 strikes, 55 criticals and 105 Ward blocks**. The encounter allocation estimate stayed at 57,320,666 bytes / 60 textures; inspection stayed at 73,175,865 bytes / 65 textures. Neither run recorded page errors. See [combat report](encounter-performance.json), [inspection report](cinematic-performance.json) and [device inventory](workstation.json).

The measured device is Windows 11 build 26200 / Intel i7-13620H. Chrome 154.0.8037.98 reports the active WebGPU adapter as Intel/gen-12lp UHD; the installed RTX 4050 is not the measured adapter. High quality, full 1440 × 900, adaptive resolution disabled, 30-second warmup and five minutes per scenario. Chrome frame limiting and GPU vsync are disabled; no application frame limiter is used. External requestAnimationFrame intervals include submission/scheduling, not isolated GPU timestamp queries.

The encounter uses real production inputs and the equipped baton through pursuit, heavy swings, Ward, stagger, critical, victory and restart. Inspection loops equipped Baton_Idle. Reports retain durations, long frames, allocation estimates, errors and warnings. Windows powerPreference and overlapping KTX2 loader warnings are recorded; they do not imply a measured RTX run. Sustained WebGL2 timings and physical-phone performance remain unmeasured.

The final rebuild followed source line-ending/trailing-whitespace cleanup and added armed buffering/quality-determinism tests; these did not change gameplay behavior. Validation servers were stopped. Ports 5173, 5180 and 4173 have no listeners after cleanup.
