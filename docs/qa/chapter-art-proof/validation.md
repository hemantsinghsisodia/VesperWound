# Last Departure — Milestone A validation

Branch: `codex/chapter-art-proof`. Date: 2026-10-23. **User art review approved; commit, merge into main and push explicitly authorized. Milestone B has not started.** The comparison baseline is `311d88b`; the branch also retains main's Vite update at `2bd0145`.

## Delivered scope

The retained service street and west loading bay now demonstrate the proposed chapter art direction: complete two-storey workshop and warehouse facades, recessed doors, upper windows, rooflines and flues, a BONDED / 03 landmark, a lighter cutaway canopy, wet cobbled circulation, service fittings and restrained loading detail. Existing light owners provide cool street and warm loading-bay illumination without adding lights, shadow maps or passes.

Medic, baton, accepted animation/dodge/damage, enemies, collision, navigation, mission objectives and camera are unchanged. This is a representative art proof on the existing route; it does not add the full district, warehouse interior, checkpoints, save system, sentry or guardian.

- [Matched browser comparison](comparison.html)
- [Art direction and source workflow](art-direction.md)
- [WebGPU walkthrough](after/district-webgpu.webm), [WebGL2 walkthrough](after/district-webgl2.webm), [enlarged left-handed mobile walkthrough](after/district-mobile.webm)
- [Retained complete mission recording](mission/mission-webgpu.webm)
- Editable source: `art/source/chapter-art-proof.blend`. Original accepted baseline retained in `art/source/ash-quay-district.blend`.
- Optimized section exports: `public/assets/district/{desktop,mobile}/arrival-quay.glb`.
- Provenance: `art/environment-provenance.json`; source originals, checksums and discovery decisions under `art/imports/chapter/`. Accessible credits updated.

## Art review observations

Inspected actual WebGPU, WebGL2 and mobile landscape captures. Full masonry bays replace partial wall/window strips; the service route and loading apron have distinct surfaces. Recessed-door backing was corrected after the first browser inspection. The north loading-wall shell matches the retained collision barrier. Canopy visibility is still controlled by the existing scene owner; the loading area remains readable from the accepted camera.

The supplied cobblestone AO is used; this is not a new whole-district light bake. Reflections remain the accepted low-cost environment treatment. No claim is made that the full chapter's art or ambience is finished. Mobile retains its existing lower-resolution rendering and texture limits; fine material detail is reduced while UI labels remain screen-space text.

The user approved the visual proof after review. Technical results and their limitations remain separate from that approval.

## Automated and browser validation

- `npm run check`: 25 unit files / 151 tests, strict TypeScript, lint and production build passed. The final asset-contract additions also passed their targeted test.
- WebGPU district traversal, failed/cancelled loading and retry passed.
- WebGL2 and mobile traversal passed, including Low/High replacement, inspection, repeated warm entry/exit, selected-tier requests and scene disposal.
- Enlarged left-handed mobile retry passed. Its stale expectation of a visible district heading was updated to match the accepted compact mission UI; the visible failure message and 44px retry target remain asserted.
- Both legacy/unavailable spatial-audio regressions passed.
- All four WebGPU mission cases passed: complete mission/departure/replay, failed/cancelled loading, inspection, pause, Reduced Motion, quality replacement and input-clearing behavior.
- All four production cases passed, including no development diagnostics, optional enemy and armed payloads, real encounter victory, inspection and group combat.
- `npm run size` passed every existing delivery ceiling.

The first combined district run was invalidated by development-page reloads while an isolated baseline snapshot was being prepared, plus the stale mobile heading assertion. Vite now excludes `.cache`, authoring sources and QA outputs from watching. The affected WebGL2/mobile cases passed on a stable retry. Existing KTX2-loader warnings during replacement remain recorded; no page errors were recorded in the completed traversal reports.

## Ownership and delivery

Normal exports read saved masters and assert their hashes are unchanged. The court exports from its retained master; the optional quay exports from the new master. `--quay-only` leaves initial court/reflection assets untouched. Byte-identical packed images were deduplicated in the editable source; the master is about 78 MiB.

| Delivery | Bytes | Ceiling |
| --- | ---: | ---: |
| Bootstrap, gzip | 2,597,891 | 5 MiB |
| Initial desktop art | 18,999,728 | 20 MiB |
| Initial mobile art | 10,470,363 | 10 MiB |
| Optional proof section, desktop | 9,490,352 | 12 MiB |
| Optional proof section, mobile | 2,860,968 | 6 MiB |
| Armed animations | 419,712 | 512 KiB |
| Inspection | 6,768,730 | 40 MiB |

Initial mobile art still has only 15,397 bytes of headroom. The proof is optional streamed delivery; later milestones must replace or rebudget startup content rather than append it. The future full-chapter 64/32 MiB ceiling cannot be evaluated until those assets exist.

Across repeated warm traversal cycles, references/resources/listeners remained 7/55/70. WebGPU allocation estimates were 59,735,545 then 59,735,865 bytes; WebGL2 remained 58,504,369 bytes. Mobile changed from 29,213,296 to 29,239,579 bytes with one lazily allocated texture, within the existing bounded-resource assertion. A full scene reload restored baseline ownership. These renderer estimates are not whole-process GPU memory measurements.

## Performance

Timed production results are recorded under `performance/`. Measurements use five minutes per scenario after warm-up, uncapped Chrome, 1440 × 900, High quality and adaptive resolution disabled. Frame intervals include CPU submission, driver and scheduling time; they are not isolated GPU timestamps. Loading and cinematic transitions are reported separately by the mission harness.

Device: Windows 11 Home Single Language 10.0.26300, Intel Core i7-13620H. Power connected (`BatteryStatus: 2`, 98% before this measurement series). Browser/backend/adapter and measured variability are recorded per result.

Completed proof runs (Chrome 156.0.8078.48, WebGPU, Intel `gen-12lp` adapter):

| Scenario | Duration | Average FPS | p95 | Maximum frame | >50 / >100 ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| Proof traversal | 300.28 s | 99.54 | 11.5 ms | 78.8 ms | 2 / 0 |
| Equipped inspection | 300.23 s | 389.19 | 3.0 ms | 83.5 ms | 7 / 0 |
| Retained mission, all phases | 300.25 s | 104.68* | 11.4 ms | 90.3 ms | 8 / 0 |

*Mission average is frame count divided by measured wall duration; the other harness computes average directly from frame intervals. Combat-only p95 was **11.9 ms** across 11,661 combat frames. Five missions completed during the timed sample; the driver finished its sixth route afterward. No driver/page errors. Traversal, mission combat and inspection pass their respective 18.5/35 ms targets.

Cold mission preparation took 3.15 s, with 26.8 ms p95 and a 150.1 ms maximum frame (three above 50 ms). Guard approach/activation measured 27.9 ms p95; the first passage fight measured 17.0 ms p95, while the winch fight measured 11.5 ms. Departure measured 8.1 ms p95, maximum 72.1 ms. Loading/activation spikes and isolated long frames remain limitations despite the sustained pass; they are not hidden inside the aggregate.

The completed main traversal comparison recorded **300.32 s, 88.78 FPS, p95 22.7 ms, maximum 76.8 ms, 21 frames above 50 ms and none above 100 ms**, over 26 traversals. It failed the 18.5 ms assertion, with no page errors. The first two reporting windows had p95 45.4/44.5 ms; later windows recovered to 11.1–12.5 ms. The proof traversal windows were 11.2–12.1 ms. Mains power was confirmed again before this baseline (`BatteryStatus: 2`, 98%). The cause of the transient baseline slowdown was not established; a separate project's development server was running, but that alone does not establish competing GPU work. **Do not interpret the aggregate difference as a proof performance improvement or a reliable regression percentage.** The proof's absolute targets passed; a clean paired relative-performance conclusion remains unverified. Raw results, including the failed baseline, are retained. See [baseline reproduction](baseline-method.md).

At the matched loaded section, proof draw calls increased from 202 to 276 and submitted triangles from 247,903 to 291,819 (including render passes). Renderer allocation estimates increased from 62,390,735 to 63,150,746 bytes, and textures from 71 to 74. This is a measurable art cost even though the proof's sustained targets passed.

Validation servers were stopped. Port 4174 is closed. Port 5173 belongs to the user's separate `ThreeJsGame` project (PID 22188), so it was deliberately left untouched; no WebGPUGame validation server remains running.

## Review checklist

1. Walk from Pressure Court through the service street to the loading bay. Does the space now read as a coherent industrial dock?
2. Identify the warehouse landmark without opening a menu. Is it visible early enough on the approach?
3. Move beneath and around the canopy; fight the retained mission encounters. Note any obscured character, threat, contact cue or label.
4. Compare the surfaces and lighting at gameplay distance, then inspect doors and loading detail nearby. Identify anything that still feels too plain, noisy or artificial.
5. Check desktop and preferred touch layout. Report distracting hitches or control overlap.

Milestone A is approved for merge. Physical-phone performance and first-time chapter pacing are unverified. The three independent 20–30-minute first-play tests belong to the complete chapter milestone, not this proof. Stop after this milestone; do not begin district implementation as part of the merge.
