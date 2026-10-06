"""Export saved animation authoring, without regenerating or saving the source."""
import bpy
from pathlib import Path
base = Path.cwd()
bpy.ops.wm.open_mainfile(filepath=str(base / 'art/source/medic-player-animations.blend'), load_ui=False)
out = base / 'art/source/medic/saved-animation-export.glb'
bpy.ops.export_scene.gltf(filepath=str(out), export_format='GLB', export_yup=True,
                          export_animations=True, export_animation_mode='NLA_TRACKS',
                          export_skins=True, export_def_bones=False, export_materials='EXPORT')
print('PLAYER_ANIMATION_EXPORT_COMPLETE', out)
