"""Read-only export of saved weapon and armed animation sources."""
import bpy,json
from pathlib import Path
from mathutils import Vector,Quaternion,Matrix
base=Path.cwd(); folder=base/'art/source/baton'
bpy.ops.wm.open_mainfile(filepath=str(base/'art/source/steel-baton.blend'),load_ui=False)
bpy.ops.export_scene.gltf(filepath=str(folder/'baton.glb'),export_format='GLB',export_yup=True,export_animations=False)
bpy.ops.wm.open_mainfile(filepath=str(base/'art/source/medic-baton-animations.blend'),load_ui=False)
bpy.ops.export_scene.gltf(filepath=str(folder/'animations.glb'),export_format='GLB',export_yup=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_skins=True,export_def_bones=False)
a=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
grip=json.loads(a['baton_grip']) if 'baton_grip' in a else json.loads((folder/'blender-grip.json').read_text())
transform=Matrix.LocRotScale(Vector(grip['position']),Quaternion(grip['quaternion']),Vector((1,1,1)))
paths={}
for track in a.animation_data.nla_tracks:track.mute=True
for track in a.animation_data.nla_tracks:
    if not track.name.startswith('Baton_Light') and track.name!='Baton_Heavy':continue
    strip=track.strips[0];a.animation_data.action=strip.action;a.animation_data.action_slot=strip.action_slot
    rows=[]
    for frame in range(round(strip.frame_end)+1):
        bpy.context.scene.frame_set(frame);bpy.context.view_layer.update()
        matrix=a.matrix_world@a.pose.bones['RightHand'].matrix@transform
        def point(z):
            v=matrix@Vector((0,0,z));return [round(v.x,5),round(v.z,5),round(-v.y,5)]
        rows.append({'time':frame/60,'base':point(.025),'tip':point(.423)})
    paths[track.name]=rows
(base/'src/player/baton-contact.json').write_text(json.dumps(paths,separators=(',',':')))
# Imported bones and Blender scene coordinate systems use the same local basis;
# GLTF changes the object-root basis, not the bone-local attachment coordinates.
q=Quaternion(grip['quaternion'])@Quaternion((1,0,0),1.5707963267948966)
runtime={'bone':grip['bone'],'position':grip['position'],'quaternion':[q.x,q.y,q.z,q.w]}
(base/'src/world/baton-grip.json').write_text(json.dumps(runtime,indent=2))
print('BATON_EXPORT_COMPLETE')
