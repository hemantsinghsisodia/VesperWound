"""Final asymmetric fringe and restrained eye motion in the authored source."""
import bpy,sys,math
from pathlib import Path
from mathutils import Vector,Quaternion
sys.path.insert(0,str(Path(__file__).parent))
from iona_geometry import hair_lock,curve
ROOT=Path(__file__).resolve().parents[2]
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'art/source/iona-master.blend'))
rig=bpy.data.objects['Iona_Rig']; hair=bpy.data.materials['Iona.Hair']
for tier,count,steps,width in [('cinematic',35,20,.009),('desktop',7,12,.018),('mobile',5,8,.020)]:
    col=bpy.data.collections['Export_'+tier]
    for i in range(count):
        offset=(i/(count-1)-.5)*.022
        points=[Vector((.022+offset,-.074,1.739)),Vector((.005+offset,-.124,1.732)),Vector((-.038+offset,-.151,1.698)),Vector((-.068+offset*.35,-.145,1.66)),Vector((-.079+offset*.12,-.137,1.622)),Vector((-.075+offset*.12,-.144,1.587-(i%3)*.004))]
        o=hair_lock(points,width,steps,hair,col,'Asymmetric loose swept fringe / '+tier); o.parent=rig; o['iona_bone']='head'
        g=o.vertex_groups.new(name='head'); g.add(list(range(len(o.data.vertices))),1,'REPLACE'); m=o.modifiers.new('Fringe deformation','ARMATURE'); m.object=rig
        if tier=='cinematic': curve('Editable asymmetric fringe groom',points,.0004,hair,bpy.data.collections['Hair groom — editable curves'])
for action in bpy.data.actions:
    rig.animation_data.action=action; start,end=map(int,action.frame_range)
    for frame in range(start,end+1):
        phase=(frame-start)/max(1,end-start)*math.tau
        for name in ['eye.L','eye.R']:
            bone=rig.pose.bones[name]; rest=bone.bone.matrix_local.to_quaternion()
            bone.rotation_quaternion=rest.inverted()@Quaternion(Vector((0,0,1)),.022*math.sin(phase))@rest
            bone.keyframe_insert(data_path='rotation_quaternion',frame=frame)
rig.animation_data.action=bpy.data.actions['idle']; bpy.context.scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'art/source/iona-master.blend')); print('IONA_FRINGE_COMPLETE')
