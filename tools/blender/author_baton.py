"""Explicit one-time authoring. Never called by normal art builds."""
import bpy, math, json
from pathlib import Path
from mathutils import Vector, Quaternion, Matrix
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

# Offline two-bone IK fits the hand to deliberate windup/contact/recovery poses.
bpy.ops.object.empty_add(); target=bpy.context.object; target.name='Baton_Authoring_Wrist'
constraint=a.pose.bones['RightForeArm'].constraints.new('IK'); constraint.name='Offline baton reach'
constraint.target=target; constraint.chain_count=2; constraint.use_tail=True
bpy.ops.object.empty_add();thumb_target=bpy.context.object;thumb_target.name='Baton_Authoring_Thumb'
thumb_constraint=a.pose.bones['RightHandThumb3'].constraints.new('IK');thumb_constraint.target=thumb_target;thumb_constraint.chain_count=3;thumb_constraint.use_tail=True
paths={
 'Baton_Light1':[(0,(-.38,.08,1.32),(-.8,.1,.4)),(.22,(-.42,-.12,1.32),(-.7,-.5,.2)),(.28,(-.18,-.50,1.16),(.08,-1,.05)),(.34,(.12,-.38,1.16),(.7,-.6,.1)),(.6,(-.30,-.18,1.1),(.1,-.5,.8))],
 'Baton_Light2':[(0,(-.15,-.2,1.22),(.8,-.2,.2)),(.24,(.15,-.12,1.28),(.8,-.3,.1)),(.30,(-.10,-.52,1.18),(-.1,-1,.05)),(.37,(-.38,-.35,1.2),(-.8,-.5,.1)),(.65,(-.30,-.18,1.1),(.1,-.5,.8))],
 'Baton_Light3':[(0,(-.38,.02,1.45),(-.7,.1,.6)),(.28,(-.40,-.10,1.42),(-.5,-.5,.4)),(.35,(-.10,-.52,1.22),(0,-1,-.1)),(.42,(.15,-.35,1.1),(.7,-.5,-.2)),(.75,(-.30,-.18,1.1),(.1,-.5,.8))],
 'Baton_Heavy':[(0,(-.3,-.12,1.3),(0,-.4,.9)),(.30,(-.2,-.1,1.72),(0,.2,1)),(.44,(-.18,-.36,1.52),(0,-.6,.8)),(.52,(-.10,-.52,1.13),(0,-1,-.25)),(.59,(-.12,-.38,.94),(0,-.5,-.85)),(.95,(-.30,-.18,1.1),(.1,-.5,.8))],
}
def sample(rows,time):
    for left,right in zip(rows,rows[1:]):
        if time<=right[0]:
            f=max(0,min(1,(time-left[0])/(right[0]-left[0]))); f=f*f*(3-2*f)
            return Vector(left[1]).lerp(Vector(right[1]),f),Vector(left[2]).lerp(Vector(right[2]),f).normalized()
    return Vector(rows[-1][1]),Vector(rows[-1][2]).normalized()
clips=[('Baton_Idle','Sword_Idle',None),('Baton_Walk','Walk_Loop',None),('Baton_Run','Jog_Fwd_Loop',None),('Baton_Dodge','Roll',None),('Baton_Ward','Spell_Simple_Shoot',None),('Baton_Hit','Hit_Chest',None),('Baton_Death','Death01',None)]
clips += [(n,'Sword_Attack',p[-1][0]) for n,p in paths.items()]
source_fps=bpy.context.scene.render.fps
bpy.context.scene.render.fps=60
created=[]
for name,source,duration in clips:
    action,slot=originals[source]
    end=action.frame_range[1]; start=action.frame_range[0]
    seconds=duration if duration else (end-start)/source_fps
    frames=max(1,round(seconds*60)); baked=[]
    for frame in range(frames+1):
        time=frame/60
        a.animation_data.action=action; a.animation_data.action_slot=slot
        constraint.influence=0
        bpy.context.scene.frame_set(0,subframe=start+(end-start)*frame/frames)
        bpy.context.view_layer.update()
        if name in paths:
            wrist,shaft=sample(paths[name],time)
            target.location=wrist;constraint.influence=1;bpy.context.view_layer.update()
            hand=a.pose.bones['RightHand']; world=a.matrix_world@hand.matrix
            current=(world.to_quaternion()@axis).normalized()
            world_rotation=current.rotation_difference(shaft)@world.to_quaternion()
            desired=Matrix.LocRotScale(world.translation,world_rotation,Vector((1,1,1)))
            hand.matrix=a.matrix_world.inverted()@desired;bpy.context.view_layer.update()
        # Fingers are baked with a closed grip; no runtime IK or skeleton edits.
        for finger in ['Index','Middle','Ring','Pinky']:
            for joint,angle in [(1,.18),(2,.65),(3,.6)]:
                bone=a.pose.bones['RightHand%s%d'%(finger,joint)]
                bone.rotation_mode='QUATERNION';bone.rotation_quaternion=Quaternion((1,0,0),angle)
        thumb_target.location=a.matrix_world@a.pose.bones['RightHand'].matrix@(grip+Vector((.025,-.016,.026)))
        bpy.context.view_layer.update()
        evaluated=a.evaluated_get(bpy.context.evaluated_depsgraph_get())
        row={}
        for bone in a.pose.bones:
            e=evaluated.pose.bones[bone.name]
            rest=bone.bone.matrix_local
            parent=evaluated.pose.bones.get(bone.parent.name) if bone.parent else None
            basis=(rest.inverted()@bone.parent.bone.matrix_local@parent.matrix.inverted()@e.matrix) if parent else rest.inverted()@e.matrix
            loc,rot,scale=basis.decompose();row[bone.name]=(loc.copy(),rot.copy(),scale.copy())
        baked.append(row)
    constraint.influence=0
    output=bpy.data.actions.new(name);output.use_fake_user=True
    a.animation_data.action=output
    for frame,row in enumerate(baked):
        for bone in a.pose.bones:
            loc,rot,scale=row[bone.name];bone.rotation_mode='QUATERNION';bone.rotation_quaternion=rot;bone.location=loc;bone.scale=scale
            bone.keyframe_insert('rotation_quaternion',frame=frame)
            if bone.name=='Hips':bone.keyframe_insert('location',frame=frame)
    created.append((name,output,frames))
    print('AUTHORED',name,seconds)
a.pose.bones['RightForeArm'].constraints.remove(constraint);bpy.data.objects.remove(target,do_unlink=True)
a.pose.bones['RightHandThumb3'].constraints.remove(thumb_constraint);bpy.data.objects.remove(thumb_target,do_unlink=True)
for track in list(a.animation_data.nla_tracks):a.animation_data.nla_tracks.remove(track)
a.animation_data.action=None
for name,action,frames in created:
    track=a.animation_data.nla_tracks.new();track.name=name
    strip=track.strips.new(name,0,action);strip.action_slot=action.slots[0];strip.frame_end=frames
    track.mute=True
for track in a.animation_data.nla_tracks:track.mute=False
bpy.ops.wm.save_as_mainfile(filepath=str(base/'art/source/medic-baton-animations.blend'))
print('BATON_AUTHORING_COMPLETE')
