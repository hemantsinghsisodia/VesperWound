# VESPERWOUND project instructions

## Approved scope
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
