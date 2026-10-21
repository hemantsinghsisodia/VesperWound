"""Offline armed-action baking, shared by explicit authoring/repair only."""
import bpy, math
from mathutils import Vector, Quaternion, Matrix

def bake_armed_actions(a, originals, grip, axis, source_fps):
    a.animation_data.action=None
    for bone in a.pose.bones:bone.matrix_basis=Matrix.Identity(4)
    a.animation_data.action,a.animation_data.action_slot=originals['Sword_Idle']
    bpy.context.scene.frame_set(0);bpy.context.view_layer.update()
    guard={bone.name:bone.matrix_basis.decompose() for bone in a.pose.bones}
    # Solve a stable, outward/downward elbow plane offline. An unconstrained IK
    # pole can flip as the source sword action rotates under the authored path.
    rolls={};last_palm=None;last_shaft=None

    def joint_frame(direction,normal):
        y=direction.normalized();z=normal.cross(y).normalized();x=y.cross(z).normalized()
        return Matrix((x,y,z)).transposed()

    def aim_bone(bone, endpoint, normal):
        world=a.matrix_world@bone.matrix
        rotation=joint_frame(endpoint-world.translation,normal).to_quaternion()@Quaternion((0,1,0),rolls[bone.name])
        bone.matrix=a.matrix_world.inverted()@Matrix.LocRotScale(world.translation,rotation,world.to_scale())
        bpy.context.view_layer.update()

    def fit_arm(wrist,shaft):
        nonlocal last_palm,last_shaft
        upper=a.pose.bones['RightArm'];forearm=a.pose.bones['RightForeArm'];hand=a.pose.bones['RightHand']
        shoulder=a.matrix_world@upper.head
        if not rolls:
            source_elbow=a.matrix_world@forearm.head;source_wrist=a.matrix_world@hand.head
            normal=(source_elbow-shoulder).cross(source_wrist-source_elbow).normalized()
            for bone in [upper,forearm]:
                world=a.matrix_world@bone.matrix;y=(world.to_quaternion()@Vector((0,1,0))).normalized()
                x=joint_frame(y,normal).col[0];actual=world.to_quaternion()@Vector((1,0,0))
                rolls[bone.name]=math.atan2(y.dot(x.cross(actual)),x.dot(actual))
        upper_length=(a.matrix_world.to_3x3()@(upper.tail-upper.head)).length
        lower_length=(a.matrix_world.to_3x3()@(forearm.tail-forearm.head)).length
        direction=(wrist-shoulder).normalized()
        distance=min((wrist-shoulder).length,upper_length+lower_length-.005)
        distance=max(distance,abs(upper_length-lower_length)+.005)
        pole=Vector((-1,-.6,-.25))
        bend=(pole-direction*pole.dot(direction)).normalized()
        along=(upper_length**2+distance**2-lower_length**2)/(2*distance)
        elbow=shoulder+direction*along+bend*math.sqrt(max(0,upper_length**2-along**2))
        endpoint=shoulder+direction*distance
        normal=(elbow-shoulder).cross(endpoint-elbow).normalized()
        aim_bone(upper,elbow,normal)
        aim_bone(forearm,endpoint,normal)
        world=a.matrix_world@hand.matrix
        # Resolve rotation around the shaft from the forearm, so the palm follows
        # the arm instead of folding backward or spinning at a pole change.
        forward=world.translation-a.matrix_world@forearm.head;forward-=shaft*forward.dot(shaft)
        forward.normalize()
        if last_palm is not None:
            transported=last_shaft.rotation_difference(shaft)@last_palm
            twist=math.atan2(shaft.dot(transported.cross(forward)),transported.dot(forward))
            # At a nearly straight wrist, forearm projection is ambiguous. Limit
            # only wrist roll; the authored shaft/contact direction stays exact.
            forward=Quaternion(shaft,max(-.25,min(.25,twist)))@transported
        last_palm=forward.copy();last_shaft=shaft.copy()
        local_palm=Vector((0,1,0))-axis*axis.y;local_palm.normalize()
        local_frame=Matrix((axis,local_palm,axis.cross(local_palm))).transposed()
        world_frame=Matrix((shaft,forward,shaft.cross(forward))).transposed()
        rotation=(world_frame@local_frame.transposed()).to_quaternion()
        hand.matrix=a.matrix_world.inverted()@Matrix.LocRotScale(world.translation,rotation,world.to_scale())
        bpy.context.view_layer.update()
    bpy.ops.object.empty_add();thumb_target=bpy.context.object;thumb_target.name='Baton_Authoring_Thumb'
    thumb_constraint=a.pose.bones['RightHandThumb3'].constraints.new('IK');thumb_constraint.target=thumb_target;thumb_constraint.chain_count=3;thumb_constraint.use_tail=True;thumb_constraint.use_stretch=False
    # Blender world axes: -Y is character forward, Z is height. Shared guard
    # endpoints remove the previous discontinuity between individual swings.
    guard_wrist=(-.30,-.22,1.12);guard_shaft=(.05,-.5,.86)
    paths={
     'Baton_Light1':[(0,guard_wrist,guard_shaft),(.10,(-.37,-.17,1.26),(-.75,-.35,.55)),(.15,(-.32,-.30,1.24),(-.65,-.75,.12)),(.20,(.02,-.33,1.17),(.05,-1,0)),(.25,(.10,-.30,1.10),(.8,-.55,-.12)),(.45,guard_wrist,guard_shaft)],
     'Baton_Light2':[(0,guard_wrist,guard_shaft),(.11,(.06,-.30,1.23),(.8,-.45,.4)),(10/60,(.08,-.32,1.22),(.7,-.7,.1)),(.225,(-.08,-.33,1.18),(-.1,-1,0)),(17/60,(-.34,-.30,1.13),(-.8,-.55,-.1)),(.5,guard_wrist,guard_shaft)],
     'Baton_Light3':[(0,guard_wrist,guard_shaft),(.13,(-.35,-.16,1.42),(-.6,-.3,.75)),(.20,(-.32,-.28,1.34),(-.55,-.72,.42)),(16/60,(.02,-.33,1.16),(.1,-1,-.12)),(20/60,(.10,-.28,1.01),(.7,-.5,-.5)),(.6,guard_wrist,guard_shaft)],
     'Baton_Heavy':[(0,guard_wrist,guard_shaft),(.22,(-.23,-.15,1.62),(0,-.05,1)),(.35,(-.22,-.27,1.48),(0,-.6,.8)),(.425,(-.10,-.33,1.18),(0,-1,-.18)),(.5,(-.19,-.28,.99),(0,-.5,-.86)),(.8,guard_wrist,guard_shaft)],
    }
    def sample(rows,time):
        for left,right in zip(rows,rows[1:]):
            if time<=right[0]:
                f=max(0,min(1,(time-left[0])/(right[0]-left[0]))); f=f*f*(3-2*f)
                return Vector(left[1]).lerp(Vector(right[1]),f),Vector(left[2]).lerp(Vector(right[2]),f).normalized()
        return Vector(rows[-1][1]),Vector(rows[-1][2]).normalized()
    clips=[('Baton_Idle','Sword_Idle',None),('Baton_Walk','Walk_Loop',None),('Baton_Run','Jog_Fwd_Loop',None),('Baton_Dodge','Roll',None),('Baton_Ward','Spell_Simple_Shoot',None),('Baton_Hit','Hit_Chest',None),('Baton_Death','Death01',None)]
    clips += [(n,'Sword_Attack',p[-1][0]) for n,p in paths.items()]
    active={'Baton_Light1':(.15,.25),'Baton_Light2':(10/60,17/60),'Baton_Light3':(.2,20/60),'Baton_Heavy':(.35,.5)}

    def attack_phase(name,time,duration):
        begin,end=active[name]
        rows=[(0,0),(begin,.18),((begin+end)/2,.32),(end,.55),(duration,1)]
        for (t0,p0),(t1,p1) in zip(rows,rows[1:]):
            if time<=t1:
                f=max(0,min(1,(time-t0)/(t1-t0)))
                return p0+(p1-p0)*f
        return 1
    bpy.context.scene.render.fps=60
    created=[]
    for name,source,duration in clips:
        rolls.clear();last_palm=None;last_shaft=None
        action,slot=originals[source]
        end=action.frame_range[1]; start=action.frame_range[0]
        seconds=duration if duration else (end-start)/source_fps
        frames=max(1,round(seconds*60)); baked=[]
        for frame in range(frames+1):
            time=frame/60
            # Source actions omit some constant transforms. Do not let an
            # earlier solved/baked pose leak into these unkeyed channels.
            a.animation_data.action=None
            for bone in a.pose.bones:bone.matrix_basis=Matrix.Identity(4)
            a.animation_data.action=action; a.animation_data.action_slot=slot
            phase=attack_phase(name,time,seconds) if name in paths else frame/frames
            source_frame=start+(end-start)*phase
            whole=math.floor(source_frame)
            bpy.context.scene.frame_set(whole,subframe=source_frame-whole)
            bpy.context.view_layer.update()
            if name in paths:
                # Keep the supporting stance planted. Source sword locomotion
                # previously lifted a knee during the short baton attacks.
                for bone in a.pose.bones:
                    if bone.name in ['RightArm','RightForeArm','RightHand'] or bone.name.startswith('RightHand'):continue
                    loc,rot,scale=bone.matrix_basis.decompose();g_loc,g_rot,g_scale=guard[bone.name]
                    weight=.3 if bone.name.startswith('Spine') else 0
                    if bone.name.startswith('LeftArm') or bone.name.startswith('LeftForeArm'):weight=.1
                    bone.rotation_mode='QUATERNION';bone.rotation_quaternion=g_rot.slerp(rot,weight)
                    bone.location=g_loc;bone.scale=g_scale
                bpy.context.view_layer.update()
                wrist,shaft=sample(paths[name],time)
                fit_arm(wrist,shaft)
            elif name in ['Baton_Idle','Baton_Walk','Baton_Run']:
                # Retain the complete accepted leg cycles while carrying the
                # baton in front of the body, ready to enter the common guard.
                fit_arm(Vector(guard_wrist),Vector(guard_shaft).normalized())
            # Fingers are baked with a closed grip; no runtime IK or skeleton edits.
            for finger in ['Index','Middle','Ring','Pinky']:
                for joint,angle in [(1,.25),(2,.85),(3,.9)]:
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
        previous=bpy.data.actions.get(name)
        output=bpy.data.actions.new(name+'_rebaked');output.use_fake_user=True
        a.animation_data.action=output
        for frame,row in enumerate(baked):
            for bone in a.pose.bones:
                loc,rot,scale=row[bone.name];bone.rotation_mode='QUATERNION';bone.rotation_quaternion=rot;bone.location=loc;bone.scale=scale
                bone.keyframe_insert('rotation_quaternion',frame=frame)
                if bone.name=='Hips':bone.keyframe_insert('location',frame=frame)
        created.append((name,output,frames))
        if previous:
            bpy.data.actions.remove(previous,do_unlink=True)
        output.name=name
        print('AUTHORED',name,seconds)
    a.pose.bones['RightHandThumb3'].constraints.remove(thumb_constraint);bpy.data.objects.remove(thumb_target,do_unlink=True)
    for track in list(a.animation_data.nla_tracks):a.animation_data.nla_tracks.remove(track)
    a.animation_data.action=None
    for name,action,frames in created:
        track=a.animation_data.nla_tracks.new();track.name=name
        strip=track.strips.new(name,0,action);strip.action_slot=action.slots[0];strip.frame_end=frames
        track.mute=True
    for track in a.animation_data.nla_tracks:track.mute=False
