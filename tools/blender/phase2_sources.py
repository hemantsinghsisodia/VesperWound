"""Preserve accepted art; inventory solid courtyard objects and save animation source."""
import bpy, json
from pathlib import Path
from mathutils import Vector
base = Path.cwd()
bpy.ops.wm.open_mainfile(filepath=str(base / 'art/source/ash-quay-desktop.blend'), load_ui=False)
rows = []
for obj in bpy.context.scene.objects:
    if obj.type != 'MESH': continue
    corners = [obj.matrix_world @ Vector(c) for c in obj.bound_box]
    minimum = [min(v[i] for v in corners) for i in range(3)]
    maximum = [max(v[i] for v in corners) for i in range(3)]
    rows.append({'name': obj.name, 'min': minimum, 'max': maximum})
out = base / 'art/source/medic/courtyard-solids.json'
out.write_text(json.dumps(rows, indent=2))
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(base / 'art/source/medic/player-character.glb'))
bpy.ops.wm.save_as_mainfile(filepath=str(base / 'art/source/medic-player-animations.blend'))
print('PHASE2_SOURCE_COMPLETE', len(rows), 'courtyard objects')
