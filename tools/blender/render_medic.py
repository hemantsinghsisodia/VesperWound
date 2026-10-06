"""Neutral source evidence; never saves changes to the Medic master."""
import bpy, math
from pathlib import Path
from mathutils import Vector
base = Path.cwd(); out = base / 'docs/qa/medic/source'; out.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(base / 'art/source/medic-master.blend'), load_ui=False)
scene = bpy.context.scene; scene.render.engine = 'CYCLES'; scene.cycles.samples = 24; scene.cycles.use_denoising = True
scene.render.resolution_x = 720; scene.render.resolution_y = 900; scene.render.resolution_percentage = 100
scene.world.color = (.15, .15, .15); scene.view_settings.view_transform = 'AgX'
def aim(obj, target): obj.rotation_euler = (Vector(target) - obj.location).to_track_quat('-Z', 'Y').to_euler()
for position, energy, size in [((-2.5,-3.5,3.5),350,3),((2,-2,2.5),200,3),((0,2,3),300,2)]:
    bpy.ops.object.light_add(type='AREA', location=position); light = bpy.context.object; light.data.energy=energy; light.data.shape='DISK'; light.data.size=size; aim(light,(0,0,.9))
bpy.ops.object.camera_add(); camera=bpy.context.object; scene.camera=camera; camera.data.type='ORTHO'
views = [('front',(0,-4,.95),(0,0,.9),2.1),('profile',(4,0,.95),(0,0,.9),2.1),('back',(0,4,.95),(0,0,.9),2.1),('three-quarter',(2.8,-4,1.0),(0,0,.9),2.1),
         ('portrait',(0,-3,1.67),(0,0,1.64),.48),('hands',(0,-3,1),(0,0,1),1.1),('boots',(0,-3,.2),(0,0,.2),.65),('equipment',(.8,-3,.85),(.2,0,.85),.65)]
for name, position, target, scale in views:
    if (out / (name+'.png')).exists(): continue
    camera.location=position; camera.data.ortho_scale=scale; aim(camera,target); scene.render.filepath=str(out/(name+'.png')); bpy.ops.render.render(write_still=True)
print('MEDIC_SOURCE_CAPTURES_COMPLETE')
