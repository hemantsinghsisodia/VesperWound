# Steel baton pickup implementation

Medic remains the accepted imported character. The original steel baton and eleven armed actions are saved separately in `art/source/steel-baton.blend` and `art/source/medic-baton-animations.blend`. Previous character and unarmed animation sources remain unchanged.

The baton is 55 cm long, with two materials and no texture downloads. `RightHand` attachment metadata is stored in the armed master; a GLTF basis correction accounts for the weapon mesh's exported +Y shaft. Closed fingers and offline thumb/arm IK are baked into the saved actions. Runtime has no IK or cloth simulation. Normal builds export saved masters without saving them and verify their fingerprints.

`WeaponPickup` owns request generations and fixed-tick equip validation. It rejects loading completions after moving away, changed player generations or scene transitions. App-owned optional asset loading supplies clips before presentation follows the equipped state. Failure retains the ground model and unarmed gameplay. `PlayerSimulation` owns the equipped weapon and keeps it during ordinary resets; a new page/session restores the pickup.

Combat styles provide their own attack and locomotion definitions. The original unarmed attacks and clips remain available before pickup. Armed contact poses are exported at 60 Hz into immutable CPU data, transformed by simulated facing/position and sampled between fixed ticks with obstruction checks and per-target deduplication. Animation playback observes this clock; damage does not consult scene objects or animation callbacks.

Each scene owns its baton clones and marker resources; shared model handles own geometry and materials. The optional animation manager remains session-owned after pickup. Quality replacement and studio inspection install the already owned armed clips on the new actor. View disposal never resets equipment. Leaving a session cancels outstanding work, disposes late results, releases handles and destroys managers.

The weapon model counts against every initial art tier; the selected-on-pickup animation pack has its separate 512 KiB ceiling. Mobile never needs an inspection asset to equip the weapon.
