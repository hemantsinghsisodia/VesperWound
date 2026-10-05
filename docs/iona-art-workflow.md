# Iona authored source and export workflow

`art/source/iona-master.blend` is the canonical editable source. It contains the complete licensed anatomical reference, tailored garment surfaces, sculpt/bake proxies, an offline pinned cloth drape study, editable groom curves, layered runtime cards, original equipment, the 63-bone rig, sockets and three export selections. The earlier character remains in `art/baseline/iona-v1`; its runtime exports and source files are a comparison baseline.

The source was created and refined through Blender authoring scripts. It is saved, separately editable work; the build does not rerun those scripts. The scripts preserve the authoring history but are explicit editing operations, some of which apply incremental changes. Do not rerun them on an edited master as a build step.

## Normal export

Run `npm run assets:build` with Blender 5.2. Set `BLENDER_PATH` for another install location. The exporter opens the saved master with auto-execution disabled, evaluates per-part topology/modifiers, removes covered head/neck anatomy only from derivatives, batches runtime pieces by material, and exports the three selections. It never saves the master; the orchestrator verifies its SHA-256 is unchanged.

Ash Quay's existing optimized models are retained byte-for-byte. Environment `ArtVariant` stays desktop/mobile. Character `CharacterTier` adds cinematic independently. The cinematic manifest contains only Iona; the studio owns its floor, lighting, reflection and camera. Loading it is an explicit desktop action. Mobile startup does not load its model or inspection module.

Geometry budgets include equipment. Cinematic is ≤180K triangles; desktop 35–50K; mobile 12–20K. Facial loops and articulated hands receive different topology treatment from coat grids, hair cards and small fittings. Mobile back skull/neck simplification protects facial feature loops; rings, buttons and pupils have dedicated smaller meshes. There is no whole-character uniform decimation.

## Maps, bakes and compression

Editable extracted PNGs and metadata are in `art/textures/iona`. The master embeds them. Skin diffuse begins with the licensed 2K source; original tone, pore and roughness maps were authored at 4K. These additions do not turn the photograph into native 4K detail. The pinned Basis encoder caps a source image at 12M texels, so runtime cinematic face maps are 3K, within the approved 4K maximum. Cloth bakes are 2K; other cinematic sets are ≤2K. Desktop maps are ≤2K and mobile ≤1K. Small equipment wear maps use 512 pixels cinematic and 256 desktop/mobile.

The clothing sculpt has tangent-space normal and AO bakes, padded disjoint panel UV regions and a baked color atlas. Failed projection regions were repaired and the updated images explicitly repacked. The offline cloth study aids shaping; runtime motion uses skeletal clips. Original equipment wear maps distinguish leather, oxidized brass, iron and porcelain. Normals and cinematic hair opacity use UASTC with Zstandard. Suitable colors and packed material maps use ETC1S. Runtime/source paired browser captures are part of the validation evidence.

Hair preserves the authored alpha blending. A binary 0.35 cutoff was rejected after paired renders showed minified strands disappearing; retaining blending restores coverage but leaves card sorting/edge quality as an art-review concern.

## Rig and previews

The 63 deformation bones comprise the original 19, two clavicles, four arm-twist bones, 30 finger bones, two eyes and six additional coat bones. Licensed anatomical hand/wrist/finger weights are remapped and normalized; garment weights and preview motion are original work. `socket_lantern` and `socket_wake_hook` retain their hand parents. Clips remain `idle`, `walk`, `run`, `attack`, `dodge`; locomotion is in place, with 180 ms runtime transitions. The eye bones add restrained gaze motion. No gameplay authority, collision or combat effects attach to these previews.

The studio uses owned OrbitControls, optional animation pause, three camera targets and two light presets. It uses PBR equipment/eyes and the installed Three.js experimental SSS node material for cinematic skin, tested on both backends. Neutral studio has no bloom. Closing disposes the studio, controls, shadow/reflection targets and asset owner while retaining the courtyard's handles. Pending fetch bodies are abortable; late decoder results are disposed through the reference-counted cache.

## Legacy and art gate

`npm run assets:legacy` is the explicit old procedural generator. It can overwrite legacy Iona/environment sources and intermediates; it does not touch `iona-master.blend`. Do not use it for the authored rebuild.

Technical checks do not approve visual fidelity. Review the comparison gallery, clay/textured renders and actual browser captures. The face, swept groom, seams/wear, grips and secondary deformation must be reviewed against the concept. The candidate remains **awaiting art review**. Ash Quay reconstruction, Phase 2 mechanics and physical-phone performance remain separate.
