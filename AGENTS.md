# VESPERWOUND project instructions

## Approved scope
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
