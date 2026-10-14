# First mission — Restart the Ferry Winch

Approved 2026-10-14. Review branch: `codex/first-mission`, from main `7cd870e`.
User review approved; commit, merge and push explicitly requested on 2026-10-14.
This is a short mission on the retained
Pressure Court / Pump Alley / Arrival Quay route, not a district expansion.

## Play

Enter the Works, then choose **Start mission** in the objective panel. Practice
remains available before starting. The selected enemy tier loads transactionally;
failure retains current play and offers retry, and the same button cancels loading.

Take the highlighted baton, follow the south passage and defeat two guards on the
quay approach. Retrieve the regulator from the marked case in the west loading bay.
Defeat the three guards on the winch apron, fit the regulator at the crane's control
pedestal, wait for the ramp to lower and board the ferry. F and the contextual touch
button share the same interaction checks. The objective panel supplies location
clues and reminders about defensive timing.

Pause offers **Restart mission** and **Return to practice**. Death offers a mission
restart. Restart resets encounters, progress, machinery, health, pressure and position;
the baton remains equipped for this session. Reloading the page resets the session.
There is no campaign save, inventory or new enemy/weapon type in this milestone.

## Ownership and simulation

`FirstMission` is a session-owned CPU state machine. It reads the existing encounter
state and advances only on the existing fixed clock. Interactions require a living,
uncommitted player in range with clear reach. Mission waves reuse the existing
generation-aware enemy pool and retain the player's position, health and pressure
between fights. The encounter constructor's navigation bounds now also constrain
movement, replacing its old hardcoded courtyard-only movement limit.

`MissionPresentation` observes progression; it owns its geometry/materials and never
determines combat or completion. Its original service case, regulator, winch drum,
ramp, trail marks and ferry backdrop are authored in TypeScript. No third-party
assets, downloads or additional texture payloads are introduced. Existing Medic,
baton, zombie and environment provenance remains applicable. The ferry is a
non-traversable backdrop beyond the existing harbour boundary; boarding completes
at the quay end of its ramp, without creating a new navigable area.

During the mission, `DistrictPresentation` moves the existing harbour sign to the
side and splits its visible wall around the ramp. These meshes share the loaded
asset's geometry/materials; detach restores the original transforms and removes
the temporary clones. Practice retains the original harbour. Winch equipment sits
on the existing collidable crane plinth, with a clear interaction point beside it.

Mission state survives graphics replacement and inspection because it belongs to
the session. Presentation is rebuilt from that state. Menu, inspection, portrait and
background pauses prevent mission-clock advancement. Audio cues use owned,
voice-limited synthesizers; restart/exit cancels mission sounds. Reduced Motion
adds no camera impulses or flashes. The ramp is a functional state change, not a
camera effect.

## Review gates

The intended first-play duration is roughly 5–8 minutes; report actual observed
playthrough duration separately. Automated route knowledge does not establish
first-time pacing, and timers must not be added just to meet a duration target.
Judge objective clarity, interaction visibility, fair encounters, machinery response
and an understandable ending. Browser emulation does not establish phone performance.
Validation evidence is saved under `docs/qa/first-mission/`.
