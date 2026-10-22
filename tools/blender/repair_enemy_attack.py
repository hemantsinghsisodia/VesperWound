"""Explicit authored revision. Never invoked by normal asset builds."""
import bpy, json, math
from pathlib import Path
from shutil import copy2
base=Path.cwd(); path=base/'art/source/zombie7-master.blend'
backup=base/'.cache/enemy-before.blend'
if not backup.exists(): copy2(path,backup)
bpy.ops.wm.open_mainfile(filepath=str(backup),load_ui=False)
scene=bpy.context.scene; rig=next(o for o in scene.objects if o.type=='ARMATURE')
for track in rig.animation_data.nla_tracks: track.mute=True
source=bpy.data.actions['Attack']; rig.animation_data.action=source;rig.animation_data.action_slot=source.slots[0]
start,end=source.frame_range; fps=scene.render.fps
# Preserve Tony Flanagan's right-hand strike, with deliberate anticipation and
# recovery. The shoulder turn is retained; the hips/legs remain planted.
knots=[(0,0),(12,.15),(24,.30),(30,.30),(39,.42),(46,.45),(66,.60),(86,.82),(101,1)]
poses=[]; planted={}
for frame in range(102):
 a,b=next(((a,b) for a,b in zip(knots,knots[1:]) if a[0]<=frame<=b[0]),(knots[-2],knots[-1]))
 fraction=a[1]+(b[1]-a[1])*(frame-a[0])/(b[0]-a[0]); f=start+(end-start)*fraction
 scene.frame_set(math.floor(f),subframe=f-math.floor(f));bpy.context.view_layer.update()
 pose={bone.name:bone.matrix_basis.copy() for bone in rig.pose.bones}
 if frame==0: planted={name:matrix for name,matrix in pose.items() if any(s in name for s in ['Hips','UpLeg','Leg','Foot','Toe'])}
 pose.update(planted);poses.append(pose)
# Change sample rate without changing the duration of any supplied other clip.
for action in bpy.data.actions:
 for layer in action.layers:
  for strip in layer.strips:
   for slot in action.slots:
    bag=strip.channelbag(slot)
    if bag:
     for curve in bag.fcurves:
      for point in curve.keyframe_points:
       point.co.x*=60/fps;point.handle_left.x*=60/fps;point.handle_right.x*=60/fps
scene.render.fps=60
rig.animation_data.action=None;bpy.data.actions.remove(source)
action=bpy.data.actions.new('Attack');rig.animation_data.action=action
for frame,pose in enumerate(poses):
 scene.frame_set(frame)
 for bone in rig.pose.bones:
  bone.rotation_mode='QUATERNION';bone.matrix_basis=pose[bone.name]
  bone.keyframe_insert('location',frame=frame,group=bone.name)
  bone.keyframe_insert('rotation_quaternion',frame=frame,group=bone.name)
  bone.keyframe_insert('scale',frame=frame,group=bone.name)
for layer in action.layers:
 for strip in layer.strips:
  for slot in action.slots:
   for curve in strip.channelbag(slot).fcurves:
    for point in curve.keyframe_points:point.interpolation='LINEAR'
scene['enemy_attack_revision']='2026-10-21: supplied right-hand strike retimed; anticipation held; planted hips/feet; saved 60 Hz action'
scene.frame_set(0)
bpy.ops.wm.save_as_mainfile(filepath=str(path))
spec={'duration':1.67,'active':[.65,.77],'directionLock':.25,'clipDuration':101/60,'mapping':[[0,0],[.65,39/60],[.77,46/60],[1.67,101/60]],'bone':'mixamorigRightHand','tipBone':'mixamorigRightHandMiddle1','radius':.08}
(base/'src/enemies/enemy-attack-motion.json').write_text(json.dumps(spec,indent=2)+'\n')
print('ENEMY_ATTACK_SAVED')
