"""Read-only neutral Blender source evidence; never saves the master."""
import bpy, json
from pathlib import Path
from mathutils import Vector
base=Path.cwd();out=base/'docs/qa/phase4a/blender-source';out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(base/'art/source/zombie7-master.blend'),load_ui=False)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=12;scene.cycles.use_denoising=True
scene.render.resolution_x=720;scene.render.resolution_y=900;scene.render.resolution_percentage=100
scene.world=scene.world or bpy.data.worlds.new('Neutral Studio')
scene.world.color=(.15,.15,.15);scene.view_settings.view_transform='AgX'
rig=next(o for o in scene.objects if o.type=='ARMATURE')
rig.animation_data.action=bpy.data.actions['Idle'];rig.animation_data.action_slot=rig.animation_data.action.slots[0]
for track in rig.animation_data.nla_tracks:track.mute=True
scene.frame_set(0);bpy.context.view_layer.update()
points=[];deps=bpy.context.evaluated_depsgraph_get()
for obj in list(scene.objects):
    if obj.type!='MESH':continue
    evaluated=obj.evaluated_get(deps);mesh=evaluated.to_mesh()
    referenced={i for face in mesh.polygons for i in face.vertices}
    points.extend(evaluated.matrix_world@mesh.vertices[i].co for i in referenced);evaluated.to_mesh_clear()
raw_bounds={'bottom':min(p.z for p in points),'top':max(p.z for p in points)}
# Importer geometry includes non-rendering bound artefacts. Use the measured
# animated browser skin extents for matching camera framing, without edits.
bottom=0;top=1.8;height=top-bottom
def aim(obj,target):obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()
for position,energy,size in [((-2.5,-3.5,3.5),350,3),((2,-2,2.5),200,3),((0,2,3),300,2)]:
    bpy.ops.object.light_add(type='AREA',location=position);light=bpy.context.object;light.data.energy=energy;light.data.shape='DISK';light.data.size=size;aim(light,(0,0,bottom+height/2))
bpy.ops.object.camera_add();camera=bpy.context.object;scene.camera=camera;camera.data.type='ORTHO'
mid=bottom+height/2
views=[('front',(0,-4,mid),(0,0,mid),height*1.15),('profile',(4,0,mid),(0,0,mid),height*1.15),('back',(0,4,mid),(0,0,mid),height*1.15),('three-quarter',(2.8,-4,mid),(0,0,mid),height*1.15),('face',(0,-3,bottom+height*.88),(0,0,bottom+height*.88),height*.33),('hands',(0,-3,bottom+height*.55),(0,0,bottom+height*.55),height*.65),('feet',(0,-3,bottom+height*.1),(0,0,bottom+height*.1),height*.4)]
for name,position,target,scale in views:
    camera.location=position;camera.data.ortho_scale=scale;aim(camera,target);scene.render.filepath=str(out/(name+'.png'));bpy.ops.render.render(write_still=True)
(out/'render.json').write_text(json.dumps({'framing':{'bottom':bottom,'top':top,'height':height,'basis':'Measured rendered Idle skin in browser'},'rawImporterGeometryBounds':raw_bounds,'engine':'Cycles','samples':12,'source':'art/source/zombie7-master.blend','masterModified':False},indent=2))
print('ENEMY_SOURCE_CAPTURES_COMPLETE')
