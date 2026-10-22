# Immediate baton dodge and damage boost

Date: 2026-10-22. Review branch: `codex/baton-dodge-cancel`, based on main `3dceadf`. User gameplay review approved on 2026-10-22 with explicit authorization to commit, merge into main and push.

## Delivered behavior

- Baton attacks accept dodge during windup, contact and recovery. Cancellation runs before player contact resolution, clears buffered/pending strikes and resets the combo. Previously resolved hits remain resolved.
- The combat-style contract explicitly selects `any-phase` cancellation for baton and `recovery` for unarmed. No Three.js dependency was introduced into simulation.
- Attack-to-dodge presentation releases controlled attack sampling and its blend accumulator, restarts the accepted `Baton_Dodge` clip and blends over 50 ms. Locomotion/inspection transitions and authored assets remain unchanged.
- Health damage is 32 / 41 / 54 / 72; posture remains 15 / 20 / 30 / 50. An exposed surviving target receives 144 health damage from a heavy. Two ordinary heavies defeat a standard 120-health zombie before stagger. Enemy damage, attack timings, contact paths, knockback, pressure awards and 40–160 ms dodge invulnerability are unchanged.
- The equipped HUD hint now accurately describes attack cancellation. Cancellation itself does not emit `Evaded`; an otherwise valid enemy contact during invulnerability is still required.

## Functional and visual evidence

The new unit suite covers all four strikes in all three phases, cancellation before contact/effects, input priority, held input, pending choice clearing, combo reset, retained previous hits, restrictions, defensive windows and exact damage. Existing critical tests use a surviving exposed fixture to verify 144 damage; standard zombie tests correctly expect no critical under the new balance.

Real Chrome 156.0.8078.48 renders were captured on WebGPU and WebGL2. Mobile uses Pixel 7 landscape emulation (915 × 412), left-handed controls at 1.4 scale, simultaneous movement and pointer cancellation. This is not a physical-phone performance result.

The six scripted cancellation cases cover every light strike and heavy windup/active/recovery. In the original build, five presses left the attack playing; only the heavy recovery press dodged. In the changed build, all six entered `dodge`, selected `Baton_Dodge` and released the sampled contact clock. Unit tests establish consumption on the next simulation update. The desktop WebGPU automation observed the changed state after 30–58 ms, including Playwright input/IPC/polling overhead; this is not an end-to-end hardware input-latency measurement.

Evidence:

- [Side-by-side cancellation recording](cancellation-before-left-after-right.mp4): original on left, changed build on right; approximately 19 seconds, silent. These are corresponding scripted sequences, not frame-aligned motion captures.
- [Original cancellation trace](before/enemy-webgpu/cancellation.json) and [changed trace](after/enemy-webgpu/cancellation.json).
- Clearer open-court recaptures: [WebGPU heavy windup cancellation](visual/enemy-webgpu/Heavy-50.png), [WebGL2 heavy active cancellation](visual/enemy-webgl2/Heavy-400.png), [mobile light cancellation](visual/enemy-mobile/Light2-190.png). Complete clips are in each `visual` backend directory.
- Initial repeated-dodge captures drifted behind courtyard cover, so the visual rerun returns Medic to an open location between actions. The original traces remain for comparison. The visible roll retains the baton attachment; final comfort, swing-to-roll readability and close-range clipping remain human review items.
- Existing weapon captures include walking/running, all strikes, Ward, hit, dodge, death and grip inspection under both desktop backends. No mesh, skeleton, animation pack or grip transform was changed.

The matched 20-second real-input encounter routine produced:

| Build | Victories | Hits | Criticals | Blocks | Damage received |
| --- | ---: | ---: | ---: | ---: | ---: |
| Main baseline | 3 | 9 | 3 | 6 | 0 |
| Changed | 5 | 10 | 0 | 10 | 0 |

The higher kill rate is primarily the intentional damage increase, not evidence of improved human defense. The scripted routine times Ward successfully in both builds. See the `before` and `after` combat videos and `comparison.json` files for full observations.

## Checks

| Validation | Result |
| --- | --- |
| `npm run check` | Passed: typecheck, lint, 151 tests in 25 files and production build |
| New cancellation browser suite | 3 passed: desktop WebGPU, desktop WebGL2, mobile landscape |
| Open-court visual rerun | 3 passed, all six cancellation cases per backend |
| Matched real-input comparison | Before and after passed; results above |
| Group and weapon regressions | Initial run: 8 passed, 1 failed, 9 project-specific skips; corrected group completion condition rerun: 2 passed |
| Audio, pause and input regression selection | 8 passed, 2 project-specific skips |
| Production tests | 4 passed, including selected-tier loading, retained equipment, inspection and real-input victory |
| Production size | Every ceiling passed |

The first WebGL2 group regression reached victory without observing a multi-target hit. Its completion condition now requires victory, multi-target contact and a block, allowing another encounter within the existing timeout rather than dropping coverage. A sandbox-only full-check attempt failed to read Vitest temporary transforms; the normal host validation passed. The existing large-bundle build warning and overlapping KTX2-loader warning during transactional visual replacement remain; no page errors were observed in the passing suites. Repeated loading, cancellation, inspection and quality-replacement resource assertions pass.

## Payload

All production delivery ceilings pass. Bootstrap gzip is 2,597,006 bytes. Initial desktop art is 18,999,728 bytes; mobile is 10,470,363 bytes (15,397 bytes below its ceiling). Inspection is 6,768,730 bytes. Enemy desktop/mobile payloads are 3,571,348 / 3,528,872 bytes. The unchanged armed pack is 419,712 bytes, below 512 KiB. No new art, dependencies, rendering passes or resolution changes were introduced. See [delivery report](../visual-delivery.json).

## Sustained performance

Method: production build, Chrome 156.0.8078.48, Windows, Intel `gen-12lp` WebGPU adapter, High quality, full 1440 × 900 rendering, adaptive resolution disabled. Chrome frame-rate limiting and GPU vsync are disabled. External requestAnimationFrame intervals include CPU submission/scheduling and are not isolated GPU timestamp measurements. Each scenario has 30 seconds of warmup followed by at least 300 seconds of sampling. No other test browser or encoding task runs concurrently.

The initial group run was on battery. Windows reported BatteryStatus 1 at 71% charge. It failed the 18.5 ms gate: 300.48 seconds, 58.31 average FPS, p95 34.3 ms, maximum 103.9 ms, 15 intervals over 50 ms and 3 over 100 ms. Estimates stabilized after one 160-byte allocation increase (61,629,286 → 61,629,446 bytes; 76 textures). Its [complete data is preserved](performance/battery/group-performance.json).

The user then connected mains power and explicitly requested a rerun. Windows confirmed BatteryStatus 2, at 70% charge, before inspection sampling; confirmation was recorded around 22:25 local time. Mains-power results are recorded separately below. The earlier main baseline did not record power status, so it is a reference measurement rather than a controlled power-matched A/B experiment. Battery performance must not be represented as passing because a plugged-in run passes.

Inspection on mains power passed: 300.24 seconds, p95 3.0 ms against 35 ms, 387.98 average FPS, maximum 20.4 ms and no intervals over 50 ms. Thirty-second sample p95 varied from 2.9 to 3.3 ms. Renderer estimates stayed at 79,427,337 bytes and 92 textures throughout. The earlier same-browser main reference was p95 3.5 ms and 355.48 average FPS. See [inspection data](performance/cinematic-performance.json). These are estimated renderer allocations rather than measured total GPU-process memory.

The requested mains-powered combat rerun passed: 300.27 seconds, p95 11.1 ms against 18.5 ms, 98.69 average FPS, maximum 83.3 ms, five intervals over 50 ms and none over 100 ms. Thirty-second sample p95 varied from 11.0 to 11.3 ms. The routine completed 28 victories, 84 enemy defeats, 231 hits, 102 blocks and 24 multi-target strikes; zero criticals is expected with the new standard-zombie damage balance. Renderer estimates rose once by 160 bytes, from 61,629,286 to 61,629,446, and then stayed constant at 76 textures. There were no page errors. Mains power was confirmed again after the run (BatteryStatus 2, 79% charge). See [combat data](performance/group-performance.json) and [power context](performance/context.json).

| Scenario | Earlier main p95 / average FPS | Changed mains p95 / average FPS | Ceiling |
| --- | --- | --- | --- |
| Active group combat | 11.7 ms / 97.05 | 11.1 ms / 98.69 | 18.5 ms |
| Armed inspection | 3.5 ms / 355.48 | 3.0 ms / 387.98 | 35 ms |

The earlier main combat reference had no intervals over 50 ms and a 48.7 ms maximum, so the new run's rare long frames are explicitly retained despite its passing p95. Different kill rates also change the live combat workload. These single-run comparisons demonstrate the stated budget on this plugged-in machine, not a statistically established rendering improvement or a guarantee on battery/other hardware. No graphics or resolution reductions were used to obtain the result.

## Human review

1. Pick up the baton and dodge immediately after pressing light or heavy; repeat near visible contact and during recovery.
2. Queue another swing, then dodge. Confirm the abandoned swing does not resume and the next fresh light starts the chain again.
3. Try moving and facing-only dodges on desktop and touch. Check the grip and roll transition feel natural.
4. Fight a standard zombie: two connected ordinary heavies should defeat it. Check whether faster kills still feel satisfying.
5. Remember the first 40 ms of dodge are vulnerable. Report unexpected damage with the action and contact timing if possible.

The user accepted gameplay feel on 2026-10-22 and authorized merging and pushing this milestone. Physical-phone performance remains unverified. Validation servers have stopped; no listeners remained on 5173, 5182 or 4173 at validation handoff. Run `npm run dev` from the repository to play, then stop it with Ctrl+C.
