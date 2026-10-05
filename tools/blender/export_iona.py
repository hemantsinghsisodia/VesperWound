"""Read-only master export. Never saves or regenerates the authored .blend."""
import bpy,sys,json,bmesh
from pathlib import Path
from mathutils import Quaternion
ROOT=Path(__file__).resolve().parents[2]
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
tier=args[0] if args else 'desktop'; source=args[1] if len(args)>1 else 'art/source/iona-master.blend'
bpy.ops.wm.open_mainfile(filepath=str(ROOT/source))
rig=bpy.data.objects['Iona_Rig']; rig.animation_data.action=None
for b in rig.pose.bones: b.rotation_quaternion=Quaternion(); b.location=(0,0,0)
bpy.context.view_layer.update()
col=bpy.data.collections['Export_'+tier]
objects=list(col.objects)
for o in objects:
    o.hide_set(False); bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active=o
    if o.name.startswith('Face and neck'):
        # Preserve complete anatomy in the saved master; remove only covered
        # neck/scalp faces in runtime derivatives before subdivision evaluation.
        top=max(v.co.z for v in o.data.vertices)
        bm=bmesh.new(); bm.from_mesh(o.data)
        hidden=[f for f in bm.faces if all(v.co.z<1.49 for v in f.verts) or all(v.co.z>top-.055 and v.co.y>-.13 for v in f.verts)]
        bmesh.ops.delete(bm,geom=hidden,context='FACES'); bm.to_mesh(o.data); bm.free()
    if o.type=='CURVE':
        bone=o.get('iona_bone',''); world=o.matrix_world.copy(); bpy.ops.object.convert(target='MESH'); o=bpy.context.object
        o.parent_type='OBJECT'; o.parent=rig; o.matrix_world=world
        if bone:
            g=o.vertex_groups.new(name=bone); g.add(list(range(len(o.data.vertices))),1,'REPLACE')
            m=o.modifiers.new('Attachment deformation','ARMATURE'); m.object=rig
    for modifier in list(o.modifiers):
        if modifier.type!='ARMATURE': bpy.ops.object.modifier_apply(modifier=modifier.name)
    # Preserve explicit quad-derived topology; no uniform decimation.
    if o.type=='MESH':
        for material in o.data.materials:
            for node in material.node_tree.nodes:
                if node.type=='TEX_IMAGE' and node.image:
                    limit=4096 if tier=='cinematic' and material.name in ['Iona.Skin','Iona.Waxcloth'] else 2048 if tier!='mobile' else 1024
                    image=node.image
                    if max(image.size)>limit:
                        ratio=limit/max(image.size); image.scale(round(image.size[0]*ratio),round(image.size[1]*ratio))
    o.select_set(False)
# Join runtime pieces by semantic material after evaluating their authored LOD.
# The saved master retains all separately editable objects and curve sources.
buckets={}
for o in list(col.objects):
    if o.type=='MESH': buckets.setdefault(o.data.materials[0].name,[]).append(o)
for name,parts in buckets.items():
    bpy.ops.object.select_all(action='DESELECT')
    for o in parts: o.select_set(True)
    bpy.context.view_layer.objects.active=parts[0]
    if len(parts)>1: bpy.ops.object.join()
    bpy.context.object.name=name
bpy.ops.object.select_all(action='DESELECT'); rig.select_set(True)
for o in col.objects: o.select_set(True)
for name in ['socket_lantern','socket_wake_hook']: bpy.data.objects[name].select_set(True)
out=ROOT/f'art/source/{tier}'; out.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(out/'iona.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_nla_strips=False,export_yup=True,export_extras=True)
count=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in col.objects if o.type=='MESH')
(out/'iona-stats.json').write_text(json.dumps({'tier':tier,'triangles':count,'bones':len(rig.data.bones),'master':source},indent=2))
print('IONA_EXPORT',tier,count)
