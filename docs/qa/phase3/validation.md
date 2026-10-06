# Phase 3 — Unarmed combat validation

Implemented 2026-10-06. Technical checks pass; combat-feel acceptance remains awaiting review. Medic's accepted appearance, equipment, textures and supplied 67-bone rig remain unchanged. The prototype includes reactive training targets; it does not include enemy AI or Phase 4 gameplay. Technical checks and human combat-feel acceptance are separate.

## Play and review

Run `npm run dev`, open `http://127.0.0.1:5173/`, then choose **Enter the Works**. WASD/arrows walk, Shift runs, left click aims and queues light, right click attacks heavy, Space dodges and Q activates Ward. Touch retains simultaneous movement with separate Attack, Run, Dodge, Heavy and Ward controls. Settings provide handedness and scale up to 1.4×.

Approach the COMBO TARGET, press light three times with each next press near the end of recovery, then heavy. At **EXPOSED · HEAVY**, land another heavy within two seconds. The isolated target's observed health/posture sequence is **90/10 → 76/25 → 56/50 → 26/100 → 0/0**. The last strike displays **CRITICAL · 60** and consumes the opening. The heavier target and neighboring group target exercise higher health, reduced knockback and multi-target strikes. Defeated targets fold down, stop blocking movement and reset after four seconds; **Reset targets** restores all immediately.

The vent at the orange ring warns for 600 ms before a pulse every two seconds. Ward blocks one 20-damage pulse, costs 25 pressure and lasts at most 800 ms. The captured Ward test ends with 100 health, 75 pressure and one block. Dodge retains the Phase 2 movement and 40–160 ms invulnerability window. Death/restart clears buffered requests, active attack, combo, barrier, target state and counters.

[Demonstration and capture gallery](comparison.html) includes actual WebGPU/WebGL2 screen recordings, combo/stagger/critical feedback, Ward, enlarged touch layouts and neutral studio animation views. The recordings do not capture audio; test the distinct synthesized swings, impacts, blocks and Ward sounds in the running application.

## Rules and ownership

Attack values are in `src/player/combat-definitions.ts`, alongside the typed unarmed combat style, combatant state and discriminated combat events. The 60 Hz CPU simulation does not import Three.js. It resolves forward capsule attack volumes against target hurt volumes with static obstruction checks. Each attack instance damages each target once and restores 10 pressure once, even when it hits multiple targets. Animation callbacks never determine hits.

| Attack | Total seconds | Active window | Health | Posture |
| --- | ---: | --- | ---: | ---: |
| Jab | 0.60 | 0.22–0.32 | 10 | 10 |
| Cross | 0.65 | 0.25–0.36 | 14 | 15 |
| Finishing jab | 0.72 | 0.24–0.36 | 20 | 25 |
| Heavy cross | 0.90 | 0.42–0.56 | 30 | 50 |

Each press supplies one request with a 120 ms buffer; holding attack does not repeat. Requests made too early expire. The light chain resets after a 600 ms follow-up interval following recovery. Windup/active windows commit the action; dodge can cancel recovery. At 100 posture a living target exposes for two seconds, then recovers posture if unused. The next heavy doubles health damage and consumes exposure. Pressure starts at 100, caps at 100 and regenerates five per second after three seconds without an attack or damage/block activity.

The session owns the event channel and dispatches hits, blocks, stagger, criticals, defeat and reset to presentation/audio. Target knockback uses swept movement constrained by authored courtyard boxes, other targets and the player. Collision remains session-owned across art quality changes. Visual feedback owns its meshes, materials, label textures and a fixed 48-instance particle pool. Audio shares a cached noise buffer, caps scheduled sources at 24 and disconnects completed one-shots. Reduced Motion removes particles, camera impulses and strong hit flashes while retaining status labels and the vent warning. Mouse targeting uses a separate unshaken camera projection; a regression verifies identical aiming coordinates while only the visible camera moves. These settings do not change simulation outcomes.

The heavy animation retimes the existing cross's anticipation/contact/recovery to its longer CPU windup; the source motion is preserved. Idle and supplied clip selection, pause/resume, 180 ms transitions, courtyard previews and explicit detailed-inspection loading retain their existing ownership and cancellation behavior.

## Authored assets and provenance

The already acquired Quaternius CC0 Standard library supplied `Punch_Jab` and `Spell_Simple_Shoot`. These are additional retargeted animations, not animations supplied with Fab's Medic. All seven Phase 2 actions are retained. The saved editable animation master is `art/source/medic-player-animations.blend`; its pre-change packed backup is `art/archive/phase2/medic-player-animations.blend`. Read-only `npm run assets:build` passed and verifies source hashes before and after export. Normal builds do not run procedural authoring or modify either master.

| Artifact | SHA-256 |
| --- | --- |
| Accepted Medic master, unchanged | `a238e4aa8cdfc7e7a44357f7cc0d0c908aee64cec48fcdfa235afe3f05ba1a45` |
| Nine-action animation master | `58a9c78ef996935b84db7e7fed789c6353dff4869dc8119f1f374c7ad5a01d4b` |
| Compressed shared animation pack | `5e1d8168cb792755a95649955c14a2460402dc0f2569ece4a30564c6c5e353c1` |

The nine-action pack is **180,812 bytes**, an increase of **32,268 bytes**. Provenance, source archive hashes, authors, licenses and modifications are retained in `art/animation-provenance.json` and public notices. Accessible game credits describe the Phase 2/3 additions. No new character geometry, textures, equipment or dependency was added. All character tiers remain the existing 18,745-triangle native export with 128–1024 px textures. See [Medic workflow](../../medic-art-workflow.md).

## Automated and rendered checks

- `npm run check`: **pass**, strict types, lint, **45 unit tests** and production build. Combat tests cover injected styles, combo order/damage, timeout, buffer expiry, cancellation, per-target deduplication, group pressure award, obstruction, critical consumption, exposure recovery, Ward cost/block/expiry, regeneration, defeat/reset/restart, vent telegraph and collision-constrained knockback. The camera regression verifies feedback-independent aiming. Existing player, input, asset and lifecycle unit checks remain green.
- Hardware browser player/combat/inspection suite: **13 passed**, seven skips for desktop/touch applicability. Final focused combat captures: **three passed**, three applicability skips after feedback and heavy timing refinements. Full High and Low/Reduced Motion sequences match at every health/posture step on both WebGPU and WebGL2.
- Foundation browser regressions: **18 passed**, six applicability skips. Includes legacy and missing spatial AudioParams, audio pause/resume, settings, unavailable storage, touch pointer cancellation, portrait pause and fixture lifecycle.
- Production smoke: **one passed**, including WebGL2 fallback, ignored development flags and absence of diagnostic modules/commands.
- WebGPU showcase render and scene lifecycle regressions passed. Ten scene reloads and six quality changes retain resource counts and recover from failed variant loads; manifest-relative external glTF loading remains valid.
- Studio checks cover all nine clips and static pose, full body/portrait/equipment views, Neutral/Ash Quay lighting, orbit, pause, repeated entry/exit, failed/cancelled/rapid loads and quality changes. No binding errors or invalid foot coordinates were recorded. Source PNG and compressed KTX2 browser views are paired in the gallery captures.
- Desktop studio exit retains **three references, 31 owned resources, 54 listeners and 54 textures** across four cycles per backend. Estimated WebGPU renderer allocations stabilize around 56.6 MB; estimates are not driver VRAM measurements. Combat one-shot sources return to the three ambience voices after each sequence.
- Mobile landscape checks at **915 × 412 CSS pixels** verify separate ≥44 px touch regions, no control overlap at 1.4× scale in either handedness, Heavy/Ward responses and no desktop/inspection asset requests. These are browser emulation results.

Actual neutral studio and gameplay captures were visually inspected. Jab and cross use opposite striking arms; Ward visibly extends the open hand. Clothing, gloves, eyewear and pouch remain attached without observed skeleton collapse. At gameplay distance, labels identify ordinary, exposed, critical and defeated states; label offsets/guide lines avoid the earlier overlap and keep Medic visible. Prototype attack volumes are generous: after knockback or at the edge of reach, a hit can register with a visible hand-to-pad gap. This contact/range tuning remains part of combat-feel review; the captures do not establish exact hand contact at every distance or eliminate all native coat/strap intersections. There is no foot IK, dynamic cloth or equipment physics; animation fidelity remains that of the licensed retargeted prototype.

An early inspection run failed fetching a stale Vite dynamic module; restarting the workspace dev server with dependency re-optimization resolved it. A settings-close test race was corrected by waiting for the application to resume before input. Both were rechecked successfully. Vite retains its advisory warning for the existing large Rapier chunk; the compressed bootstrap budget passes.

## Production delivery

| Delivery | Measured | Limit | Result |
| --- | ---: | ---: | --- |
| Compressed bootstrap | 2,551,478 bytes / 2.43 MiB | 5 MiB | Pass |
| Initial desktop art | 16,500,401 bytes / 15.74 MiB | 20 MiB | Pass |
| Initial mobile art | 10,358,209 bytes / 9.88 MiB | 10 MiB | Pass |
| Additional inspection | 6,759,388 bytes / 6.45 MiB | 40 MiB | Pass |

Art limits use raw delivery sizes; bootstrap uses gzip. Shared animations count toward each selected tier. Mobile has **127,551 bytes** of headroom; subsequent animation additions must continue checking that ceiling. Machine-readable evidence: [delivery](../visual-delivery.json), [animation validation](animations.json), [combat WebGPU](combat-webgpu-required.json), [combat WebGL2](combat-webgl2.json), [Ward](ward.json), [mobile](mobile-combat.json), [WebGPU inspection lifecycle](inspection-webgpu-required.json), [WebGL2 inspection lifecycle](inspection-webgl2.json).

## Sustained performance

Each production measurement warms up for 30 seconds, then measures ten minutes at full 1440 × 900, High quality, adaptive resolution disabled and uncapped Chrome rendering (`--disable-frame-rate-limit`, `--disable-gpu-vsync`). Active combat repeatedly drives actual production light/heavy/Ward input and public target resets, with physics, damage, knockback, skinning, particles and sound active. Inspection loops idle. No development commands or teleports are used. External requestAnimationFrame intervals include CPU submission and browser scheduling, not isolated GPU timestamps. The exact measured bundles are recorded in [build hashes](build.json).

On **Intel gen-12lp / Chrome 154.0.8037.98 / WebGPU**, active combat completed **601.5 seconds**, averaging **122.0 FPS**, with **p95 10.6 ms** against the **18.5 ms** limit. Maximum interval was **42.7 ms**, with zero intervals above 50 or 100 ms. The workload recorded **583 hits, 116 criticals and 584 attack starts**; sampled renderer allocation was constant at **56,605,068 estimated bytes** across all 20 samples. No page errors occurred. [Full combat measurement](combat-performance.json).

The independent inspection run completed **600.5 seconds**, averaging **439.3 FPS**, with **p95 2.7 ms** against the **35 ms** limit. Maximum interval was **26.8 ms**, with zero intervals above 50 or 100 ms. Renderer allocation remained constant at **73,016,856 estimated bytes** across all 20 samples, with 65 textures. No page errors occurred. [Full inspection measurement](cinematic-performance.json).

| Mode | Duration | p95 | Limit | Maximum interval | Intervals >50 ms | Result |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Active combat | 601.5 s | 10.6 ms | 18.5 ms | 42.7 ms | 0 | Pass |
| Detailed inspection | 600.5 s | 2.7 ms | 35 ms | 26.8 ms | 0 | Pass |

The earlier interrupted exploratory combat run is excluded. Both completed measurements used the final production build and verified a 1440 × 900 render buffer. Warnings recorded in the raw evidence: Windows ignores the adapter power-preference hint, and Three.js warns about simultaneous courtyard/inspection KTX2 loaders. The two loaders have separate reference-counted owners; disposal regressions and sampled allocation remain stable. These measurements establish this desktop configuration only, not driver-level VRAM usage, physical-phone performance or future enemy-AI cost.

## Review gates

Technical validation does not substitute for human combat-feel approval. Review the demonstration and play the prototype for attack timing, reliable controls and distinct heavy/stagger/critical feedback. Physical Android/iPhone performance, thermals and touch ergonomics remain unverified. Phase 4 enemy AI begins only after this combat prototype is reviewed and explicitly authorized.
