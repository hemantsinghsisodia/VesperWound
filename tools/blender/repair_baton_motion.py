"""Explicit source repair. Never called by the normal, read-only asset build.

Rebake the saved CC0 source actions across their complete frame ranges. Preserve
the accepted mesh, rig, hand attachment and manually authored strike paths.
"""
import bpy, json, sys
from pathlib import Path
from mathutils import Vector, Quaternion
sys.path.insert(0,str(Path(__file__).resolve().parent))
from baton_animation_authoring import bake_armed_actions

path=Path.cwd()/'art/source/medic-baton-animations.blend'
bpy.ops.wm.open_mainfile(filepath=str(path),load_ui=False,use_scripts=False)
a=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
sources=['Sword_Idle','Sword_Attack','Walk_Loop','Jog_Fwd_Loop','Roll','Spell_Simple_Shoot','Hit_Chest','Death01']
originals={name:(bpy.data.actions[name],bpy.data.actions[name].slots[0]) for name in sources}
# Derive the imported time base from the saved walk duration, rather than from
# the 60 Hz output scene. The retained source actions use 24 frames/second.
walk=bpy.data.actions['Baton_Walk']
seconds=(walk.frame_range[1]-walk.frame_range[0])/bpy.context.scene.render.fps
source=originals['Walk_Loop'][0]
source_fps=(source.frame_range[1]-source.frame_range[0])/seconds
assert abs(source_fps-24)<.001, 'Unexpected source time base; inspect before authoring'
for track in a.animation_data.nla_tracks:track.mute=True
grip=json.loads(a['baton_grip'])
axis=Quaternion(grip['quaternion'])@Vector((0,0,1))
bake_armed_actions(a,originals,Vector(grip['position']),axis,source_fps)
a['armed_motion_repair']='Full source-frame evaluation, stable elbow plane, forearm-aligned wrist twist and closed grip, 2026-10-14'
bpy.ops.wm.save_as_mainfile(filepath=str(path))
print('BATON_MOTION_REPAIR_COMPLETE')
