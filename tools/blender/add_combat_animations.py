"""Append two retargeted actions to the saved master; retain existing authoring."""
import bpy, shutil
from pathlib import Path
base = Path.cwd()
master = base / 'art/source/medic-player-animations.blend'
backup = base / 'art/archive/phase2/medic-player-animations.blend'
backup.parent.mkdir(parents=True, exist_ok=True)
if not backup.exists(): shutil.copy2(master, backup)
bpy.ops.wm.open_mainfile(filepath=str(master), load_ui=False)
armature = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
before = set(bpy.data.objects)
existing = {t.name for t in armature.animation_data.nla_tracks}
required = {'Punch_Jab', 'Spell_Simple_Shoot'}
if required & existing: raise RuntimeError('Combat actions already exist; do not overwrite authored changes')
bpy.ops.import_scene.gltf(filepath=str(base / 'art/source/medic/combat-character.glb'))
added = set(bpy.data.objects) - before
imported = next(o for o in added if o.type == 'ARMATURE')
copied = set()
for track in imported.animation_data.nla_tracks:
    if track.name not in required: continue
    target = armature.animation_data.nla_tracks.new()
    target.name = track.name
    for strip in track.strips:
        action = strip.action
        action.use_fake_user = True
        saved = target.strips.new(track.name, int(strip.frame_start), action)
        if len(action.slots): saved.action_slot = action.slots[0]
        saved.frame_end = strip.frame_end
    copied.add(track.name)
if copied != required: raise RuntimeError(f'Missing imported actions: {required-copied}')
for obj in added: bpy.data.objects.remove(obj, do_unlink=True)
bpy.ops.wm.save_as_mainfile(filepath=str(master))
print('COMBAT_ACTIONS_APPENDED', sorted(copied), 'previous tracks', sorted(existing))
