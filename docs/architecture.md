# Approved Phase 0 architecture

Approved by the user on 2026-10-05. The full proposal is in the project chat; this file records its implementation baseline. The original brief is preserved as master-game-brief.md.

## Product

**VESPERWOUND** is a persistent single-player horror action campaign set in the Vesper Works, a mortuary city powered by unfinished deaths. Iona Rusk uses a pressure lantern and wake-hook to release its machinery. The Unreturned are inhabitants reconstructed around their former occupations. The central mystery is a recording of Iona's own final words in an unknown chamber.

Art: wet stone, oxidized brass, black iron, cracked porcelain, waxed cloth, pressure sacs, tendon cables, bell profiles, and original breath notation. Warm amber belongs to the player; pale pressure light and restrained dark red mark threats. Free assets only, with original Blender work for signature silhouettes.

Version 1: one dense authored map, one protagonist, one weapon family with two configurations, seven ordinary enemy roles, two elite modifiers, two minibosses, one main boss, three relic slots, eight progression ranks. Target 2–3 hours; prove a 20–30 minute vertical slice before completing the map.

Loop: observe, explore, engage, break formations, release pressure, claim meaningful rewards, open shortcuts, reach temporary safety. Quiet traversal and atmospheric horror alternate with combat. Cosmetic scares cannot hide mandatory warnings or deal damage.

## Camera and control

Elevated three-quarter perspective: initial 50-degree pitch, 45-degree yaw, 38-degree vertical FOV, approximately 24-metre follow distance. Smooth follow, bounded boss zoom, no roll, optional shake/flash reductions, authored foreground cutaways. Free rotation is deferred.

Desktop: WASD, mouse aim, left light attack, right heavy attack, Space dodge, Q Ward, E equipped active, F interact, R healing, Tab map, Escape pause. Mobile: virtual stick, soft targeting/drag aim, attack/heavy/dodge/Ward/active buttons, separate healing and contextual interaction. Landscape gameplay; portrait pauses. Support layout scale, handedness, remapping, safe areas, and pointer cancellation.

## Combat and content

The wake-hook has a three-hit light chain and committed posture-breaking heavy strike. Simulation-driven in-place locomotion; collision-constrained authored attack/dodge displacement. Fixed data timelines define hit shapes and cancellation. Initial movement 5 m/s, 120 ms input buffer, 3-metre/250 ms dodge with a 120 ms invulnerability window. These are tuning defaults.

Health, posture/stagger, knockback, Exposed vulnerability, and deliberate critical strikes form the initial status system. Pressure powers Stillglass Ward, Severance Line, and Undertow Hook. Ward is fixed; one active is equipped at checkpoints. Ultimate and elemental proliferation are deferred.

Enemies: Tallowling swarm, Latchhound hunter, Pallbearer tank, Vent Cantor ranged, Seam Widow ambusher, Threadkeeper support, Overfilled exploder. Elites use Linked or Pressurebound. Minibosses are the Counterweight and Registrar. Main boss is the Bell That Breathes: Intake, Backpressure at 65% health, Missing Chime at 30%, with pressure-station arena mechanics and a guaranteed safe route.

Regions: Ash Quay, Ledger Ward, Suspension Gardens, Red Conduits, Ossuary Exchange, Lung Below. Approximately 400×320-metre envelope, 36–48 authored 32-metre chunks, separate floor layers, 12 principal encounters, 6 optional encounters, 8 secrets, 5 checkpoints, 3 shortcuts. Central exhaust tower and its conduits connect landmarks.

XP is encounter/objective based. Edge, Vessel, and Resolve form a compact upgrade board. Relics change behavior rather than relying on many percentage modifiers. Completed encounters, unique items, shortcuts, and story persist after death; unfinished encounters reset at the last checkpoint.

## Runtime

TypeScript and Vite; modular systems with injected dependencies and session-owned typed events. No ECS framework initially. Core simulation contracts have no Three.js dependency. Input commands feed a 60 Hz fixed simulation; render, animation, effects, UI, and audio observe state. Maximum five catch-up steps; pause on page suspension.

World → Region → Chunk → Encounter Area. Typed definitions and stable IDs support maps, enemies, attacks, abilities, encounters, and saves. Definitions compose registered behavior; fundamentally new mechanics still need a focused implementation.

WebGPURenderer targets WebGPU or its built-in WebGL2 backend. Use compatible TSL/node materials and RenderPipeline. Actual backend must be reported; required-WebGPU development mode must fail on fallback. Device loss pauses and rebuilds resources on explicit recovery. GPU compute is presentation-only and requires measured benefit.

Lighting combines baked diffuse/AO, limited environment contribution, one shadowed hero light, up to three unshadowed lights, emissive proxies, and a player lantern. High/Ultra may add one bounded shadowed spotlight. Baseline excludes shadowed point lights, full volumetrics, ray tracing, and real-time GI. Lightmaps need explicit secondary-UV manifest binding.

Rapier begins in Phase 2 for player capsule/static collision and a few props. Ordinary enemies use lightweight ground-constrained discs, layered navigation, shared flow fields, separation, and attack slots. AI planning rates depend on engagement/distance; movement and attacks use fixed simulation timing.

Density is an explicit gameplay choice: Contained ≤20, Standard 40–60, Overrun 80–120 with authored peaks up to 150. Choice changes at checkpoints, for subsequent encounters. Renderer and adaptive quality never alter density, damage, warnings, rewards, or simulation. Larger modes require measured support.

Crowds use pooling, compact arrays, spatial hashing, animation/geometry LOD, and shared assets. Phase 5 must prove a baked bone-texture TSL path on both backends before enabling maximum hordes. Ordinary pooled skinning remains the baseline until that gate passes.

Streaming starts with current/adjacent chunks, route prefetch, floor links, proxies, and authored interior visibility. Encounter state outlives chunks. Asset ownership is reference counted; prepare work targets ≤2 ms/frame. Missing collision blocks traversal with retry rather than allowing movement into empty space.

## Production and persistence

Blender → modeling/retopology/UV/PBR/rigging/animation/LOD/collision/baking → GLB → Meshopt/KTX2 optimization → validated import. One unit is one metre; runtime Y-up/+Z forward; ground-centered actor origins; four skin influences maximum. Source masters and runtime derivatives stay separate.

Hero 35–50K desktop / 12–20K mobile triangles; common enemy 3–6K / 1–2K; specialist 10–18K / 3–6K; boss 50–70K / 18–25K. Shared materials and trim sheets, 1K mobile/2K hero textures, restricted 4K landmark use. Every external asset requires provenance and commercial/redistribution license verification.

Web Audio uses ambience, effects, music, UI, and voice buses. Spatial critical cues have priority; approximately 24 mobile/48 desktop voices. Dynamic music layers exploration/suspicion/combat/horde/boss on the audio clock. User gesture unlock, suspension handling, captions, and visual warnings are mandatory.

Semantic HTML/CSS overlay with focused controllers; no initial UI framework. IndexedDB campaign saves with three slots, backups, stable IDs, schema/content versioning, sequential migrations, transactions, and export/import. Small preferences use local storage. Full campaign saves start when campaign state exists.

## Phase boundaries

0 design; 1 foundation; 2 player; 3 combat; 4 enemy framework; 5 horde optimization; 6 streaming/map technology; 7 visual pass; 8 audio pass; 9 complete content; 10 main boss; 11 sustained mobile optimization; 12 polish; 13 release/PWA.

Networking, accounts/cloud saves, procedural worlds, general destruction/ragdolls/cloth, broad randomized loot, multiple protagonists, survival mode, live operations, monetization, and mandatory telemetry are deferred. Command input, IDs, and serializable state preserve options without implementing multiplayer.

## Phase 1

Deliver a technical courtyard, Vite/strict TypeScript, renderer fallback, lifecycle, shared assets, input, audio, quality presets, diagnostics, responsive canvas and recovery UI. Original generated fixtures establish GLB skinning/animation, Meshopt and KTX2 loading. No player combat or world streaming implementation.

Required gates: reproducible check/build; backend proof and failures; representative materials/fog/shadow/instancing/skinning/post-processing; self-hosted compression; shared ownership; ten-cycle leak check; pointer/blur/orientation cancellation; audio unlock/mute/buses/resume; responsive layout; quality persistence/hysteresis; metrics; production debug isolation; ≤5 MiB compressed entry output; desktop ten-minute p95 ≤18.5 ms and baseline phone ≤35 ms after warmup; no recurring >100 ms application stall; actual Android and iPhone evidence. Missing physical evidence leaves the device gate open.
