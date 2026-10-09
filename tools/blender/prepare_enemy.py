"""One-time import/authoring. Normal exports never run this script."""
import bpy, json, math
from pathlib import Path
from mathutils import Vector
base = Path.cwd()
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(base / 'art/imports/zombie7/original/source/zom_7.glb'))
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
rig = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
rig.animation_data.action = bpy.data.actions['Idle']
rig.animation_data.action_slot = rig.animation_data.action.slots[0]
for track in rig.animation_data.nla_tracks: track.mute = True
bpy.context.scene.frame_set(0, subframe=.8)
bpy.context.view_layer.update()
points = []
deps = bpy.context.evaluated_depsgraph_get()
for obj in meshes:
    evaluated = obj.evaluated_get(deps); mesh = evaluated.to_mesh()
    referenced={i for face in mesh.polygons for i in face.vertices}
    points.extend(evaluated.matrix_world @ mesh.vertices[i].co for i in referenced)
    evaluated.to_mesh_clear()
bottom = min(p.z for p in points); top = max(p.z for p in points)
root = bpy.data.objects.new('Zombie7_Normalization', None); bpy.context.scene.collection.objects.link(root)
for obj in list(bpy.context.scene.objects):
    if obj != root and obj.parent is None:
        world = obj.matrix_world.copy(); obj.parent = root; obj.matrix_world = world
scale = 1.8 / (top - bottom); root.scale = (scale,) * 3; root.location.z = -bottom * scale
# Horizontal motion is removed from the hips curve, preserving vertical and limb motion.
inventory = []
for action in bpy.data.actions:
    for slot in action.slots:
        for layer in action.layers:
            for strip in layer.strips:
                bag = strip.channelbag(slot)
                if not bag: continue
                for curve in bag.fcurves:
                    if 'Hips' in curve.data_path and curve.data_path.endswith('location') and curve.array_index in (0, 2):
                        origin = curve.keyframe_points[0].co.y if curve.keyframe_points else 0
                        for point in curve.keyframe_points: point.co.y = origin
    inventory.append({'name': action.name, 'frames': list(action.frame_range)})
# Saved derivatives use weighted regional reduction, retaining face and hands longer.
for obj in meshes:
    group = obj.vertex_groups.new(name='Reduction_PreserveFaceHands')
    names={g.index:g.name for g in obj.vertex_groups}
    for v in obj.data.vertices:
        anatomical=max([g.weight for g in v.groups if g.group!=group.index and any(s in names[g.group] for s in ['Head','Neck','Hand'])]+[0])
        group.add([v.index], .85 if anatomical>.2 or obj.name=='Eyes' else .15, 'REPLACE')
    weld=obj.modifiers.new('Export_SeamWeld','WELD');weld.merge_threshold=.00001;weld.show_viewport=weld.show_render=False
    for name, ratio in [('Desktop_6K', .278), ('Mobile_2K', .088)]:
        mod = obj.modifiers.new(name, 'DECIMATE'); mod.ratio = ratio
        mod.vertex_group = group.name; mod.vertex_group_factor = .75; mod.use_collapse_triangulate = True
        mod.invert_vertex_group=True
        mod.show_viewport = False; mod.show_render = False
bpy.ops.file.pack_all()
bpy.context.scene['asset_source'] = 'Zombie Number 7 - Animated by Tony Flanagan; CC BY 4.0'
bpy.context.scene['source_height'] = top-bottom
bpy.context.scene['normalization_scale'] = scale
bpy.context.scene['export_notes'] = 'Preserve supplied skeleton, materials and clips. Horizontal hip translation removed for in-place previews. Regional reduction modifiers are export-only.'
(base / 'art/source').mkdir(parents=True, exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(base / 'art/source/zombie7-master.blend'))
(base / 'docs/qa/phase4a/source-inventory.json').write_text(json.dumps({'height':1.8,'sourceHeight':top-bottom,'scale':scale,'bones':[b.name for b in rig.data.bones], 'meshes':[{'name':o.name,'vertices':len(o.data.vertices),'faces':len(o.data.polygons)} for o in meshes], 'clips':inventory},indent=2))
print('ENEMY_MASTER_SAVED', json.dumps(inventory))
