# Player damage balance

Review branch: `codex/player-damage-balance`, based on main `62145f6`.
The user requested increased damage to enemies. All Medic attacks now deal
50% more health damage in both training and encounters.

| Style | Light 1 | Light 2 | Light 3 | Heavy | Heavy critical |
| --- | ---: | ---: | ---: | ---: | ---: |
| Unarmed, previous | 10 | 14 | 20 | 30 | 60 |
| Unarmed, revised | 15 | 21 | 30 | 45 | 90 |
| Baton, previous | 14 | 18 | 24 | 32 | 64 |
| Baton, revised | 21 | 27 | 36 | 48 | 96 |

Full light chains deal 66 unarmed damage and 84 baton damage. Posture damage,
enemy health/damage, timing, pressure, hit volumes, animations and defenses retain
their existing values. A 120-health zombie survives two ordinary baton heavies
with 24 health and can still be staggered and critically finished.

`npm run check` passed: strict TypeScript, lint, all 102 unit tests and production
build. `npm run size` passed every existing delivery ceiling. Real Chrome desktop
WebGPU and WebGL2 combat demonstrations passed, including High versus Low damage
equivalence, stagger, critical consumption and target reset. Captures, recordings
and JSON observations are in this folder. Render inspection confirmed the revised
unarmed chain removes 66 health from the 160-health target.

Tests now use the tougher training target for the full combo/stagger/critical
demonstration, because the 100-health target dies before that entire sequence.
The nonlethal repeated-critical unit fixture uses additional test-only health;
runtime target health is unchanged. Multi-target assertions verify 96 critical
damage and 48 ordinary damage in the same heavy swing.

The initial production group run won, but its incidental critical count was zero:
stronger mixed light attacks defeated guards before stagger. The real-input driver
now opens with one cleaving light, then performs the heavy/stagger/critical
sequence before mixing further lights; this changes test input only. An intermediate
heavy-only opener exercised criticals but missed the multi-target assertion. The
final driver preserves both assertions and the production group regression passes.
The production single-enemy encounter also passed with the revised damage.

No new five-minute benchmark or physical-phone measurement is claimed for this
numeric balance change. Mission pacing will change because fights are shorter.
The user approved commit, merge into main and push on 2026-10-16.

Validation servers are stopped, including ports 5173 and 4173. Run `npm run dev`
to test the stronger attacks. Implementation and validation were completed on
`codex/player-damage-balance` before merge approval.
