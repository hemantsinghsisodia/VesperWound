"""Read-only export from the saved Medic master."""
import bpy
from pathlib import Path
base = Path.cwd()
bpy.ops.wm.open_mainfile(filepath=str(base / 'art/source/medic-master.blend'), load_ui=False)
for obj in bpy.context.scene.objects: obj.hide_set(False)
bpy.ops.object.select_all(action='DESELECT')
for obj in bpy.context.scene.objects:
    if obj.type in {'MESH', 'ARMATURE', 'EMPTY'}: obj.select_set(True)
out = base / 'art/source/medic/character.glb'; out.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(out), export_format='GLB', use_selection=True, export_yup=True,
                          export_animations=True, export_skins=True, export_def_bones=False,
                          export_all_influences=False, export_materials='EXPORT')
if not out.exists(): raise RuntimeError('Medic export was not written')
print('MEDIC_EXPORT_COMPLETE', out)
