"""Explicit review fix: recess the old court floor beneath the authored flags.

Run once on the saved source; normal exports remain read-only.
"""
import bpy
from pathlib import Path
from mathutils import Vector

root = Path.cwd()
master = root / 'art/source/ash-quay-district.blend'
bpy.ops.wm.open_mainfile(filepath=str(master), load_ui=False)
scene = bpy.context.scene
if scene.get('paving_depth_corrected'):
    raise RuntimeError('Paving depth already corrected; edit the saved master instead.')
floor = next(o for o in scene.objects if o.name == 'Wet scanned paving')
top = max((floor.matrix_world @ Vector(v)).z for v in floor.bound_box)
floor.location.z += .015 - top
scene['paving_depth_corrected'] = True
bpy.ops.wm.save_as_mainfile(filepath=str(master), compress=True)
print('PAVING_DEPTH_CORRECTED', top, '->', .015)
