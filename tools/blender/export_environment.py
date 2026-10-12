"""Read-only derivative export from the saved authored environment master."""
import bpy
from pathlib import Path
root=Path.cwd()
bpy.ops.wm.open_mainfile(filepath=str(root/'art/source/ash-quay-district.blend'),load_ui=False)
bpy.ops.object.select_all(action='DESELECT')
for o in bpy.context.scene.objects:
    if o.type=='MESH' and not any(c.name.startswith(('90_','10_','11_')) for c in o.users_collection):
        o.hide_set(False);o.select_set(True)
out=root/'art/source/environment';out.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(out/'ash-quay.glb'),export_format='GLB',use_selection=True,
    export_yup=True,export_animations=False,export_materials='EXPORT',export_extras=True)
bpy.ops.object.select_all(action='DESELECT')
for o in bpy.context.scene.objects:
    if o.type=='MESH' and any(c.name.startswith(('10_','11_')) for c in o.users_collection):
        o.hide_set(False);o.select_set(True)
        if any(c.name.startswith('11_') for c in o.users_collection):o['cutaway']=True
bpy.ops.export_scene.gltf(filepath=str(out/'arrival-quay.glb'),export_format='GLB',use_selection=True,
    export_yup=True,export_animations=False,export_materials='EXPORT',export_extras=True)
print('ENVIRONMENT_EXPORT_COMPLETE')
