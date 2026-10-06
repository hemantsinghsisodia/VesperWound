"""One-time packaging of the imported source; never called by the normal build."""
import bpy, json
from pathlib import Path
from mathutils import Vector
base = Path.cwd()
bpy.ops.wm.open_mainfile(filepath=str(base / 'art/imports/medic/original/source/the_medic.blend'), load_ui=False)
meshes = [o for o in bpy.data.objects if o.type == 'MESH']
points = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
bottom = min(p.z for p in points); top = max(p.z for p in points)
scale = 1.8 / (top - bottom)
root = bpy.data.objects.new('Medic_Normalization', None); bpy.context.scene.collection.objects.link(root)
for obj in list(bpy.context.scene.objects):
    if obj != root and obj.parent is None:
        world = obj.matrix_world.copy(); obj.parent = root; obj.matrix_world = world
root.scale = (scale,) * 3; root.location.z = -bottom * scale
bpy.context.view_layer.update()
# All source images are packed. Retain them at their supplied native resolution.
bpy.ops.file.pack_all()
source = base / 'art/source/medic-master.blend'
bpy.context.scene['asset_source'] = 'SciFi Medic - Rigged by Tony Flanagan; CC BY 4.0'
bpy.context.scene['normalization_scale'] = scale
bpy.ops.wm.save_as_mainfile(filepath=str(source))
(base / 'docs/qa/medic/normalization.json').write_text(json.dumps({'height': 1.8, 'scale': scale, 'sourceBottom': bottom, 'sourceTop': top, 'rigBones': len(bpy.data.objects['Armature'].data.bones), 'suppliedAnimations': []}, indent=2))
print('MEDIC_MASTER_SAVED', source)
