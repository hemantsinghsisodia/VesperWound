# Milestone B — district and persistence

Review branch: `codex/chapter-district`, based on approved `main` at `ac3f17a`.

## Review scope

This is the navigation and save-system build of Last Departure. It contains five connected ground-floor blockout areas, two unlockable shortcuts, three checkpoints, the regulator/hoist and pump-valve route, a discovery map and versioned local saves. The 78 × 62 metre envelope approximates the approved 80 × 64 metre target.

The accepted Medic, baton and zombie combat are retained. Seven mandatory encounter sites and the optional accumulator encounter use the existing zombie. Sentry and guardian sites are explicitly labelled as temporary workers. Their new enemy mechanics belong to Milestone C. Final district art, environmental records, harbour soundscape and ferry finale belong to D. This build does not claim the finished chapter's 20–30-minute pacing or visual standard.

Enter the Works, then choose **New chapter** and confirm. **Continue chapter** appears when a valid save exists. The existing short mission and practice remain available for regression testing. Chapter progression is separate from the short mission.

## Ownership and contracts

- `src/chapter/definition.ts` is the editable original blockout source: stable sector, portal, encounter and checkpoint IDs, interaction points, ground boundaries and solids. `node tools/build-chapter-blockout.mjs` explicitly exports the selected-tier section JSON. Normal builds only package saved data; they do not rewrite it.
- `ChapterSimulation` owns fixed-step chapter progression and observes the existing `EncounterSimulation`. Neither imports Three.js. It exposes objectives and eligible interactions; combat still uses existing authoritative attack/contact logic.
- `ChapterSession` owns progression and storage across visual quality changes. Completed encounters remain cleared, while restoration reconstructs unfinished encounters without transient attacks or partial health. Health and pressure refill at a checkpoint; baton and the one-time 125-pressure upgrade persist.
- `ChapterPresentation` owns section geometry, materials, labels and readiness leases. It keeps the current sector plus at most one nearby adjacent sector. A portal stays physically closed until both sections are ready and any shortcut condition is met. Failed requests expose retry; releasing a lease aborts loading and disposes late results.
- The small original blockout sections merge floor and solid geometry into two batches each. The retained initial practice art stays owned but hidden during chapter play, so returning to practice remains available. No new texture set, rendering pass or imported art is introduced.
- Collision uses the same saved solids as rendering. Hoist cargo follows a fixed rail with matching dynamic collision and stops when the player obstructs its path. Enemy navigation remains sector-bounded; the existing attack rules and shared attack slot are unchanged.
- The map shows discovered area names, current position/objective and opened shortcuts. Chapter prompts reuse the existing F/contextual touch input and inherited handedness/scale settings.

## Saves and recovery

`ChapterSaveStore` uses IndexedDB database `vesperwound-chapter`, schema version 1, object store `progress`. Serialized read/write transactions atomically retain the previous valid `current` record as `backup`, then commit the next record. Loads validate version, chapter ID, stable IDs, types, uniqueness and completion prerequisites. A damaged primary falls back to a valid backup. If both are invalid, the records remain stored and the UI explains the failure; starting a new chapter requires explicit confirmation.

The saved record contains checkpoint identity, acquired baton/upgrade, cleared encounters, discoveries, shortcut flags, hoist/valve solutions, regulator/installation/completion flags and active play time. It never contains live enemy HP, attacks, projectile state or GPU objects. Only committed changes trigger autosave; leaving the chapter also saves. Pauses and inspection do not advance active play time.

Storage failure does not stop play. A visible message warns that progress could not be saved. Saves are local to the browser profile and origin: use the same hostname and port for Continue. Clearing browser site data removes these saves. No account or cloud service is involved.

## Review checklist

Start with New chapter once, then use Continue for recovery checks.

1. Can you find the baton, street exit and warehouse without instructions from the developer?
2. Does the map explain the route, current destination and shortcut returns?
3. Does rail III clearly open regulator access? Can you correct either pump valve immediately?
4. Do the warehouse office and pump exit feel like usable safe checkpoint locations?
5. Activate each checkpoint, leave/reload, and confirm the correct position, full health/pressure and cleared encounters.
6. Die during an unfinished fight. Restart; confirm that fight resets and previous completed encounters stay cleared.
7. Find the accumulator, leave/reload, and confirm 125 capacity without a duplicate reward.
8. Open both shortcuts and backtrack; report blocked corners, missing floors, confusing gates or camera occlusion.
9. Try Low quality, inspection and touch/left-handed controls. Confirm progression remains intact.
10. Record time spent actively exploring, wrong turns, deaths, confusing objectives and enjoyment. This is navigation feedback, not the final 20–30-minute chapter pacing test.

Do not merge until the user approves this milestone. Physical-phone performance remains unverified.
