"""Read-only exports from the saved authored enemy master."""
import bpy, json, sys
from pathlib import Path
base = Path.cwd()
sys.path.insert(0,str(base/'tools/blender'))
from enemy_contact import export_contact
bpy.ops.wm.open_mainfile(filepath=str(base/'art/source/zombie7-master.blend'), load_ui=False)
export_contact()
out = base/'art/source/zombie7'; out.mkdir(parents=True,exist_ok=True)
for tier in ['source','desktop','mobile']:
    for obj in bpy.context.scene.objects:
        obj.hide_set(False)
        if obj.type == 'MESH':
            for mod in obj.modifiers:
                if mod.type == 'WELD':
                    mod.show_viewport = mod.show_render = tier != 'source'
                if mod.type == 'DECIMATE':
                    mod.show_viewport = mod.show_render = mod.name == ('Desktop_6K' if tier == 'desktop' else 'Mobile_2K' if tier == 'mobile' else '')
    bpy.ops.export_scene.gltf(filepath=str(out/f'{tier}.glb'),export_format='GLB',export_yup=True,
        export_animations=True,export_animation_mode='ACTIONS',export_skins=True,export_def_bones=False,
        export_apply=True,export_all_influences=False,export_materials='EXPORT')
print('ENEMY_EXPORT_COMPLETE')
