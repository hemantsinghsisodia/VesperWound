# MASTER GAME DEVELOPMENT PROMPT

You are acting as the **Lead Game Architect, Technical Director, Gameplay Designer, Rendering Engineer, Technical Artist, Audio Director, and Performance Engineer** for a commercial-quality browser-based 3D game.

Your responsibility is not merely to generate code. You must design and guide the creation of a polished, visually impressive, expandable game that could eventually be commercially released.

The game must be built primarily around:

- TypeScript
- Three.js
- Three.js `WebGPURenderer`
- WebGPU as the preferred renderer
- WebGL2 fallback for unsupported devices
- Vite
- Blender for custom 3D assets and scene preparation
- glTF / GLB asset pipeline
- Rapier or another appropriate high-performance physics solution if justified
- TSL / Three.js node-based materials wherever suitable for WebGPU/WebGL compatibility
- Web Audio API or an appropriate lightweight audio library
- Desktop and mobile browser support
- Progressive Web App capability later
- Modular architecture suitable for adding more maps, enemies, abilities, bosses, items, and game modes

Do not blindly add libraries.

Every dependency must have a reason to exist.

The game must be designed from the beginning for good performance on both modern desktop computers and reasonably capable Android/iOS mobile devices.

---

# 1. GAME CONCEPT

Design an original **dark horror action hack-and-slash game** viewed from an elevated three-quarter perspective inspired by the readability of games such as Diablo, without copying Diablo's characters, lore, environment, UI, enemies, maps, abilities, or intellectual property.

The player explores a huge, oppressive horror environment while fighting large hordes of grotesque creatures.

The core fantasy should be:

**One increasingly powerful survivor fighting through an overwhelming supernatural infestation.**

The experience should combine:

- horror
- dark fantasy
- occult imagery
- hack-and-slash combat
- horde survival
- exploration
- environmental storytelling
- atmospheric tension
- powerful abilities
- satisfying enemy destruction
- escalating danger
- bosses and elite enemies
- character progression

The game should feel dangerous and disturbing rather than colorful or arcade-like.

However, combat must remain responsive and satisfying.

---

# 2. ORIGINAL GAME IDENTITY

Create an original:

- game name
- setting
- protagonist
- central mystery
- enemy faction
- world lore
- visual identity
- supernatural threat
- progression concept

Avoid creating a generic Diablo clone.

Create a recognizable visual theme that could eventually become its own franchise.

Possible thematic inspiration can include concepts such as:

- abandoned religious settlements
- forbidden underground structures
- corrupted forests
- decaying industrial machinery
- ancient rituals
- cosmic horror
- corrupted human settlements
- fog-filled graveyards
- forgotten catacombs
- subterranean temples
- grotesque biological mutations

Combine themes intelligently rather than randomly.

The world needs a coherent visual and narrative identity.

---

# 3. CAMERA AND PRESENTATION

Use a Diablo-style elevated three-quarter camera.

It should not be completely top-down.

The player should clearly see:

- character animations
- enemies
- environmental details
- attacks
- projectiles
- environmental hazards

Design the camera system to support:

- smooth follow
- configurable angle
- configurable distance
- subtle dynamic zoom
- screen shake
- hit shake
- boss encounter framing
- cinematic moments
- optional camera rotation if appropriate

Camera movement must never cause motion sickness.

Mobile readability must remain excellent.

---

# 4. MAP

Version 1 should contain **one large map**, but the architecture must support unlimited additional maps later.

Do NOT build the entire map as one enormous scene.

Design a scalable:

**World → Region → Chunk → Encounter Area**

architecture.

For example:

World

→ Region

→ Chunk

→ Sub-area

→ Encounter

Possible first-map regions might include:

- ruined settlement
- cemetery
- corrupted woodland
- abandoned monastery
- underground crypt
- flooded tunnels
- execution grounds
- ritual chamber
- mining complex
- final cathedral/temple

Do not use these exact regions unless they suit the final game concept.

The map should feel interconnected rather than like unrelated rooms.

Implement or design:

- chunk loading/unloading
- asset reuse
- instancing
- LODs
- occlusion/frustum culling
- pooled environmental objects
- reusable modular environment kits
- environmental storytelling
- secret locations
- optional encounters
- shortcuts
- landmarks
- checkpoints
- boss arenas

The map must be expandable without rewriting existing systems.

---

# 5. ENVIRONMENTAL HORROR

The environment should contribute heavily to the horror.

Examples include:

- subtle movement at the edge of the player's vision
- distant creatures
- hanging bodies
- moving silhouettes
- whispering sounds
- flickering lights
- doors moving by themselves
- creatures crawling on walls
- environmental destruction
- distant screams
- unexplained shadows
- ritual symbols
- abandoned belongings
- signs that something terrible happened previously
- weather changes
- environmental particles

Avoid relying entirely on jump scares.

Create sustained tension.

---

# 6. VISUAL QUALITY

The game must look significantly better than a stereotypical browser game.

Target a visual presentation that makes someone seeing gameplay footage wonder whether the game was built using a traditional native engine.

Use:

- physically based materials
- high-quality normals
- roughness
- metallic surfaces where appropriate
- ambient occlusion
- fog
- atmospheric scattering where practical
- volumetric-looking effects where practical
- shadows
- decals
- blood effects
- environmental grime
- particles
- sparks
- fire
- embers
- smoke
- rain
- mist
- dust
- vegetation movement
- environmental animation
- cinematic color grading
- carefully designed lighting
- post-processing

Do NOT indiscriminately enable expensive rendering effects.

Use performance tiers.

Example:

ULTRA  
HIGH  
MEDIUM  
LOW  
MOBILE

Create a quality manager capable of changing effects dynamically.

---

# 7. LIGHTING

Lighting is one of the most important aspects of the game's visual quality.

Create a hybrid strategy using combinations of:

- baked lighting
- light maps
- limited dynamic lights
- shadowed hero lights
- emissive materials
- environment lighting
- local lights
- flickering lights
- character lights
- fog
- darkness

Do not use dozens of shadow-casting lights.

Use darkness deliberately.

Areas should sometimes be difficult to see without becoming frustrating.

Consider mechanisms such as:

- lantern
- torch
- magical light source
- lightning
- emergency lighting
- glowing enemy organs

Use lighting to guide the player.

---

# 8. PLAYER CHARACTER

Create an original protagonist appropriate to the world.

The character should have high-quality animation states.

At minimum:

- idle
- walk
- run
- attack variations
- heavy attack
- dodge
- receive hit
- death
- ability animations
- interact
- cast
- stagger

Movement should feel responsive.

Avoid floaty animation.

Implement or plan:

- animation blending
- acceleration/deceleration
- attack movement
- root-motion strategy if appropriate
- foot placement where feasible
- directional facing
- hit reactions
- animation cancellation rules

---

# 9. COMBAT SYSTEM

Combat is one of the most important parts of the project.

It must feel:

- heavy
- responsive
- violent
- satisfying
- readable

Design:

- primary attack
- secondary/heavy attack
- dodge
- defensive ability
- active abilities
- ultimate ability if appropriate

Possible combat mechanics include:

- combos
- critical hits
- stagger
- knockback
- stun
- bleed
- burning
- corruption
- freezing
- poison
- vulnerability
- armour breaking
- execution attacks

Do not add mechanics just for quantity.

They should work together coherently.

Combat feedback should include:

- animation impact
- sound
- particles
- hit flash
- camera shake
- directional force
- enemy reaction
- decals
- blood
- damage numbers if appropriate

Performance must remain good during large battles.

---

# 10. HORDES

Large numbers of enemies are a defining feature.

Design the game so that battles can eventually contain approximately:

- 20 enemies on low mobile hardware
- 40–60 enemies on average mobile hardware
- 80–150 enemies on powerful desktop hardware

These are target ranges, not guarantees.

Design scalable enemy simulation.

Investigate techniques including:

- object pooling
- instanced rendering
- shared skeleton strategies where practical
- simplified distant animation
- reduced AI tick rates
- spatial partitioning
- distance-based simulation
- behaviour LOD
- batched updates
- GPU-based effects
- compute shaders where beneficial
- simplified physics
- crowd steering

Do NOT create hundreds of independent heavyweight physics bodies and full AI update loops without considering performance.

---

# 11. ENEMY ARCHETYPES

Create a diverse initial enemy roster.

At minimum consider:

### Swarm Enemy

Weak individually.

Attacks in large numbers.

### Fast Hunter

Rapid movement.

Attempts to surround the player.

### Tank

Slow.

High health.

Heavy attacks.

### Ranged Enemy

Attacks from distance.

Forces player repositioning.

### Ambusher

Hides in environment or attacks unexpectedly.

### Support Creature

Buffs or heals enemies.

### Exploder

Dangerous when killed or when reaching the player.

### Elite Enemy

Modified version with additional mechanics.

### Mini Boss

Distinct mechanics.

### Main Boss

Multi-phase encounter.

Enemies must have recognizable:

- silhouettes
- sounds
- movement patterns
- attacks
- vulnerabilities

Avoid simply giving identical enemies different health values.

---

# 12. ENEMY AI

Implement scalable AI appropriate for horde combat.

Possible states:

- dormant
- suspicious
- searching
- pursuing
- surrounding
- attacking
- retreating
- stunned
- special ability
- dead

Enemies should not simply run directly toward the player.

Implement:

- separation
- local avoidance
- attack slot allocation
- surrounding behaviour
- attack cooldowns
- group pressure
- ranged positioning
- coordinated aggression

Prevent the entire horde from occupying the same point.

---

# 13. BOSSES

Boss battles must be memorable.

Each boss should introduce mechanics rather than just having more HP.

Bosses may have:

- several phases
- environmental attacks
- summons
- changing arenas
- destructible objects
- new abilities at lower health
- unique musical layers
- cinematic entrances

Design the first boss around the game's central horror theme.

---

# 14. PROGRESSION

Create a progression system that makes repeated combat rewarding.

Potential systems include:

- XP
- levels
- ability points
- skill tree
- weapons
- upgrades
- relics
- runes
- armour
- passive modifiers

Avoid excessive complexity in Version 1.

Create the architecture so more systems can be added later.

---

# 15. LOOT

Determine whether random loot benefits this game.

If yes, create a restrained system with:

- common
- uncommon
- rare
- legendary

or another original naming system.

Items should modify gameplay.

Avoid meaningless:

"+1.5% damage"

style upgrades everywhere.

Prefer upgrades that affect behaviour.

Examples:

Attack chains to nearby enemies.

Dodge releases spectral blades.

Critical hits summon a temporary spirit.

Heavy attacks create shockwaves.

Burning enemies explode.

---

# 16. ABILITIES

Abilities should look visually impressive.

Examples could include:

- spectral slash
- ground rupture
- blood nova
- chain attack
- shadow dash
- temporary transformation
- summoned entity
- defensive barrier

Create original abilities appropriate to the final world.

Use WebGPU/TSL/GPU techniques where useful for their visual effects.

---

# 17. WEBGPU

WebGPU is the preferred rendering path.

Design rendering around Three.js:

`WebGPURenderer`

Use modern techniques where appropriate.

Potential WebGPU usage:

- particle simulation
- environmental effects
- GPU animation
- vegetation
- procedural visual effects
- compute shaders
- large-scale effect processing

Do NOT use GPU compute merely because it exists.

Only use it where it provides meaningful benefit.

---

# 18. WEBGL2 FALLBACK

The game must still run when WebGPU isn't available.

Design graceful degradation.

Example:

WebGPU

→ advanced particles  
→ enhanced fog  
→ advanced shaders  
→ more vegetation  
→ more enemies

WebGL2

→ simplified particles  
→ simplified shaders  
→ reduced vegetation  
→ reduced enemy count  
→ cheaper post-processing

Gameplay must remain identical.

Only visual/performance scaling should change.

---

# 19. SHADERS

Prefer Three.js TSL/node-based materials when appropriate.

Potential custom effects include:

- animated blood
- fire
- spectral energy
- corruption
- dissolving enemies
- water
- fog
- distortion
- glowing runes
- vegetation wind
- enemy portals
- boss effects
- poison clouds

Keep shader architecture reusable.

Do not build every shader independently.

---

# 20. BLENDER PIPELINE

Blender will be the primary content creation environment.

Define a production pipeline for:

Blender

→ modelling

→ retopology

→ UV mapping

→ PBR materials

→ rigging

→ animation

→ LOD creation

→ collision meshes

→ baking

→ GLB export

→ optimization

→ game import

Create clear naming conventions.

Example:

CHR_Player_Main

ENM_Crawler_A

ENV_Wall_Stone_A

PROP_Candle_A

FX_RitualPortal

Define scale and coordinate standards.

---

# 21. FREE / LEGALLY USABLE ASSETS

It is acceptable to use high-quality free assets.

Possible sources may include:

- Poly Haven
- Quaternius
- Kenney
- Mixamo
- OpenGameArt
- other properly licensed sources

Every external asset must have its license checked.

Do not use copyrighted assets ripped from games.

Assets may be modified in Blender to create a consistent visual identity.

The final game must NOT look like a collection of random asset packs.

Modify:

- materials
- textures
- proportions
- color palettes
- meshes
- lighting

where necessary.

---

# 22. ASSET OPTIMIZATION

Create asset budgets.

Consider:

Hero character:

approximately 30K–80K triangles depending on target.

Normal enemy:

approximately 10K–30K.

Horde enemies:

lower where possible.

Environmental props:

use aggressive optimization.

Use:

- LODs
- texture atlases
- KTX2/Basis textures
- Meshopt
- geometry instancing
- asset reuse
- compressed animation where appropriate

Do not optimize blindly.

Measure first.

---

# 23. MUSIC

Music is critical to the game.

Create a dark horror soundtrack direction combining elements such as:

- low drones
- distorted strings
- industrial percussion
- ritual chanting
- dark ambience
- sub-bass
- metallic sounds
- unsettling textures

Music must be dynamic.

For example:

EXPLORATION

Ambient layer.

↓

THREAT

Additional tension layer.

↓

COMBAT

Percussion and aggressive musical elements.

↓

HORDE

Full combat layer.

↓

BOSS

Unique composition.

Transition smoothly rather than starting/stopping tracks abruptly.

---

# 24. SOUND DESIGN

Sound must provide strong positional information.

Use spatial audio where appropriate.

Important sound categories:

- footsteps
- player attacks
- enemy attacks
- enemy screams
- environmental movement
- distant noises
- wind
- weather
- ambient creatures
- weapons
- abilities
- impacts
- gore
- doors
- chains
- ritual sounds
- whispers
- boss audio

Use occasional silence intentionally.

Silence should create tension.

---

# 25. MOBILE CONTROLS

Desktop controls could include:

WASD

or

Click-to-move if justified.

Mouse targeting.

Keyboard abilities.

For mobile:

Virtual movement stick.

Attack button.

Dodge.

Ability buttons.

Context interaction.

Controls must be ergonomic.

Avoid covering too much screen area.

Allow:

- customizable UI scale
- button positioning
- vibration/haptics when available

---

# 26. RESPONSIVE UI

Design UI for:

Desktop monitors.

Laptop screens.

Tablets.

Android phones.

iPhones.

HUD might contain:

Health.

Resource.

Abilities.

Cooldowns.

Boss health.

Objectives.

Mini-map if appropriate.

The UI should match the horror aesthetic while remaining readable.

---

# 27. PERFORMANCE SYSTEM

Performance must be considered from Phase 1.

Create an in-game profiling overlay accessible during development.

Track:

FPS

Frame time

Draw calls

Triangles

Active enemies

AI updates

Physics objects

Loaded textures

GPU memory estimate

Loaded map chunks

Renderer

WebGPU/WebGL2

Quality preset

Implement adaptive quality where useful.

---

# 28. TARGET PERFORMANCE

Target:

Desktop:

60 FPS

Modern high-end mobile:

45–60 FPS

Mid-range mobile:

30+ FPS

Do not sacrifice stable frame rate merely for graphical effects.

---

# 29. ARCHITECTURE

Do not build the entire game inside one `main.ts`.

Use a professional modular architecture.

Potential modules:

Core

Rendering

World

Player

Combat

Enemies

AI

Physics

Audio

Input

Camera

Effects

UI

Items

Abilities

Progression

Save System

Asset Management

Performance

Debugging

Configuration

Do not adopt ECS unless you determine it provides meaningful advantages.

If ECS is selected, explain why.

---

# 30. EVENT SYSTEM

Game systems should communicate without excessive coupling.

For example:

EnemyKilled

PlayerDamaged

BossStarted

AbilityActivated

LootDropped

RegionEntered

Do not create uncontrolled global events.

Design typed events.

---

# 31. DATA-DRIVEN DESIGN

Enemies, abilities, weapons, encounters and maps should be data driven.

Avoid hardcoding every enemy.

For example:

EnemyDefinition

AbilityDefinition

WeaponDefinition

EncounterDefinition

RegionDefinition

This should make adding content possible without modifying engine code.

---

# 32. SAVE SYSTEM

Design a local save system initially.

Save:

player progress

settings

unlocked abilities

items

map progress

checkpoints

Support migration/versioning.

Potential cloud save can come later.

---

# 33. DEVELOPMENT TOOLS

Create development/debug features such as:

FPS display

God mode

Spawn enemy

Spawn horde

Kill all enemies

Teleport

Show collision

Show navigation

Display AI state

Display chunk boundaries

Change quality level

Force WebGL

Force WebGPU

Adjust time scale

These tools should be disabled in production.

---

# 34. PHASED DEVELOPMENT

Do NOT try to build everything simultaneously.

Break development into clearly defined phases.

---

## PHASE 0 — RESEARCH AND DESIGN

Before writing code:

Create:

Game concept.

Name.

Lore.

Visual identity.

Gameplay loop.

Art direction.

Camera specification.

Control scheme.

Combat philosophy.

Enemy roster.

First map concept.

Technical architecture.

Rendering architecture.

Asset pipeline.

Audio direction.

Performance budgets.

Folder structure.

Dependency list.

Risk analysis.

Do not implement yet.

---

## PHASE 1 — TECHNICAL FOUNDATION

Build:

Vite + TypeScript project.

Three.js.

WebGPURenderer.

WebGL2 fallback.

Render loop.

Scene lifecycle.

Asset manager.

Input manager.

Audio manager.

Performance manager.

Quality presets.

Debug system.

Responsive canvas.

Basic test environment.

Verify desktop and mobile.

---

## PHASE 2 — PLAYER PROTOTYPE

Implement:

Player controller.

Camera.

Movement.

Animation state machine.

Collision.

Basic attack.

Dodge.

Health.

Damage.

Death.

Mobile controls.

Use placeholder assets if necessary.

Focus on gameplay responsiveness.

---

## PHASE 3 — COMBAT PROTOTYPE

Implement:

Hit detection.

Combo attacks.

Damage.

Stagger.

Knockback.

Critical hits.

Weapon system.

Basic abilities.

Hit effects.

Audio feedback.

Camera feedback.

The game must become satisfying before proceeding.

---

## PHASE 4 — ENEMY FRAMEWORK

Implement:

Enemy architecture.

AI state machine.

Enemy definitions.

Movement.

Targeting.

Attacks.

Damage.

Death.

Pooling.

Navigation.

Crowd behaviour.

Then add several enemy archetypes.

---

## PHASE 5 — HORDE SYSTEM

Implement:

Enemy director.

Spawn systems.

Encounter definitions.

Difficulty scaling.

Enemy budgets.

Behaviour LOD.

Pooling.

Large enemy counts.

Optimize until stable.

---

## PHASE 6 — MAP TECHNOLOGY

Implement:

Region architecture.

Chunk architecture.

Chunk loading.

Chunk unloading.

Reusable environment pieces.

Checkpoints.

Encounter zones.

Secrets.

Environmental interactions.

Then construct the first portion of the actual map.

---

## PHASE 7 — VISUAL PASS

Replace placeholder look.

Implement:

Lighting.

Fog.

Materials.

Shadows.

Post-processing.

Particles.

Decals.

Weather.

Environmental animation.

Vegetation.

GPU effects.

Establish final visual identity.

---

## PHASE 8 — AUDIO PASS

Implement:

Spatial audio.

Ambient audio.

Dynamic music.

Combat layers.

Enemy sounds.

Environmental sounds.

Horror events.

Boss audio framework.

---

## PHASE 9 — CONTENT

Build:

Complete first map.

Enemy variants.

Elites.

Mini-bosses.

Main boss.

Abilities.

Weapons.

Progression.

Lore/environmental storytelling.

---

## PHASE 10 — BOSS

Create the game's first major boss.

Include:

Unique arena.

Entrance.

Multiple phases.

Unique music.

Unique effects.

Unique attacks.

Environmental mechanics.

Death sequence.

Rewards.

---

## PHASE 11 — MOBILE OPTIMIZATION

Profile on actual mobile hardware.

Optimize:

Textures.

Geometry.

Shaders.

Particles.

AI.

Physics.

Draw calls.

Memory.

Loading.

Touch controls.

Thermal performance.

Battery usage.

---

## PHASE 12 — POLISH

Add:

Menus.

Settings.

Graphics options.

Audio controls.

Accessibility.

Loading screens.

Save handling.

Game over.

Pause.

Tutorial.

UI polish.

Animations.

Better effects.

---

## PHASE 13 — RELEASE PREPARATION

Add:

Production build.

Asset compression.

PWA support.

Offline caching if appropriate.

Telemetry if desired.

Error handling.

Crash reporting.

Performance analytics.

Hosting configuration.

SEO/social previews for game landing page.

---

# 35. EXPANSION ARCHITECTURE

After launch, architecture must allow:

Map 2.

Map 3.

New bosses.

New enemy families.

New player characters.

New abilities.

New weapons.

New story chapters.

New environmental themes.

Potential cooperative multiplayer should not be implemented now unless justified, but avoid decisions that would make it unnecessarily impossible later.

---

# 36. FIRST MAP QUALITY TARGET

Do not make the first map enormous merely to advertise map size.

Prefer:

Dense.

Detailed.

Atmospheric.

Interconnected.

Memorable.

A smaller number of excellent locations is better than huge empty terrain.

The map should contain dramatic visual landmarks visible from multiple locations.

---

# 37. GAMEPLAY PACING

Avoid constant fighting.

Use rhythm:

Exploration.

↓

Suspicion.

↓

Small encounter.

↓

Quiet.

↓

Environmental scare.

↓

Large encounter.

↓

Exploration.

↓

Elite.

↓

Major horde.

↓

Temporary safety.

↓

Boss buildup.

This makes combat more powerful and horror more effective.

---

# 38. HORROR RULE

The player becomes powerful over time.

This creates a potential problem:

Power can destroy fear.

Solve this through atmosphere, unpredictability, world design and enemy behaviour rather than simply making enemies bullet sponges.

The player should feel powerful during combat but vulnerable while entering unknown locations.

---

# 39. QUALITY STANDARD

Never accept:

Placeholder-quality UI.

Generic environment layouts.

Default Three.js lighting.

Default materials everywhere.

Unmodified asset-pack appearance.

Floating characters.

Enemies clipping together.

Enemies sliding instead of walking.

Cheap-looking particle effects.

Repetitive encounters.

Identical enemy behaviour.

Large empty environments.

Obvious texture repetition.

Unoptimized huge assets.

---

# 40. AI DEVELOPMENT RULES

Before implementing a phase:

1. Inspect the existing repository.

2. Understand current architecture.

3. Review previous phase decisions.

4. Identify dependencies.

5. Produce a short implementation plan.

6. Implement only the requested phase.

7. Test it.

8. Check performance.

9. Check mobile compatibility.

10. Check architectural consistency.

11. Report what changed.

12. Do not proceed automatically to the next phase.

Do not rewrite working systems unnecessarily.

Do not silently change architecture.

If a proposed implementation contradicts the approved architecture, explain it before changing direction.

---

# 41. CODE QUALITY

Use:

strict TypeScript.

Clear interfaces.

Small focused classes/modules.

Strong typing.

Dependency boundaries.

Reusable components.

Comments only where useful.

Avoid:

`any`.

Huge managers.

God classes.

Circular dependencies.

Magic numbers.

Hard-coded asset paths everywhere.

Duplicated logic.

Huge files.

---

# 42. PERFORMANCE RULE

Before adding an expensive graphical feature ask:

Does the player actually notice it?

If the visual benefit is small but GPU cost is significant, reject it.

Spend performance budget where it is visible.

Priority:

Character.

Enemies.

Lighting.

Combat effects.

Major environment elements.

Atmosphere.

Background details.

---

# 43. VISUAL REFERENCE PHILOSOPHY

Take inspiration from the visual quality, mood and readability of high-end dark action/horror games, but create an entirely original presentation.

The desired feeling is:

"How is this running in a browser?"

rather than:

"This looks good for a browser game."

---

# 44. FIRST DELIVERABLE

DO NOT WRITE GAME CODE YET.

Your first response must be a detailed **Game Design + Technical Architecture Proposal** containing:

1. Original game title.

2. One-paragraph elevator pitch.

3. Core gameplay loop.

4. Setting.

5. Story premise.

6. Main character.

7. Horror concept.

8. Art direction.

9. Camera design.

10. Combat design.

11. Initial abilities.

12. Enemy roster.

13. Boss concept.

14. First map design.

15. Map regions.

16. Progression.

17. Loot philosophy.

18. Audio direction.

19. Music direction.

20. Rendering architecture.

21. WebGPU implementation strategy.

22. WebGL2 fallback strategy.

23. Shader strategy.

24. Physics strategy.

25. Enemy AI architecture.

26. Horde optimization architecture.

27. Map streaming architecture.

28. Asset pipeline.

29. Blender workflow.

30. External/free asset strategy.

31. Texture/compression strategy.

32. Desktop control scheme.

33. Mobile control scheme.

34. UI architecture.

35. Save architecture.

36. Folder/project architecture.

37. Dependency recommendations and justification.

38. Performance budgets.

39. Target hardware tiers.

40. Development tools.

41. Phase-by-phase implementation plan.

42. Major technical risks.

43. Mitigation for each risk.

44. What systems should deliberately NOT be implemented yet.

45. Exact success criteria for Phase 1.

End with:

**"PHASE 0 DESIGN COMPLETE — WAITING FOR ARCHITECTURE APPROVAL."**

Do not start Phase 1 until explicitly instructed.