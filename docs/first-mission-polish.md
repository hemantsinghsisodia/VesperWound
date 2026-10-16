# First mission polish — Restart the Ferry Winch

Approved 2026-10-14. Review branch: `codex/first-mission-polish`, based on `940377f`.
The user approved commit, merge into main and push on 2026-10-16. It retains the two-area map, accepted
Medic/baton animations, zombie asset, combat rules and practice modes.

## Play and presentation

Choose Enter the Works, then Start mission. Enemy and quay preparation complete
before the four-second opening begins. Practice remains playable during loading;
the same button cancels, and a failure offers retry. Skip or Space closes the
opening without a dodge. Session replays omit it.

Take the baton, follow Pump Alley, clear the two approach guards and recover the
regulator from the west loading bay. Existing pressure recovery makes this a safe
breather, without a mandatory waiting timer. Three winch guards are visible after
pickup but remain inactive until entering the east apron or landing an attack.
Clear them, install the regulator at the amber socket and watch the six-second
pressure/gauge/drum/ramp progression. Player control remains available throughout
restoration. The green signal marks the boarding point.

Boarding fades Medic out, retracts the ramp and moves the ferry seaward in a
six-second presentation. Skip reaches the same completed state. Route restored
offers Play again and Return to practice. This does not add a navigable deck or
sailing mechanics. The completion timer counts active play, excluding cinematics.

## Contracts and ownership

- `FirstMission` owns fixed-step phases, presentation progress, guidance and
  encounter activation. `MissionSnapshot` reports interaction eligibility,
  gameplay availability, fade/visibility and separate active/cinematic clocks.
- Introduction and departure advance mission time while CPU player/enemy updates
  are frozen. Skip clears queued and held input; repeated keydown cannot turn a
  held skip key into an unintended dodge.
- `EncounterSimulation` can stage targetable, inactive guards. The first real hit
  activates them; normal practice encounters retain their existing behavior.
- A `SectionLease` pins quay readiness independently of player location. The
  pending request owns it until commit, then `VisualShowcase` owns it. Cancellation,
  failure, replacement and disposal release ownership; late results cannot commit.
- A scene-owned `MissionCamera` overrides only the rendered camera, leaving the
  combat aiming camera independent. Reduced Motion uses a static composition.
- `MissionPresentation` reconstructs ferry/ramp/winch transforms from CPU state.
  It owns its original geometry, generated label texture, materials and sprite
  quad. No imported assets or texture payloads were added. Prior provenance applies.
- Mission audio uses bounded, owned synthesized cues. The machinery pulses follow
  phase crossings; obsolete sounds stop on skip, restart, exit or inspection.
- Settings, background and portrait pause freeze progress and clear input.
  Inspection is unavailable during camera sequences and completion; it retains
  the normal mission during active play. Quality changes preserve CPU state.

## First-time playtest checklist

Ask a player unfamiliar with the route to start without coaching. Record:

- First-play duration, deaths and restarts; do not count menu/inspection time.
- What they think the mission asks after the opening, and whether they skip it.
- Whether they notice the baton and can use the interaction prompt.
- Every wrong turn, objective reread or moment of uncertainty; where it occurs.
- Whether the two fights feel distinct, fair and separated by a useful breather.
- Whether the waiting guards, windup and defensive opportunities are readable.
- Whether they recognize the regulator case, socket and boarding point.
- Whether machinery feedback makes the six-second restoration understandable.
- Whether departure feels like a successful ending and they want to play again.
- On touch: thumb reach, occluded characters, accidental inputs and hand fatigue.

The original 5–8-minute target remains a hypothesis, not a reason to add delays.
Automated route completion establishes functionality, not first-time enjoyment.
Physical-phone performance remains unverified.
