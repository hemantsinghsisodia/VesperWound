# Enemy attack readability and defenses

Review branch: `codex/enemy-combat-readability`, based on `32ab5b4`.

Zombie Number 7 now uses a saved 60 Hz attack revision with held anticipation,
planted hips/feet and a hand-contact path exported from that same action. The
simulation owns one attack clock; the renderer samples the corresponding clip
time, including at most one fixed tick of interpolation. Damage uses a swept
hand capsule against Medic's hurt volume, with obstruction and once-per-strike
resolution. Runtime animation never decides damage.

The amber directional arc marks the attacking zombie independently of the mint
target ring. It settles when facing locks for the final 250 ms of windup and
ends after active contact. Reduced Motion uses a static arc.

`Blocked` appears only after Ward absorbs a contact; `Evaded` appears only when
a valid enemy contact meets dodge invulnerability. Moving clear of the hand
produces an ordinary miss. One screen-space label is owned by Medic's scene,
and the existing barrier provides a small mint block effect. The audio owner
deduplicates warning/defense cues and stops obsolete voices on pause/restart.

Balance remains 120 enemy health, 20 attack damage, 650 ms windup, 120 ms active
and 900 ms recovery; group attacks retain one slot through recovery. Ward costs
25 pressure and lasts 800 ms. Dodge invulnerability remains 40–160 ms. The
approved baton timings, damage, input queue, grip and locomotion are retained.
At 60 Hz nonintegral boundaries are resolved on the next tick; elapsed time is
not discarded at phase transitions.

## Saved art and reproduction

- Editable source: `art/source/zombie7-master.blend`.
- Explicit one-time authoring: `tools/blender/repair_enemy_attack.py`.
- Normal read-only export: `node tools/build-enemy.mjs` (verifies master hash).
- Mapping: `src/enemies/enemy-attack-motion.json`.
- Immutable CPU samples: `src/enemies/enemy-hand-contact.json`.
- Provenance: `art/enemy-provenance.json` and `public/assets/licenses/enemy-provenance.json`; shipped credits identify the author, license and attack modification.
- Browser acceptance: `npx playwright test --config playwright.enemy.config.ts`.
- Technical checks: `npm run check`, then `npm run size`.

The existing development enemy studio can load an unarmed subject without
requesting Medic's baton. This diagnostic page is not a production route.

## Human review checklist

1. Enter the Works, pick up the baton, and start a single encounter from Pause.
2. Before the first strike, identify the attacking arm and the amber direction.
3. Try Ward during preparation; confirm that the barrier disappears on impact
   and that `Blocked` matches the sound and unchanged health.
4. Dodge across or away from the strike. A geometric miss need not say `Evaded`;
   the label means the hand intersected during invulnerability.
5. Try attacks just outside the hand's reach and on either side. Record any
   damage that looked impossible, including facing and distance.
6. Start a group encounter. Identify the attacker while selecting a different
   zombie; watch whether other enemies crowd or hide the committed strike.
7. Repeat with sound muted and Reduced Motion, and with touch controls if available.
8. Note unexpected hits, failed defenses, deaths and whether the timing felt
   understandable. Human readability is a review gate, not an automated claim.

The user approved gameplay review, commit, merge into main and push on
22 October 2026. Physical-phone performance remains unverified.
See `docs/qa/enemy-combat-readability/validation.md` for measured
results, captures and remaining limitations.
