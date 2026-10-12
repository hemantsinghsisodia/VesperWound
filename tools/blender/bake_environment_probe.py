"""Read-only panoramic reflection bake from the authored courtyard."""
import bpy, math
from pathlib import Path
root=Path.cwd()
bpy.ops.wm.open_mainfile(filepath=str(root/'art/source/ash-quay-district.blend'),load_ui=False)
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=16;scene.cycles.use_denoising=True
scene.render.resolution_x=512;scene.render.resolution_y=256;scene.render.resolution_percentage=100
scene.world.use_nodes=True
world=scene.world.node_tree.nodes.get('Background');world.inputs['Color'].default_value=(.25,.35,.48,1);world.inputs['Strength'].default_value=.7
bpy.ops.object.light_add(type='SUN',location=(-6,-8,15));sun=bpy.context.object;sun.rotation_euler=(.45,-.5,-.3);sun.data.energy=2.6;sun.data.angle=.2
bpy.ops.object.light_add(type='POINT',location=(-5.5,5.5,3));bpy.context.object.data.energy=110;bpy.context.object.data.color=(1,.55,.22)
bpy.ops.object.camera_add(location=(-2,-1,2.5),rotation=(math.pi/2,0,0))
camera=bpy.context.object;camera.data.type='PANO';camera.data.panorama_type='EQUIRECTANGULAR';scene.camera=camera
scene.view_settings.view_transform='Standard';scene.view_settings.look='None';scene.view_settings.exposure=0
out=root/'art/source/environment/reflection.png';out.parent.mkdir(parents=True,exist_ok=True)
scene.render.image_settings.file_format='PNG';scene.render.filepath=str(out)
bpy.ops.render.render(write_still=True)
print('ENVIRONMENT_PROBE_COMPLETE')
