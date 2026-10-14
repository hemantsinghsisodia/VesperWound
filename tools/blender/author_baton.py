"""Explicit one-time authoring. Never called by normal art builds."""
import bpy, math, json, sys
from pathlib import Path
from mathutils import Vector, Quaternion, Matrix
sys.path.insert(0,str(Path(__file__).resolve().parent))
base = Path.cwd()
folder = base / 'art/source/baton'
folder.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
steel = bpy.data.materials.new('Worn steel'); steel.use_nodes = True
bsdf = steel.node_tree.nodes.get('Principled BSDF')
bsdf.inputs['Base Color'].default_value = (.24,.29,.31,1)
bsdf.inputs['Metallic'].default_value = .85; bsdf.inputs['Roughness'].default_value = .38
wrap = bpy.data.materials.new('Dark grip'); wrap.use_nodes = True
bsdf = wrap.node_tree.nodes.get('Principled BSDF')
bsdf.inputs['Base Color'].default_value = (.027,.035,.032,1); bsdf.inputs['Roughness'].default_value = .82
parts=[]
def cylinder(name,radius,depth,z,material,vertices=16):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=depth,location=(0,0,z))
    o=bpy.context.object; o.name=name; o.data.materials.append(material); parts.append(o)
    for polygon in o.data.polygons: polygon.use_smooth=True
    return o
cylinder('Steel shaft',.018,.405,.215,steel)
cylinder('Wrapped grip',.022,.125,-.05,wrap)
for i in range(8): cylinder('Grip rib %02d'%i,.024,.004,-.105+i*.015,wrap,12)
cylinder('Pommel',.026,.014,-.12,steel)
cylinder('Grip collar',.026,.015,.02,steel)
bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8,radius=.021,location=(0,0,.402))
tip=bpy.context.object; tip.name='Rounded striking end'; tip.data.materials.append(steel); parts.append(tip)
for p in tip.data.polygons:p.use_smooth=True
bpy.ops.object.select_all(action='DESELECT')
for o in parts:o.select_set(True)
bpy.context.view_layer.objects.active=parts[0]; bpy.ops.object.join()
weapon=bpy.context.object; weapon.name='Steel_Baton'
bpy.context.scene.cursor.location=(0,0,0); bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
weapon['authorship']='Original VESPERWOUND steel baton'; weapon['length_metres']=.55
bpy.ops.wm.save_as_mainfile(filepath=str(base/'art/source/steel-baton.blend'))

# Copy the existing authored animation source. The accepted masters stay read-only.
bpy.ops.wm.open_mainfile(filepath=str(base/'art/source/medic-player-animations.blend'),load_ui=False)
a=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
originals={t.name:(t.strips[0].action,t.strips[0].action_slot) for t in a.animation_data.nla_tracks}
for t in a.animation_data.nla_tracks:t.mute=True
before=set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=str(base/'art/source/medic/baton-character.glb'))
imported=next(o for o in set(bpy.data.objects)-before if o.type=='ARMATURE')
for t in imported.animation_data.nla_tracks:
    if t.name in ['Sword_Idle','Sword_Attack']: originals[t.name]=(t.strips[0].action,t.strips[0].action_slot)
for o in set(bpy.data.objects)-before:bpy.data.objects.remove(o,do_unlink=True)
for action,slot in originals.values():action.use_fake_user=True

# Attachment coordinates are in the hand's local space. Shaft runs through the palm.
a.animation_data.action=originals['Idle_Loop'][0]; a.animation_data.action_slot=originals['Idle_Loop'][1]
bpy.context.scene.frame_set(1); bpy.context.view_layer.update()
h=a.pose.bones['RightHand']; inv=h.matrix.inverted()
index=inv@a.pose.bones['RightHandIndex1'].head
pinky=inv@a.pose.bones['RightHandPinky1'].head
middle=inv@a.pose.bones['RightHandMiddle1'].head
axis=(index-pinky).normalized()
grip=middle+Vector((.01,.03,.04))
grip_rotation=Vector((0,0,1)).rotation_difference(axis)
metadata={'bone':'RightHand','position':list(grip),'quaternion':list(grip_rotation),'shaftBase':-.127,'shaftTip':.423}
a['baton_grip']=json.dumps(metadata)
(folder/'blender-grip.json').write_text(json.dumps(metadata,indent=2))

from baton_animation_authoring import bake_armed_actions
bake_armed_actions(a, originals, grip, axis, bpy.context.scene.render.fps)
bpy.ops.wm.save_as_mainfile(filepath=str(base/'art/source/medic-baton-animations.blend'))
print('BATON_AUTHORING_COMPLETE')
