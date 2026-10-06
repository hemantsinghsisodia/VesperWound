import bpy, json
from pathlib import Path
from mathutils import Vector

base = Path.cwd()
bpy.ops.wm.open_mainfile(filepath=str(base / 'art/imports/medic/original/source/the_medic.blend'), load_ui=False)
deps = bpy.context.evaluated_depsgraph_get()
objects = []
for obj in bpy.data.objects:
    item = {'name': obj.name, 'type': obj.type, 'location': list(obj.location), 'scale': list(obj.scale), 'modifiers': [m.type for m in obj.modifiers]}
    if obj.type == 'MESH':
        evaluated = obj.evaluated_get(deps); mesh = evaluated.to_mesh(); mesh.calc_loop_triangles()
        item.update(triangles=len(mesh.loop_triangles), materials=[m.name if m else None for m in obj.data.materials], groups=[g.name for g in obj.vertex_groups])
        item['bounds'] = [list(obj.matrix_world @ Vector(c)) for c in obj.bound_box]
        evaluated.to_mesh_clear()
    if obj.type == 'ARMATURE': item['bones'] = [b.name for b in obj.data.bones]
    if obj.animation_data:
        item['action'] = obj.animation_data.action.name if obj.animation_data.action else None
        item['nla'] = [{'name': t.name, 'strips': [{'name': s.name, 'action': s.action.name if s.action else None, 'frames': [s.frame_start, s.frame_end]} for s in t.strips]} for t in obj.animation_data.nla_tracks]
    objects.append(item)
record = {'objects': objects, 'actions': [{'name': a.name, 'frames': list(a.frame_range)} for a in bpy.data.actions],
          'images': [{'name': i.name, 'path': i.filepath, 'packed': bool(i.packed_file), 'size': list(i.size)} for i in bpy.data.images],
          'materials': [{'name': m.name, 'nodes': [{'name': n.name, 'type': n.type, 'image': n.image.name if n.type == 'TEX_IMAGE' and n.image else None} for n in m.node_tree.nodes] if m.use_nodes else []} for m in bpy.data.materials],
          'fps': bpy.context.scene.render.fps, 'frames': [bpy.context.scene.frame_start, bpy.context.scene.frame_end]}
(base / 'docs/qa/medic/source-inventory.json').write_text(json.dumps(record, indent=2))
print('MEDIC_INVENTORY_COMPLETE', json.dumps({'meshes': sum(o['type'] == 'MESH' for o in objects), 'triangles': sum(o.get('triangles', 0) for o in objects), 'actions': record['actions']}))
