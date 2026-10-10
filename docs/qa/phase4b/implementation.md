# Phase 4B — implementation

This milestone exposes the existing bounded three-instance enemy capacity as an optional group encounter. Training and Start encounter (one zombie) remain available. Start group encounter uses three, regardless of graphics preset; Restart retains the count and equipment, and Return to training releases the enemy views/asset manager.

The group uses a triangular spawn layout. One deterministic attack slot covers windup, active strike and recovery; eligibility requires a living, reachable, unobstructed enemy within reach. Lowest previous attack order wins, with distance/ID as stable tie breakers. Release on death, stagger, return and completed recovery prevents stale ownership. The original single-enemy slot behavior is preserved. Sequential collision synchronization prevents a later enemy moving into an earlier enemy's new position. Separation includes deterministic handling of exact overlap; zero movement retains facing. Waiting actors use the supplied idle rather than walking in place.

CombatTargeting is CPU-only. It records a generation-aware living handle, filters blocked/raised/out-of-range targets, adds 0.3 m hysteresis to nearby automatic focus and offers T/Next target cycling. Touch buttons switch to automatic/explicit focus; pointer aiming retains its ground-plane direction, allowing deliberate sweeps between enemies. Selection does not home a committed swing or determine damage. Death and restart clear focus. Quality and inspection preserve the combat session.

Existing baton contact paths, damage, buffering and per-target attack keys are unchanged. A sweep may damage multiple living hurt volumes once each; one pressure award belongs to the attack. Critical consumption and stagger apply individually. Group completion requires every zombie to be defeated.

Three animated views share one selected-tier model handle and its materials/geometry. Each clone owns its skeleton and label resources; the view owns shared amber cue geometry/material and a green focus material. Generation changes clear presentation reactions before reuse. Only the focus (or current attacker when unfocused) shows a health/posture label to avoid crowd overlap; amber windup cues remain independent. Disposal removes the added material and all existing view resources. No assets, dependencies, character redesign or horde systems were added.

The production canvas exposes read-only bounded roster/count/focus data for external measurements. No mutation commands are enabled in production. The group exercise uses real movement/pointer/defense input, alternating multi-target lights with heavy and critical follow-ups. Five-minute scenarios are serial, full 1440 × 900, adaptive resolution off and uncapped Chrome.

All work stays on codex/phase4b-group-encounter for user testing. Main may be merged/pushed only on a new explicit user request.
