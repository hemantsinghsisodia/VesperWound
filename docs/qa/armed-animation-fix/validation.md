# Armed animation repair — 2026-10-14

Review branch: `codex/armed-animation-fix`, based on main `65e1147`.
This fixes Medic's frozen armed locomotion and improves the baton arm motion.
It does not change damage, attack windows, movement speed or input rules.

## Cause and repair

The offline baker passed the entire source frame number as Blender's `subframe`
argument. Blender clamps that argument to 0–1. Nearly all of each armed action
therefore sampled source frame 1. The manually authored wrist path still moved,
which left an almost frozen body supporting an arm-only strike.

The baker now supplies an integer frame and its fractional remainder. The saved
master retains complete walk, run, dodge, Ward, hit and death motion. Each sample
starts from clean transforms so unkeyed channels cannot retain an earlier pose.

The attack bake also uses a stable elbow plane, controlled wrist roll and tighter
finger closure with an unstretched thumb solve. The broad source sword action is
blended into the armed guard and timed to the existing baton strike windows. This
reduces excessive body rotation while preserving a visible weight shift. All
solving is offline; the runtime consumes ordinary skeletal clips. Contact paths
were exported from the same saved poses.

`tools/blender/repair_baton_motion.py` is the explicit source-editing command.
`tools/build-baton.mjs` still exports saved sources read-only and checks their
hashes. The weapon model, character mesh, skeleton and unarmed master are retained.
Blender exports publish through a temporary file to avoid Windows truncation
failures when a reader retains the previous export.

## Evidence

- [Before repair](before/armed-webgpu/results.json): running feet moved less than
  one micrometre over the sampled studio interval, confirming the held pose.
- [Corrected WebGPU](after/armed-webgpu/results.json): both walk feet move about
  0.66 m and both run feet about 1.24 m along the studio forward axis over a cycle.
- [Corrected WebGL2](after/armed-webgl2/results.json) and
  [touch movement](after/armed-mobile/results.json) exercise the actual equipped
  player. The mobile foot-separation excursion is about 0.36 m.
- [Combat/contact check](regression/browser/combat.json): victory, critical and
  Ward blocks through real input. Sampled visual-to-CPU heavy-contact error was
  below 9 mm against a 30 mm limit.
- [Grip close-up](after/armed-webgpu/grip.png),
  [walk](after/armed-webgpu/Walk-8.png),
  [run](after/armed-webgpu/Run-8.png),
  [backhand](after/armed-webgpu/Light2.png), and
  [heavy](after/armed-webgpu/Heavy.png).
- [Movement and swing recording](movement-and-swings.webm) and
  [pickup/combat recording](regression/pickup-combat.webm).

## Validation

- `npm run check`: TypeScript, ESLint, 98 unit tests and production build passed.
- New asset regressions verify source walk motion, movement through the second
  half of both gait cycles, and bounded consecutive arm/wrist rotation. Existing
  armed/unarmed combat, contact-boundary and buffer tests remain passing.
- New browser motion regression: three passes, WebGPU and WebGL2 at 1440 × 900,
  plus Pixel 7 landscape emulation at 915 × 412. Chrome 155.0.8059.41 on the local
  Windows desktop. No software-renderer flags were requested. Every armed action
  was previewed and captured; actual movement uses keyboard or CDP touch input.
- Existing weapon regressions pass for combat/contact, desktop quality changes,
  touch cancellation and equipment retention. The loading/lifecycle case failed
  once in the combined run, then passed its standalone rerun in 1m36s; this is
  recorded as a test-stability limitation, not silently treated as a clean run.
  [Lifecycle results](regression/browser/lifecycle.json) confirm bounded owned
  resources/references across three inspection/reload cycles, cancellation,
  retry and page reset. [Standalone log](lifecycle.txt).
- Two production smoke tests pass: diagnostics exclusion and deferred armed
  loading with encounter/inspection retention. [Log](production.txt).
- Both existing legacy/unavailable spatial-audio regressions pass. [Log](audio.txt).
- `npm run size`: all delivery ceilings pass. The armed GLB is 437,816 bytes;
  the separate pack including its manifest is 437,932 bytes, below 512 KiB.
  Bootstrap is 2,584,686 bytes gzip. Initial art remains within its existing limits.

## Review limits

This is an animation correction, not a new character or combat milestone. The
user still needs to review the movement and swing feel in play. Close-up clothing
and glove deformation retain the accepted imported mesh/rig's limitations.
Physical-phone performance remains unverified. No new five-minute performance
benchmark is claimed for this repair; the short recorded functional runs and
their diagnostic frame statistics are not an isolated performance measurement.
Chrome reports the existing multiple-KTX2-loader warning during scene reloads.
No new geometry, runtime IK, listeners or animation loops were introduced.

The user accepted the repair on 2026-10-14 and explicitly authorized committing,
merging into main and pushing. Validation servers were confirmed stopped at
handoff, including ports 5173, 5182 and 4173.
