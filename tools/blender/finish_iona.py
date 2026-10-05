"""Offline drape, sculpt bake and UV authoring. Writes work only, not master."""
import bpy,math,json
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[2]; WORK=ROOT/'art/work'
bpy.ops.wm.open_mainfile(filepath=str(WORK/'iona-authoring.blend'))
rig=bpy.data.objects['Iona_Rig']; rig.animation_data.action=None
for b in rig.pose.bones: b.rotation_quaternion=(1,0,0,0); b.location=(0,0,0)
bpy.context.view_layer.update()
sculpt=bpy.data.collections['Sculpt and garment construction']
def clone(o,name):
    c=o.copy(); c.data=o.data.copy(); c.name=name; sculpt.objects.link(c); c.parent=None
    for m in list(c.modifiers): c.modifiers.remove(m)
    return c
# Cloth study is retained as an editable modifier plus a draped mesh snapshot.
coat=bpy.data.objects['Coat / tailored split panels / cinematic']
study=clone(coat,'Offline pinned waxcloth drape study')
pin=study.vertex_groups.new(name='Pinned waist and yoke')
pin.add([v.index for v in study.data.vertices if v.co.z>1.015],1,'REPLACE')
cloth=study.modifiers.new('Offline cloth draping only','CLOTH')
cloth.settings.vertex_group_mass=pin.name; cloth.settings.quality=8
cloth.settings.mass=.65; cloth.settings.tension_stiffness=40; cloth.settings.compression_stiffness=40; cloth.settings.shear_stiffness=20; cloth.settings.bending_stiffness=8
bpy.context.scene.gravity=(0,0,-1)
for frame in range(1,25): bpy.context.scene.frame_set(frame); bpy.context.view_layer.update(); study.evaluated_get(bpy.context.evaluated_depsgraph_get()).to_mesh_clear()
evaluated=study.evaluated_get(bpy.context.evaluated_depsgraph_get()); draped=bpy.data.meshes.new_from_object(evaluated)
snapshot=bpy.data.objects.new('Waxcloth draped sculpt reference',draped); sculpt.objects.link(snapshot)
tree=BVHTree.FromPolygons([v.co for v in draped.vertices],[list(p.vertices) for p in draped.polygons])
for tier in ['cinematic','desktop','mobile']:
    for o in bpy.data.collections['Export_'+tier].objects:
        if o.name.startswith('Coat /'):
            for v in o.data.vertices:
                near=tree.find_nearest(v.co)
                if near[0] is not None:
                    delta=near[0]-v.co
                    if delta.length>.012: delta=delta.normalized()*.012
                    if v.co.z<1.02: v.co+=delta*.55
# Deliberate, padded atlas regions shared across the authored LOD surfaces.
regions={'Coat /':(.02,.02,.60,.96),'Continuous coat sleeve L':(.65,.50,.15,.48),'Continuous coat sleeve R':(.83,.50,.15,.48),
    'Shoulder cape':(.65,.02,.33,.18),'Raised folded collar':(.65,.22,.15,.08),'Folded working scarf':(.83,.22,.15,.08),
    'Trousers L':(.65,.32,.15,.16),'Trousers R':(.83,.32,.15,.16)}
for tier in ['cinematic','desktop','mobile']:
    for o in bpy.data.collections['Export_'+tier].objects:
        if o.type!='MESH': continue
        for prefix,(x,y,w,h) in regions.items():
            if o.name.startswith(prefix):
                for uv in o.data.uv_layers.active.data:
                    u,v=uv.uv; uv.uv=(x+(u-.02)/.96*w,y+(v-.02)/.96*h)
        # Smooth forged crescent with continuous edge thickness instead of an L.
        if o.name.startswith('Forged cutting blade'):
            x,y,z=bpy.data.objects['socket_wake_hook'].matrix_world.translation
            vertices=[]; faces=[]; n=32 if tier=='cinematic' else 20 if tier=='desktop' else 12
            for j in range(n+1):
                t=j/n; a=-.1-t*math.pi*1.17
                center=Vector((x-.086+.09*math.cos(a),y,z-.735+.09*math.sin(a)))
                width=.013*math.sin(math.pi*t)**.7+.003*(1-t)
                radial=Vector((math.cos(a),0,math.sin(a)))
                for depth,edge in [(-.004,-1),(-.004,1),(.004,-1),(.004,1)]: vertices.append(center+radial*width*edge+Vector((0,depth,0)))
                if j:
                    k=(j-1)*4
                    faces.extend([(k,k+4,k+5,k+1),(k+2,k+3,k+7,k+6),(k,k+2,k+6,k+4),(k+1,k+5,k+7,k+3)])
            data=bpy.data.meshes.new('Forged crescent retopology'); data.from_pydata(vertices,[],faces); data.materials.append(bpy.data.materials['Iona.Iron']); data.uv_layers.new(); o.data=data
            for p in data.polygons: p.use_smooth=True
# Consolidated low/high clothing bake proxies retain deliberately disjoint UVs.
parts=[]
for o in bpy.data.collections['Export_cinematic'].objects:
    if o.type=='MESH' and o.data.materials[0].name=='Iona.Waxcloth': parts.append(clone(o,'Bake low / '+o.name))
bpy.ops.object.select_all(action='DESELECT')
for o in parts: o.select_set(True)
bpy.context.view_layer.objects.active=parts[0]; bpy.ops.object.join(); low=bpy.context.object; low.name='Clothing atlas bake receiver'
high=clone(low,'Clothing sculpt — high resolution bake source')
sub=high.modifiers.new('Sculpt subdivision','SUBSURF'); sub.levels=2; sub.render_levels=2
texture=bpy.data.textures.new('Original fine waxcloth sculpt',type='CLOUDS'); texture.noise_scale=.004
disp=high.modifiers.new('Sculpted fibre relief','DISPLACE'); disp.texture=texture; disp.strength=.00065; disp.mid_level=.5
bpy.context.scene.render.engine='CYCLES'; bpy.context.scene.cycles.samples=16
bake=bpy.context.scene.render.bake; bake.use_selected_to_active=True; bake.cage_extrusion=.012; bake.margin=12
mat=bpy.data.materials['Iona.Waxcloth']; nodes=mat.node_tree.nodes; shader=nodes.get('Principled BSDF')
bake_records=[]
for kind in ['NORMAL','AO']:
    image=bpy.data.images.new('Iona clothing sculpt '+kind,width=2048,height=2048); image.colorspace_settings.name='Non-Color'
    node=nodes.new('ShaderNodeTexImage'); node.image=image; nodes.active=node
    bpy.ops.object.select_all(action='DESELECT'); high.select_set(True); low.select_set(True); bpy.context.view_layer.objects.active=low
    bpy.ops.object.bake(type=kind)
    image.filepath_raw=str(WORK/('clothing-baked-'+kind.lower()+'.png')); image.file_format='PNG'; image.save(); image.pack()
    if kind=='NORMAL':
        n=nodes.new('ShaderNodeNormalMap'); n.inputs['Strength'].default_value=.65; mat.node_tree.links.new(node.outputs['Color'],n.inputs['Color']); mat.node_tree.links.new(n.outputs['Normal'],shader.inputs['Normal'])
    else:
        base=shader.inputs['Base Color'].links[0].from_socket
        mix=nodes.new('ShaderNodeMixRGB'); mix.blend_type='MULTIPLY'; mix.inputs[0].default_value=.45
        mat.node_tree.links.new(base,mix.inputs[1]); mat.node_tree.links.new(node.outputs['Color'],mix.inputs[2]); mat.node_tree.links.new(mix.outputs[0],shader.inputs['Base Color'])
    bake_records.append({'type':kind,'resolution':2048,'source':high.name,'receiver':low.name,'margin':12,'file':image.filepath_raw})
# Baked AO/color multiplication is materialized into an exportable color texture.
bake.use_selected_to_active=False
image=bpy.data.images.new('Iona authored waxcloth color atlas',width=2048,height=2048)
node=nodes.new('ShaderNodeTexImage'); node.image=image; nodes.active=node
bake.use_pass_direct=False; bake.use_pass_indirect=False; bake.use_pass_color=True
bpy.ops.object.select_all(action='DESELECT'); low.select_set(True); bpy.context.view_layer.objects.active=low
bpy.ops.object.bake(type='DIFFUSE'); image.filepath_raw=str(WORK/'clothing-color-atlas.png'); image.file_format='PNG'; image.save(); image.pack()
mat.node_tree.links.new(node.outputs['Color'],shader.inputs['Base Color'])
sculpt.hide_render=True; sculpt.hide_viewport=True
bpy.context.scene.gravity=(0,0,-9.81); rig.animation_data.action=bpy.data.actions['idle']; bpy.context.scene.frame_set(1)
bpy.context.scene['iona_bake_report']=json.dumps(bake_records)
(WORK/'bake-report.json').write_text(json.dumps({'offlineClothFrames':24,'bakes':bake_records},indent=2))
bpy.ops.wm.save_as_mainfile(filepath=str(WORK/'iona-authoring.blend'))
print('IONA_OFFLINE_FINISH_COMPLETE')
