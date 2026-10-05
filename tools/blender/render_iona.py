"""Render actual master geometry for comparison; never writes the source .blend."""
import bpy,math,sys
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
source=ROOT/(args[0] if args else 'art/work/iona-authoring.blend')
bpy.ops.wm.open_mainfile(filepath=str(source))
for image in bpy.data.images:
    path=bpy.path.abspath(image.filepath).replace('\\','/')
    if not Path(path).exists() and '/downloads/' in path:
        replacement=ROOT/'art/downloads'/path.split('/downloads/',1)[1]
        if replacement.exists(): image.filepath=str(replacement); image.reload()
scene=bpy.context.scene; scene.render.engine='CYCLES'; scene.cycles.samples=24; scene.cycles.use_denoising=True
scene.render.resolution_x=1100; scene.render.resolution_y=1200; scene.render.resolution_percentage=100
scene.world.color=(.15,.15,.15); scene.view_settings.view_transform='AgX'
for c in bpy.data.collections:
    c.hide_render=not(c.name in ['Export_cinematic','Rig and attachments','Collection'])
scene.frame_set(1)
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,.0)); floor=bpy.context.object
m=bpy.data.materials.new('Studio neutral floor'); m.diffuse_color=(.12,.13,.14,1); floor.data.materials.append(m)
def aim(o,target): o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
for pos,power,size,color in [((-2,-3,4),350,3,(1,.94,.87)),((2,-1,2.5),140,2,(.83,.91,1)),((0,2,3),240,2,(1,1,1))]:
    bpy.ops.object.light_add(type='AREA',location=pos); light=bpy.context.object; light.data.energy=power; light.data.shape='DISK'; light.data.size=size; light.data.color=color; aim(light,(0,0,1))
bpy.ops.object.camera_add(); cam=bpy.context.object; scene.camera=cam; cam.data.type='ORTHO'; cam.data.ortho_scale=2.08
out=ROOT/(args[1] if len(args)>1 else 'docs/qa/iona-rebuild'); out.mkdir(parents=True,exist_ok=True)
views=[('front',(0,-4,1.05),(0,0,.95),2.08),('profile',(4,0,1.05),(0,0,.95),2.08),('back',(0,4,1.05),(0,0,.95),2.08),('three-quarter',(2,-4,1.1),(0,0,.95),2.08),('face',(.35,-2,1.65),(0,-.02,1.615),.40),('hair',(1,1,2),(0,0,1.68),.38),('hand',(.7,-2,1.18),(.37,-.17,1.06),.32),('boot',(1,-2,.30),(.09,-.04,.20),.48),('lantern',(.8,-2,1),(.38,-.2,.86),.48),('wake-hook',(-.7,-2,.27),(-.35,-.2,.24),.42)]
for name,pos,target,scale in views:
    cam.location=pos; aim(cam,target); cam.data.ortho_scale=scale
    scene.render.filepath=str(out/(name+'-neutral.png')); bpy.ops.render.render(write_still=True)
clay=bpy.data.materials.new('Neutral clay inspection'); clay.use_nodes=True
clay.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.32,.32,.32,1)
clay.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.7
bpy.context.view_layer.material_override=clay
for name,pos,target,scale in views[:4]:
    cam.location=pos; aim(cam,target); cam.data.ortho_scale=scale
    scene.render.filepath=str(out/(name+'-clay.png')); bpy.ops.render.render(write_still=True)
print('IONA_RENDER_COMPLETE')
