"""Explicit Checkpoint B authoring. Never run as part of a normal export."""
import bpy, math, json, random
from pathlib import Path
from mathutils import Vector, Matrix
root=Path.cwd()
bpy.ops.wm.open_mainfile(filepath=str(root/'art/source/ash-quay-master.blend'),load_ui=False)
scene=bpy.context.scene
court=bpy.data.collections.new('05_Court_Ground_B');scene.collection.children.link(court)
quay=bpy.data.collections.new('10_Arrival_Quay');scene.collection.children.link(quay)
cutaway=bpy.data.collections.new('11_Cutaway_Canopy');scene.collection.children.link(cutaway)
def move(o,c=quay):
    for old in list(o.users_collection):old.objects.unlink(o)
    c.objects.link(o);return o
def mat(name,color,metal=0,rough=.7,emit=0):
    m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
    if emit:p.inputs['Emission Color'].default_value=(*color,1);p.inputs['Emission Strength'].default_value=emit
    return m
iron=bpy.data.materials['Quay / patinated iron'];brass=bpy.data.materials['Quay / worn brass']
stone=bpy.data.materials['Ash Quay / worn paving'];brick=bpy.data.materials['Ash Quay / masonry']
wood=next((m for m in bpy.data.materials if 'wooden_crate' in m.name),iron)
slate=mat('District / basalt base',(.018,.02,.016),0,1)
floor=mat('District / weathered concrete',(.45,.47,.46),0,.8)
nodes=floor.node_tree.nodes;links=floor.node_tree.links;p=nodes.get('Principled BSDF')
for filename,socket in [('Diffuse','Base Color'),('Rough','Roughness'),('nor_gl','Normal')]:
    image=bpy.data.images.load(str(root/'art/imports/environment/concrete_floor_worn_02'/(filename+'.jpg')))
    if filename!='Diffuse':image.colorspace_settings.name='Non-Color'
    tex=nodes.new('ShaderNodeTexImage');tex.image=image
    if filename=='nor_gl':
        normal=nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.8
        links.new(tex.outputs['Color'],normal.inputs['Color']);links.new(normal.outputs['Normal'],p.inputs[socket])
    else:links.new(tex.outputs['Color'],p.inputs[socket])
# Shared scans preserve detail density; small exported tints avoid a checkerboard.
flags=[floor.copy() for i in range(3)]
for i,m in enumerate(flags):m.name='District / weathered concrete %02d'%i
ochre=mat('District / rope',(.25,.215,.15),0,.9)
red=mat('District / oxide paint',(.16,.053,.033),.25,.61)
ink=mat('District / enamel',(.028,.048,.05),.35,.6)
ivory=bpy.data.materials['Quay / old porcelain']
amber=mat('District / amber glass',(1,.34,.045),.05,.35,2)
water=bpy.data.materials['Quay / dark harbour water']
def box(name,pos,size,material,c=quay,bevel=.025):
    bpy.ops.mesh.primitive_cube_add(size=1,location=pos);o=bpy.context.object;o.name=name;o.dimensions=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(material)
    # Box projection in metres: never stretch one texture across an entire wall.
    uv=o.data.uv_layers.active.data
    for face in o.data.polygons:
        axis=max(range(3),key=lambda i:abs(face.normal[i]));axes=[i for i in range(3) if i!=axis]
        for loop in face.loop_indices:
            co=o.data.vertices[o.data.loops[loop].vertex_index].co+o.location
            uv[loop].uv=(co[axes[0]]/2,co[axes[1]]/2)
    if bevel:
        b=o.modifiers.new('Dressed edges','BEVEL');b.width=bevel;b.segments=1;bpy.ops.object.modifier_apply(modifier=b.name)
        n=o.modifiers.new('Face normals','WEIGHTED_NORMAL');bpy.ops.object.modifier_apply(modifier=n.name)
    return move(o,c)
def pipe(name,a,b,r,material=iron,c=quay):
    a,b=Vector(a),Vector(b);bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=r,depth=(b-a).length,location=(a+b)/2)
    o=bpy.context.object;o.name=name;o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();o.data.materials.append(material)
    return move(o,c)
def ring(name,p,r=.3,minor=.025,material=brass,c=quay):
    bpy.ops.mesh.primitive_torus_add(major_segments=24,minor_segments=6,major_radius=r,minor_radius=minor,location=p)
    o=bpy.context.object;o.name=name;o.data.materials.append(material);return move(o,c)
def text(body,p,size=.2,c=quay):
    bpy.ops.object.text_add(location=p,rotation=(math.pi/2,0,0));o=bpy.context.object;o.name='Lettering / '+body;o.data.body=body;o.data.align_x='CENTER';o.data.size=size;o.data.extrude=.001;o.data.materials.append(ivory)
    bpy.ops.object.convert(target='MESH');return move(bpy.context.object,c)
def clone_at(source,name,center,c=quay):
    o=source.copy();o.data=source.data.copy();o.name=name;c.objects.link(o)
    bpy.context.view_layer.update();coords=[source.matrix_world@Vector(v) for v in source.bound_box];mid=Vector([(min(p[i] for p in coords)+max(p[i] for p in coords))/2 for i in range(3)])
    o.matrix_world=Matrix.Translation(Vector(center)-mid)@source.matrix_world;return o

# Open a 5 m passage at the existing south boundary. Keep the A source untouched.
for o in list(scene.objects):
    if o.name.startswith(('Quay / front railing','Maintenance / slab')):bpy.data.objects.remove(o,do_unlink=True)
for x in [-6.5,-4.5,4.5,6.5]:
    pipe('Court / exit railing post',(x,-8.05,0),(x,-8.05,.9),.035,c=court)
for a,b in [(-8,-2.5),(2.5,8)]:
    for z in [.4,.85]:pipe('Court / exit railing',(a,-8.05,z),(b,-8.05,z),.03,c=court)
for o in scene.objects:
    if o.name.startswith('Wet scanned paving'):
        o.data.materials.clear();o.data.materials.append(slate)
random.seed(20261012)
# Large irregular flags replace the tiny repeating checker across the court.
for row in range(13):
    for col in range(12):
        x=-7.8+col*1.3+(row%2)*.4;y=-7.4+row*1.2
        if x>7.5:continue
        if abs(x)<1.65 and .4<y<3.6:continue
        box('Court / worn flag',(x,y,.031),(1.285,1.185,.018),random.choice(flags),court,.002)
box('Court / passage direction board',(0,-7.8,2.8),(3.5,.08,.48),ink,court)
for x in [-2.42,2.42]:box('Court / passage post',(x,-7.8,1.45),(.13,.15,2.9),iron,court)
text('ARRIVAL QUAY',(0,-7.85,2.67),.23,court)

materials={'slate':slate,'stone':stone,'brick':brick,'iron':iron,'wood':wood}
layout=json.loads((root/'src/world/district-layout.json').read_text())
for entry in layout:
    p,h=entry['position'],entry['half'];c=cutaway if entry['kind']=='cutaway' else quay
    box(entry['name'],(p['x'],-p['z'],p['y']),(h['x']*2,h['z']*2,h['y']*2),materials[entry['material']],c)
# Retained native facade/window UVs; preserve original module proportions.
templates={k:next(o for o in scene.objects if o.name.startswith(k)) for k in ['West wing brick','West wing window','Intake factory window']}
for z in [9.8,12.8,15.8]:
    for k in ['West wing brick','West wing window']:clone_at(templates[k],'Lane / CC0 '+k,(-2.88,-z,3.1))
for z in [19.5,22.5]:
    for k in ['West wing brick','West wing window']:clone_at(templates[k],'Loading house / CC0 '+k,(-7.9,-z,3.2))
# Lane has narrow dark setts and a continuous drain; quay has broad warm slabs.
for row in range(18):
    z=8.25+row*.5
    for x in [-1.85,-1.05,-.25,.55,1.35,2.1]:
        box('Lane / basalt sett',(x,-z,.047),(.78,.49,.022),flags[(row+int(x*10))%3],bevel=.002)
for row in range(9):
    for col in range(10):
        x=-7.15+col*1.58;z=17.8+row*1.47
        box('Quay / broad stone slab',(x,-z,.047),(1.565,1.455,.022),flags[(row+col)%3],bevel=.002)
for z in range(8,18):
    box('Lane / central drain',(0,-z,.065),(.24,.93,.014),iron,bevel=0)
    for j in range(4):box('Lane / drain grate',(0,-z-j*.2,.078),(.26,.035,.018),brass,bevel=0)
# Loading canopy ribs and weathered fascia, visible from the lane reveal.
for z in [18.3,19.9,21.5,23.1,24.7]:box('Canopy / truss',(-5.65,-z,3.22),(4.1,.09,.14),iron,cutaway)
box('Loading / enamel board',(-5.6,-17.95,2.55),(2.9,.08,.55),ink)
text('INTAKE  /  03',(-5.6,-18,2.42),.22)
for x,z in [(-6.5,19.5),(-6.5,21.5)]:
    for offset in [-.4,.4]:box('Freight / metal band',(x+offset,-z,.65),(.05,1.13,1.23),iron)
    box('Freight / porcelain seal',(x,-z-.562,.7),(.3,.02,.23),ivory)
# Original harbour crane. Fixed ballast and hook are scenic, not a new weapon.
pipe('Crane / boom',(4.8,-24.4,4.65),(1.5,-25.4,5.65),.13)
pipe('Crane / brace',(4.8,-24.4,2.5),(1.5,-25.4,5.65),.06)
pipe('Crane / back stay',(4.8,-24.4,4.6),(6,-23.9,3.5),.06)
box('Crane / counterweight',(6,-23.9,3.5),(1,.75,.55),red)
pipe('Crane / cable',(1.5,-25.4,5.65),(1.5,-25.4,2.7),.012)
hook=ring('Crane / cargo hook',(1.5,-25.4,2.5),.2,.04,iron);hook.rotation_euler.x=math.pi/2
for h in [1.1,1.7,2.3,2.9,3.5,4.1]:box('Crane / ladder rung',(4.55,-24.4,h),(.08,.63,.045),brass)
wheel=ring('Crane / winding wheel',(4.8,-24.05,1.3),.38,.035);wheel.rotation_euler.x=math.pi/2
for a in range(6):
    angle=a*math.pi/3;pipe('Crane / wheel spoke',(4.8,-24.05,1.3),(4.8+.35*math.cos(angle),-24.05,1.3+.35*math.sin(angle)),.018,brass)
# Lamps use emissive glass, not additional shadowed lights.
for x,z in [(-2.2,9),(-2.2,15.5),(-3.4,18.3),(-3.4,24.9),(6.6,29)]:
    pipe('Quay / lamp post',(x,-z,0),(x,-z,2.6),.045)
    box('Quay / lamp hood',(x,-z,2.64),(.32,.3,.07),iron)
    box('Quay / amber lamp',(x,-z,2.43),(.16,.16,.31),amber)
for x in [-3.5,3.5]:
    pipe('Mooring / bollard crosspiece',(x-.4,-29.7,.68),(x+.4,-29.7,.68),.065)
    for r in [.3,.34,.38]:ring('Mooring / coiled rope',(x,-29.7,.12),r,.022,ochre)
box('Arrival / harbour sign',(0,-30.8,1.8),(3,.08,.52),ink)
text('ASH QUAY  /  ARRIVALS',(0,-30.85,1.68),.16)
for x in [-1.4,1.4]:pipe('Arrival / sign post',(x,-30.8,0),(x,-30.8,2.1),.035)
# Calm harbour and restrained wake ribbons give the open edge depth.
box('Arrival / harbour water',(0,-39,-.45),(55,18,.1),water,bevel=0)
for i in range(20):
    x=random.uniform(-20,20);z=random.uniform(33,44)
    box('Harbour / pale wake',(x,-z,-.39),(random.uniform(.8,3),.035,.006),flags[0],bevel=0)
for x,z in [(-6,27),(6.7,20),(-5.2,26.5)]:
    for i in range(3):box('Dressing / stacked timber',(x,-z,.15+i*.12),(1.8,.2,.1),wood)
scene['milestone']='Ash Quay / Checkpoint B / two-area review'
scene['runtime_playable_bounds']='Pressure Court 16m; 9m service lane; Arrival Quay 16 x 14m'
for image in bpy.data.images:
    if image.source=='FILE' and not image.packed_file:image.pack()
bpy.ops.outliner.orphans_purge(do_recursive=True)
bpy.ops.wm.save_as_mainfile(filepath=str(root/'art/source/ash-quay-district.blend'),compress=True)
print('DISTRICT_AUTHOR_COMPLETE',len(scene.objects))
