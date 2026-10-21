# Baton responsiveness and swing repair

Review branch: `codex/baton-combat-feel`. This milestone requires explicit user
approval before merging. Medic's mesh, rig, weapon dimensions and damage per hit
are retained.

## Controls and timing

A click from a free state starts a strike at the next 60 Hz update. While a baton
strike is running, one additional light/heavy press is retained until its end.
The latest press replaces that pending choice, including two different presses
within the same fixed tick. Holding a button does not create additional strikes.

Dodge takes priority during recovery and clears the pending choice. Windup and
active frames remain committed. Hit interruption, death, restart, settings,
inspection, preview-camera changes and scene replacement clear queued attacks.
Unarmed input retains its existing 120 ms buffer. The baton combo resets 600 ms
after a completed chain without another attack.

| Strike | Duration | Active interval | Health damage | Posture |
| --- | ---: | ---: | ---: | ---: |
| Light 1 | 450 ms | 150–250 ms | 21 | 15 |
| Light 2 | 500 ms | 166.7–283.3 ms | 27 | 20 |
| Light 3 | 600 ms | 200–333.3 ms | 36 | 30 |
| Heavy | 800 ms | 350–500 ms | 48 | 50 |

Active intervals define when contact can resolve; they do not guarantee a hit.
Strikes remain stationary and cannot reach through obstacles. Pressure awards,
knockback, critical multiplier, enemy damage and enemy coordination are retained.

## Animation and ownership

The authored actions use a shared forward guard, compact forehand, returning
backhand, diagonal finisher and overhead heavy. The elbow plane and shorter arm
extension reduce wrist folding. The supporting stance remains planted during
strikes; the complete accepted walking and running leg cycles are retained.

Controlled strikes use a 50 ms entry blend. Their poses are sampled from the CPU
action time plus the fractional render interval (at most one fixed tick). Mixer
time advances fades only, with one controlled rig evaluation per rendered frame.
Damage continues to use immutable, offline-exported shaft paths at fixed ticks.
Normal locomotion and studio transitions retain their 180 ms blend.

The editable source is `art/source/medic-baton-animations.blend`. Explicit
authoring uses Blender with `--disable-autoexec` and
`tools/blender/repair_baton_motion.py`; `node tools/build-baton.mjs` only exports
saved sources and verifies that their hashes do not change. It regenerates the
compressed pack, grip/contact data and provenance. The normal build does not
invoke authoring. The CC0 animation source remains credited separately from the
CC BY Medic.

Development-only snapshots expose the sampled attack time and actual shaft
positions. `inspectPose(seconds)` isolates a studio pose for reproducible close-up
captures; it cannot change the gameplay simulation. Production exposes no
development commands or contact trace recorder.

## Review checklist

1. Run `npm run dev`, enter the Works and pick up the baton. Click once from idle,
   then while walking. The windup should begin promptly without a forward step.
2. Click again early during the first swing. Verify one follow-up, then stop
   clicking and confirm no further swings occur. Try replacing a queued light
   with heavy, then heavy with light.
3. Watch the three distinct light swings and overhead heavy against a training
   target. Check the forearm, wrist, fingers, coat and visible contact from the
   gameplay camera and detailed inspection.
4. Fight a single zombie, then the group. Dodge during recovery and use Ward
   deliberately. Report whether connected hits feel reliable and whether the
   faster chain improves control without making heavy attacks weightless.
5. Pause with a follow-up queued, visit inspection and change quality. On return,
   verify the baton remains equipped and no queued strike leaks through.

Use `npm run check`, `npm run size`, the dedicated `playwright.baton.config.ts`
suite and existing weapon/production regressions for repeatable verification.
Performance uses production rendering, 1440 × 900, High quality, adaptive
resolution disabled, uncapped Chrome and separate five-minute combat/inspection
samples. See `qa/baton-combat-feel/validation.md` for measured results and limits.
Human combat-feel approval and physical-phone performance remain separate gates.
