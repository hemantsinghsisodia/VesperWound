"""Inventory original assets with automatic script execution disabled."""
import bpy, json
from pathlib import Path
from mathutils import Vector
root = Path.cwd()
records = {}
for key, path in [('baseline', 'art/source/ash-quay-desktop.blend'), ('facade', 'art/imports/environment/modular_factory_facade/source.blend'), ('pipes', 'art/imports/environment/modular_industrial_pipes_01/source.blend')]:
    if not (root / path).exists(): continue
    bpy.ops.wm.open_mainfile(filepath=str(root/path), load_ui=False)
    rows = []
    for o in bpy.context.scene.objects:
        if o.type != 'MESH': continue
        corners = [o.matrix_world @ Vector(c) for c in o.bound_box]
        rows.append({'name': o.name, 'location': list(o.location), 'dimensions': list(o.dimensions), 'minimum': [min(c[i] for c in corners) for i in range(3)], 'maximum': [max(c[i] for c in corners) for i in range(3)], 'materials': [m.name if m else '' for m in o.data.materials], 'polygons': len(o.data.polygons)})
    records[key] = rows
folder = root/'art/work'; folder.mkdir(parents=True, exist_ok=True)
(folder/'environment-inventory.json').write_text(json.dumps(records, indent=2))
print('ENVIRONMENT_INVENTORY_COMPLETE', {k: len(v) for k,v in records.items()})
