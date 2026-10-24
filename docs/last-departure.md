# Ash Quay — Last Departure

Approved chapter direction, 2026-10-22. This document preserves the staged scope; it does not authorize skipping review gates.

Target: an unhurried first completion of 20–30 active minutes, excluding loading, pauses and repeated deaths. Balanced exploration/action, ferry departure ending, an original machinery guardian, three local checkpoints and one discoverable pressure-capacity upgrade. Retain Medic, baton, immediate baton dodge cancellation and accepted player/zombie tuning.

## Delivery gates

| Stage | Branch | Scope | Gate |
| --- | --- | --- | --- |
| A | `codex/chapter-art-proof` | Curated verified art, saved street/warehouse entrance proof, matched browser captures and measurements | Art review approved and merged; retained as visual target |
| B | `codex/chapter-district` | Connected blockout, sector readiness/streaming, objective route, shortcuts, discovery map, checkpoints and save recovery | Navigation review |
| C | `codex/chapter-enemies` | Original pressure sentry and Counterweight, practice tests, authored contact and mixed coordination | Combat review |
| D | `codex/ash-quay-chapter` | Approved art across the district, final encounters, machinery, optional reward/records, ambience and ferry ending | Complete chapter playtesting |

Each milestone starts from approved `main` on its own branch. Explicit user approval is required to merge. The short ferry mission remains a regression fixture; the completed chapter eventually replaces player-facing Start mission. Practice remains available.

## Journey

Approximately 80 × 64 m envelope, ground-floor traversal, upper architecture for depth:

1. Pressure Court — ferry/pressure-tower introduction, baton, one threat; around 3 minutes.
2. Dockside Street — workshop/cargo exploration, a worker pair, clues and locked warehouse shortcut; 4–5 minutes.
3. Bonded Warehouse — sentry warning, freight aisles, three-position cargo hoist, regulator, shortcut and safe office; 5–6 minutes.
4. Pump Works — marked pipes, two branch valves and pressure gauge, mixed encounter, guardian/winch connection; 5–6 minutes.
5. Ferry Apron — return shortcut, installation, solo Counterweight finale, departure; 4–5 minutes.

These are hypotheses for playtests, not timers. Cargo movement follows authored paths with matching collision. The pump solution isolates the leaking branch and opens the marked ferry supply; incorrect configurations are immediately correctable. Shortcuts link the warehouse to the street and pump maintenance gate to the apron. Four optional short records develop missing workers and unexplained departures.

The optional warehouse accumulator increases maximum pressure from 100 to 125. Ward stays at 25 pressure; regeneration and attack restoration do not change. Seven mandatory encounters plus one optional side-room encounter; ordinary fights contain at most three enemies.

## New enemies (Milestone C)

- Stationary sentry: 90 health, 20 projectile damage, 900 ms preparation, final 300 ms direction lock, one non-homing bolt at 6 m/s, 1.2 s recovery. Cover blocks bolts; existing Ward/dodge apply. It retains the shared attack slot through projectile resolution and recovery.
- Counterweight: original articulated dock machinery, solo finale, 600 health, 100 posture, 25 damage. Directional arm sweep and marked floor slam; alternating variants below half health. At least 900 ms warning and 2.5 s recovery with reachable core. Existing baton/stagger/critical rules apply; health persists across openings. No summoned enemies, artificial damage caps or forced waiting cycles.

New-enemy tuning is provisional and changes through recorded playtests. Accepted Medic and zombie tuning stays intact.

## Persistence and ownership (Milestone B)

Typed stable chapter/sector/encounter/checkpoint IDs; session-owned CPU chapter state and reconstructible presentation snapshots. Load the current sector and at most one adjacent full-detail sector; lightweight landmarks beyond. Explicit readiness leases, safe blocked transitions, retry and disposal of cancelled/superseded work. Quality changes and inspection preserve chapter state. Pause/background/portrait freeze simulation and feedback and clear input.

Safe checkpoints: Court, warehouse office, pump exit. Outside-combat interaction restores health/pressure and activates the checkpoint. One versioned IndexedDB save with a previous valid backup. Persist equipment, upgrade, completed encounters, objectives, machinery, shortcuts, discoveries and checkpoint. Continue/death restore full resources at the last checkpoint; cleared fights remain cleared, unfinished fights restart, transient attacks/projectiles are never serialized. Autosave committed progress; report storage failure and retain the session. Corruption falls back to backup without silent deletion. New chapter explicitly resets progression.

## Budgets and final acceptance

Bootstrap ≤5 MiB gzip; initial art ≤20/10 MiB desktop/mobile; armed clips ≤512 KiB; optional inspection ≤40 MiB. Additional chapter assets ≤64/32 MiB, each environment section ≤12/6 MiB. Selected tier only. Five-minute uncapped 1440 × 900 production measurements, adaptive resolution disabled: traversal/mixed combat/guardian p95 ≤18.5 ms; inspection ≤35 ms. Record device/backend/power and loading hitches separately.

Verify objective permutations, save interruption/recovery, every checkpoint, duplicate-reward prevention, machinery, projectile tunnelling/cover, contact/defenses, coordination, streaming/disposal and actual WebGPU/WebGL2/mobile renders. Retain current combat, audio, mission, input and sharp-label regressions.

At least three independent first-time human tests are required for the complete chapter: active duration, confusion, missed routes, deaths, optional discoveries and enjoyment. Improve meaningful exploration/encounters if duration falls short; do not pad walking, waiting or enemy health. Physical-phone performance remains a separate unverified gate.

Excluded: campaign, hordes, multiple weapons, inventory management, cloud saves and other districts.
