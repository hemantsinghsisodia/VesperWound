"""Read-only contact export using the same simulation-to-clip mapping as runtime."""
import bpy,json,math
from pathlib import Path
def export_contact():
 base=Path.cwd(); spec=json.loads((base/'src/enemies/enemy-attack-motion.json').read_text())
 rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
 for track in rig.animation_data.nla_tracks:track.mute=True
 action=bpy.data.actions['Attack'];rig.animation_data.action=action;rig.animation_data.action_slot=action.slots[0]
 rows=[]
 times=sorted(set([round(i/60,9) for i in range(101)]+[spec['active'][0],spec['active'][1],spec['duration']]))
 for time in times:
  a,b=next(((a,b) for a,b in zip(spec['mapping'],spec['mapping'][1:]) if a[0]<=time<=b[0]),(spec['mapping'][-2],spec['mapping'][-1]))
  clip=a[1]+(b[1]-a[1])*(time-a[0])/(b[0]-a[0]);frame=clip*bpy.context.scene.render.fps
  bpy.context.scene.frame_set(math.floor(frame),subframe=frame-math.floor(frame));bpy.context.view_layer.update()
  def point(name):
   p=rig.matrix_world@rig.pose.bones[name].head
   return [round(p.x,7),round(p.z,7),round(-p.y,7)]
  rows.append({'time':time,'base':point('mixamorig:RightHand'),'tip':point('mixamorig:RightHandMiddle1')})
 (base/'src/enemies/enemy-hand-contact.json').write_text(json.dumps(rows,separators=(',',':'))+'\n')
