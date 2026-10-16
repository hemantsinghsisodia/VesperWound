# VESPERWOUND project instructions

## Approved scope
- Player damage balance review is approved on 2026-10-16, with explicit authorization to commit, merge into main and push. Retain the 50% outgoing damage increase and existing posture, timings, contact and enemy damage. No new performance or physical-phone measurement is claimed for this numeric balance change.
- Player damage increase is authorized on 2026-10-16: increase Medic's outgoing unarmed and baton health damage by 50% on `codex/player-damage-balance`. Preserve posture, attack timing, contact, enemy damage and existing mechanics. Validate combat regressions and stop for review without merging. Stop validation servers.
- First mission polish review is approved on 2026-10-16, with explicit authorization to commit, merge into main and push. Retain the documented loading hitches and crane-corner guard navigation observation; physical-phone performance and first-time human pacing remain unverified. Further milestones require new scope approval.
- First mission polish is authorized on 2026-10-14: skippable opening and ferry departure, compact guidance, staged winch guards, machinery cues and transactional quay readiness on `codex/first-mission-polish`. Preserve map, combat and accepted armed animations. Validate complete desktop/touch missions and five-minute production performance, then stop for review without merging. Stop validation servers.
- Armed animation repair is approved on 2026-10-14, with explicit authorization to commit, merge into main and push. Retain the corrected full-cycle locomotion, stable baton arm/grip, saved-source export workflow and animation regressions. Physical-phone performance remains unverified; no new five-minute benchmark is claimed for this repair.
- First mission and paving-depth review fix are approved on 2026-10-14, with explicit authorization to commit, merge into main and push. First-time pacing and physical-phone performance remain documented review limitations. Further milestones require new scope approval.
- First mission is authorized on 2026-10-14: “Restart the Ferry Winch”, a short complete mission using the existing two-area map, Medic, baton and zombies. Add preparation, clues, authored encounters, regulator retrieval/installation, responsive machinery/ramp, ferry completion, compact objectives and restart. Work on `codex/first-mission`, preserve practice modes, validate desktop/touch and stop for review without merging. No new enemy types, inventory system or district expansion. Stop validation servers started for this work.
- Checkpoint C is authorized on 2026-10-13: reduce section-loading hitches, polish waterfront paving/cargo/focal points and foreground visibility, preserving the two-area footprint and all combat. Work on `codex/ash-quay-checkpoint-c`, validate real desktop/touch traversal and five-minute production performance, then stop for review without merging. No map expansion, missions or new combat. Stop validation servers.
- Checkpoint B review is approved on 2026-10-13, with explicit authorization to commit and merge into main. Loading hitches and unverified physical-phone performance remain documented. Further district expansion requires a new scope approval.
- Checkpoint B is authorized on 2026-10-12: connect the retained Pressure Court to an authored arrival quay through a service lane, with distinct ground treatments/landmarks, matching collision/navigation, foreground camera visibility and nearby-section loading. Implement two connected areas on `codex/ash-quay-checkpoint-b`; stop for visual review before expanding the full 64 m district. Preserve Medic, baton, existing enemy encounters and combat tuning. Validate desktop/touch, failure/cancellation/disposal and five-minute performance. No missions, progression or new combat content. Stop validation servers and do not merge without explicit instruction.
- Ash Quay district rebuild is authorized on 2026-10-11. Implement Checkpoint A on `codex/ash-quay-rebuild`: an authored environment proof, closer gameplay camera, compact HUD/pause-menu scene tools, verified CC0 architecture, editable source and browser validation. Preserve current combat and collision for this proof. Stop for visual review before expanding the 64 m district or adding streaming/traversal. Missions, progression and new combat content remain excluded. Stop validation servers, including port 5173.
- Phase 4B is authorized on 2026-10-10: a three-zombie group encounter, spacing and fair coordinated attacks, living-target cycling, multi-target baton contact, group victory/restart and desktop/touch/five-minute validation. Preserve training, single-enemy encounters, accepted assets and combat tuning. Stop on its review branch; additional archetypes, hordes and later phases remain deferred.
- The first weapon milestone is authorized: an original steel baton pickup, armed animations, fixed-step weapon contact, retained session equipment and validation. Group encounters remain deferred. Stop validation servers when finished, including port 5173.
- Phase 4A is authorized on 2026-10-09: one Zombie Number 7 melee encounter, verified licensed imported art, precise manual punch spacing, session-owned enemy simulation/navigation, optional encounter loading and five-minute production measurements per scenario. Stop for review after this enemy; additional archetypes and hordes remain excluded.
- Phase 3 unarmed combat prototype is authorized on 2026-10-06: three-hit light chain, heavy strike, posture/stagger/critical follow-up, pressure-powered Ward, reactive training targets, telegraphed vent, bounded effects/audio/camera feedback and validation. Preserve accepted Medic art. Enemy AI and Phase 4 remain excluded until requested.
- Phase 2 player prototype is authorized on 2026-10-06: movement, follow camera, static collision, licensed retargeted animations, basic punch/dodge, health, damage, death/restart and touch controls. Preserve Medic's accepted appearance and rig. Quaternius CC0 clips are separate additions; do not present them as supplied Fab animations. Enemy AI, weapon redesign and subsequent phases are excluded until requested.
- The user accepted Tony Flanagan's Fab SciFi Medic under CC BY 4.0 as the retained character on 2026-10-06 and requested removal of the previous generated character. Medic is the only character asset; do not restore the removed generators, sources or comparisons. Preserve its appearance and supplied rig. The downloaded Blender and GLB have no animations; use Static pose and defer new clips and mechanics to Phase 2.
- Phase 0 architecture was approved on 2026-10-05. See docs/architecture.md.
- Implement only the phase explicitly requested by the user. Stop and report after that phase; do not automatically start the next one.
- Phase 1 is the technical foundation and test courtyard. It is not a player/combat prototype.
- The retained visual milestone presents Medic at Ash Quay with optional desktop studio inspection. Environment reconstruction, player collision, controlled movement, combat, health and death remain outside this milestone. Physical-phone performance remains unverified.
- Inspect the repository, previous decisions, and dependencies before each phase. Give a short implementation plan; test, profile, check mobile compatibility, and report limitations honestly.
- Preserve working systems. Explain architecture changes before making them.

## Required model policy
| Work | Model ID | Reasoning |
| --- | --- | --- |
| Game concept, Phase 0, technical architecture | gpt-6-astra | xhigh |
| Phase implementation | gpt-6.1-sol | high |
| Routine coding/refactors | gpt-5.6-sol | high |
| Difficult rendering/AI bugs | gpt-6-astra | high |
| Architecture review | gpt-6-astra | high |
| Small repetitive work | gpt-5.6-terra | xhigh |

Apply the most specific category. Do not silently substitute an unavailable model or claim a runtime model change that has not occurred. The primary chat model is controlled by the client. These instructions record routing preferences; they do not configure the client by themselves. This policy does not independently authorize new chats or subagents.

## Branch and review workflow
- Start each new phase or milestone on its own `codex/` branch from current `main`. Do not implement phase work directly on `main`.
- Keep the phase branch active when handing the build to the user for testing; review fixes stay on that branch.
- Merge into `main` and push `main` only after the user explicitly requests it for that phase. Approval to implement, proceed or test is not merge authorization, and authorization for a previous phase does not carry forward.
- Keep unrelated phases separate and stop at the review handoff; do not automatically begin another phase.

## Engineering rules
- Strict TypeScript; no application-owned any, global event bus, or monolithic main.ts.
- CPU simulation contracts do not import Three.js. Presentation observes state and typed events.
- Use WebGPURenderer with its WebGL2 backend; compatible TSL materials and node post-processing.
- Graphics quality never changes encounter density or gameplay rules.
- Every resource, listener, animation loop, and subscription has an explicit owner and disposal path.
- Use only original or verified free commercially usable assets. Record provenance and redistribution terms.
- Pin dependencies; add each only when justified. No framework, ECS, physics, or service SDK without need.
- Automated browser tests and emulation do not establish physical phone performance. Report unverified gates.
- Development commands must be excluded from production builds.

## Validation
- Run npm run check and relevant npm run test:browser cases.
- Run npm run size after a production build.
- Inspect the real rendered scene. Include actual backend, device/browser, and measurement method in performance reports.
