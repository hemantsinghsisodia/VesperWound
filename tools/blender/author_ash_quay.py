"""Explicit authoring checkpoint. Normal exports never execute this script.

Composes verified CC0 modules and original engine fittings in an editable source.
Blender coordinates are Z-up; runtime glTF is Y-up with -Y mapped to Z.
"""
import bpy, math, random, json
from pathlib import Path
from mathutils import Vector, Matrix

root = Path.cwd()
bpy.ops.wm.open_mainfile(filepath=str(root/'art/source/ash-quay-desktop.blend'), load_ui=False)
scene = bpy.context.scene
for o in list(scene.objects):
    if o.type != 'MESH': bpy.data.objects.remove(o, do_unlink=True); continue
    if not o.name.startswith(('Stone foundation', 'Wet scanned paving', 'Raised landing', 'Landing stair', 'Gate ', 'Black iron intake', 'Lamp ', 'Waxcloth ', 'Bundle ', 'wooden_crate', 'Restrained stone')):
        bpy.data.objects.remove(o, do_unlink=True)

def collection(name):
    c = bpy.data.collections.new(name); scene.collection.children.link(c); return c
architecture = collection('01_Architecture_CC0')
machinery = collection('02_Pressure_Engine_Original')
dressing = collection('03_Paving_And_Dressing')
background = collection('04_Background_City')
blockout = collection('90_District_Blockout_64m_Review_Only')
blockout.hide_render = True; blockout.hide_viewport = True
for o in list(scene.objects):
    for c in list(o.users_collection): c.objects.unlink(o)
    dressing.objects.link(o)

def move(o, c):
    for old in list(o.users_collection): old.objects.unlink(o)
    c.objects.link(o); return o
def material(name, color, metal=0, rough=.7, emission=None):
    m=bpy.data.materials.new(name); m.use_nodes=True; p=m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value=(*color,1); p.inputs['Metallic'].default_value=metal; p.inputs['Roughness'].default_value=rough
    if emission: p.inputs['Emission Color'].default_value=(*emission,1); p.inputs['Emission Strength'].default_value=.8
    return m
iron=material('Quay / patinated iron',(.045,.065,.064),.8,.44)
iron_nodes=iron.node_tree.nodes;iron_bsdf=iron_nodes.get('Principled BSDF')
for filename,socket in [('diff_1k.jpg','Base Color'),('rough_1k.jpg','Roughness')]:
    node=iron_nodes.new('ShaderNodeTexImage');node.image=bpy.data.images.load(str(root/'art/downloads/rusty_metal_04'/filename),check_existing=True)
    if socket!='Base Color':node.image.colorspace_settings.name='Non-Color'
    iron.node_tree.links.new(node.outputs['Color'],iron_bsdf.inputs[socket])
normal_image=iron_nodes.new('ShaderNodeTexImage');normal_image.image=bpy.data.images.load(str(root/'art/downloads/rusty_metal_04/normal_1k.jpg'),check_existing=True);normal_image.image.colorspace_settings.name='Non-Color'
normal_node=iron_nodes.new('ShaderNodeNormalMap');normal_node.inputs['Strength'].default_value=.3
iron.node_tree.links.new(normal_image.outputs['Color'],normal_node.inputs['Color']);iron.node_tree.links.new(normal_node.outputs['Normal'],iron_bsdf.inputs['Normal'])
brass=material('Quay / worn brass',(.24,.19,.09),.8,.48)
stone= bpy.data.materials.get('Ash Quay / worn paving')
porcelain=material('Quay / old porcelain',(.6,.59,.49),.05,.48)
mint=material('Quay / pressure glass',(.09,.20,.16),.25,.27,(.22,.59,.43))
amber=material('Quay / warm window',(.22,.11,.035),0,.5,(.8,.34,.07))
water=material('Quay / dark harbour water',(.018,.038,.045),.45,.18)
sign=material('Quay / enamel sign',(.025,.07,.067),.15,.55)

def box(name,pos,size,mat,c=dressing,bevel=.025):
    bpy.ops.mesh.primitive_cube_add(size=1,location=pos); o=bpy.context.object; o.name=name; o.dimensions=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if mat:o.data.materials.append(mat)
    if bevel:
        b=o.modifiers.new('Manufactured edges','BEVEL'); b.width=bevel; b.segments=1
        bpy.context.view_layer.objects.active=o; bpy.ops.object.modifier_apply(modifier=b.name)
        n=o.modifiers.new('Face normals','WEIGHTED_NORMAL'); bpy.ops.object.modifier_apply(modifier=n.name)
    return move(o,c)
def cylinder(name,pos,radius,depth,mat,c=machinery,vertices=24):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=depth,location=pos)
    o=bpy.context.object; o.name=name; o.data.materials.append(mat)
    for p in o.data.polygons:p.use_smooth=True
    return move(o,c)
def pipe(name,a,b,radius,mat=iron,c=machinery):
    a,b=Vector(a),Vector(b); o=cylinder(name,(a+b)/2,radius,(b-a).length,mat,c,16)
    o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler(); return o
def ring(name,pos,major,minor,mat,c=machinery):
    bpy.ops.mesh.primitive_torus_add(major_segments=32,minor_segments=6,location=pos,major_radius=major,minor_radius=minor)
    o=bpy.context.object; o.name=name; o.data.materials.append(mat)
    for p in o.data.polygons:p.use_smooth=True
    return move(o,c)

# Existing textures remain native and commercially verified. Remove checkerboard
# dominance by changing physical scale and introducing separate maintenance bays.
floor=next(o for o in scene.objects if o.name.startswith('Wet scanned paving'))
for uv in floor.data.uv_layers.active.data: uv.uv *= .55
for mat in [bpy.data.materials.get('Ash Quay / masonry'), stone]:
    if mat and mat.use_nodes:
        p=mat.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(.38,.39,.35,1)

# Append only selected library objects. Source transforms are baked into local
# geometry before placement so panel proportions and authored UVs are retained.
def append(path,names):
    with bpy.data.libraries.load(str(root/path),link=False) as (src,dst):
        absent=set(names)-set(src.objects)
        if absent:raise RuntimeError('Missing modules '+str(absent))
        dst.objects=names
    return {o.name:o for o in dst.objects}
facade=append('art/imports/environment/modular_factory_facade/source.blend',[
    'wall_standard_standard_01','wall_window_tall_large_01','window_tall_large_01',
    'wall_door_recessed_large_01','door_recessed_large_01','cornice01_standard_standard_01'])
def module(template,name,pos,anchor,angle=0,c=architecture):
    t=facade[template]; o=t.copy(); o.data=t.data.copy(); o.name=name; c.objects.link(o)
    # Appended objects are unlinked library templates; their evaluated
    # matrix_world is not current. Compose the authored local transform directly.
    authored=Matrix.LocRotScale(t.location,t.rotation_euler.to_quaternion(),t.scale)
    transform=Matrix.Translation(Vector(pos)) @ Matrix.Rotation(angle,4,'Z') @ Matrix.Translation(-Vector(anchor)) @ authored
    o.data.transform(transform); o.matrix_world=Matrix.Identity(4)
    o['source']='Poly Haven / Modular Factory Facade'; return o

# Back facade: recessed doors behind existing landings; tall windows above.
for i,x in enumerate([-7.5,-4.5,-1.5,1.5,4.5]):
    door=i in [1,4]
    if door:
        module('wall_door_recessed_large_01','Intake brick doorway %02d'%i,(x,7.8,.82),(8,0,0))
        module('door_recessed_large_01','Intake worn door %02d'%i,(x,7.8,.82),(8,0,0))
    else:module('wall_standard_standard_01','Intake brick lower %02d'%i,(x,7.8,0),(-20,0,0))
    module('wall_window_tall_large_01','Intake upper masonry %02d'%i,(x,7.8,3.8),(-12,0,4))
    module('window_tall_large_01','Intake factory window %02d'%i,(x,7.8,3.8),(-12,0,4))
    module('cornice01_standard_standard_01','Intake cornice %02d'%i,(x,7.8,6.8),(-20,0,6))
    box('Facade backing %02d'%i,(x+1.5,8.3,3.4),(3,.3,6.8),iron,architecture)
    if i in [1,3]: box('Occupied window glow %02d'%i,(x+1.5,7.97,5.55),(2.55,.025,1.45),amber,architecture,0)

# Side wing reads as a building, not a thin perimeter wall. Low front boundary
# leaves the action readable from the gameplay camera.
for i,y in enumerate([-4,-1,2,5]):
    module('wall_window_tall_large_01','West wing brick %02d'%i,(-8,y,1.4),(-12,0,4),math.pi/2)
    module('window_tall_large_01','West wing window %02d'%i,(-8,y,1.4),(-12,0,4),math.pi/2)
    box('West wing backing %02d'%i,(-8.5,y+1.5,2.2),(.4,3,4.4),iron,architecture)
box('West coping',(-8,1.7,4.58),(.65,13,.2),stone,architecture)
for y in [-4,-1,2,5]: box('West masonry pier',(-7.82,y,2.3),(.35,.42,4.6),stone,architecture)
for x in [-6,-3,3,6]:box('Intake stone pier',(x,7.57,3.4),(.5,.6,6.8),stone,architecture)
box('Intake roof ledge',(0,8.15,6.9),(16.7,1,.26),stone,architecture)
box('East quay retaining wall',(8.05,1.5,1.05),(.48,13,2.1),stone,architecture)
box('East coping',(8.05,1.5,2.15),(.66,13,.2),stone,architecture)

# Pressure engine stays within the existing collision footprint. Every fitting
# is editable, with restrained emission instead of a full luminous cylinder.
for radius,z,depth in [(1.45,.22,.38),(1.2,.48,.14),(.8,.96,.82),(.86,1.4,.12),(.44,2.04,1.2),(.76,2.7,.2)]:
    cylinder('Engine / pressure vessel', (0,2,z),radius,depth,iron if z>.3 else stone)
for z,r in [(.6,.82),(1.35,.86),(2.68,.78)]:ring('Engine / rolled brass seam',(0,2,z),r,.035,brass)
for z in [.69,1.28,2.65]:
    for i in range(16):
        a=i*math.tau/16; cylinder('Engine / flange bolt',(math.cos(a)*.81,2+math.sin(a)*.81,z),.033,.045,brass,vertices=8)
for i in range(8):
    a=i*math.tau/8
    pipe('Engine / cast cage',(math.cos(a)*.54,2+math.sin(a)*.54,1.47),(math.cos(a)*.54,2+math.sin(a)*.54,2.59),.035)
    if i in [4,5,6]:
        panel=box('Engine / sight glass',(math.cos(a)*.50,2+math.sin(a)*.50,2.05),(.19,.035,.85),mint,machinery,.01);panel.rotation_euler.z=a-math.pi/2
for x,height in [(-.55,4.15),(0,4.7),(.55,4.35)]:
    cylinder('Engine / flue',(x,2.2,(height+2.78)/2),.12,height-2.78,iron)
    for z in [2.9,height-.08]:ring('Engine / flue flange',(x,2.2,z),.135,.022,brass)
for x in [-.47,.47]:
    gauge=cylinder('Engine / pressure gauge',(x,1.21,1.13),.16,.08,brass);gauge.rotation_euler.x=math.pi/2
    face=cylinder('Engine / porcelain dial',(x,1.16,1.13),.135,.012,porcelain);face.rotation_euler.x=math.pi/2
    needle=box('Engine / gauge needle',(x,1.15,1.14),(.017,.012,.19),iron,machinery,0);needle.rotation_euler.y=.6 if x<0 else -.35
    for i in range(9):
        a=i*math.pi/6;box('Engine / gauge calibration',(x+math.sin(a)*.107,1.145,1.13+math.cos(a)*.107),(.015,.008,.015),iron,machinery,0)
for x in [-.95,.95]:
    pipe('Engine / steam feed',(x,2,.3),(x,2,2.4),.08)
    pipe('Engine / feed elbow',(x,2,2.4),(x*.65,2,2.4),.08)
    wheel=ring('Engine / shutoff handwheel',(x,1.82,1.85),.2,.024,brass);wheel.rotation_euler.x=math.pi/2
    for a in [0,math.pi/2]:
        spoke=pipe('Engine / wheel spoke',(x-.18*math.cos(a),1.82,1.85-.18*math.sin(a)),(x+.18*math.cos(a),1.82,1.85+.18*math.sin(a)),.012,brass)
box('Engine / inspection hatch',(0,1.17,.98),(.47,.11,.37),iron,machinery)
box('Engine / maintenance plaque',(0,1.09,.97),(.24,.02,.12),porcelain,machinery,.005)

with bpy.data.libraries.load(str(root/'art/imports/environment/modular_industrial_pipes_01/source.blend'),link=False) as (src,dst):
    dst.objects=['modular_industrial_pipes_01_pipe02','modular_industrial_pipes_01_pipe08']
for source in dst.objects:
    # Normalize by the actual bounds, preserving the supplied proportions.
    authored=Matrix.LocRotScale(source.location,source.rotation_euler.to_quaternion(),source.scale)
    vertices=[authored@v.co for v in source.data.vertices]
    center=Vector([(min(v[i] for v in vertices)+max(v[i] for v in vertices))/2 for i in range(3)])
    mesh=source.data.copy(); mesh.transform(Matrix.Translation(-center)@authored)
    for i in range(4 if 'pipe02' in source.name else 2):
        o=bpy.data.objects.new('CC0 / west pipe run' if 'pipe02' in source.name else 'CC0 / maintenance valve',mesh);machinery.objects.link(o)
        o.location=(-7.55,5.9-i*1.9,2.6) if 'pipe02' in source.name else (-7.5,3-i*3,2.6)
        o.rotation_euler.x=math.pi/2
for source in facade.values():
    if not source.users_collection:bpy.data.objects.remove(source)

# Purposeful ground detail; broad joints and long drains break up the paving.
for x in [-2.55,2.55]:
    box('Drain / recessed channel',(x,0,.046),(.18,14,.018),iron,dressing,.005)
    for y in range(-6,8):
        for j in range(4):box('Drain / grate rib',(x,y+j*.23,.056),(.22,.026,.02),iron,dressing,0)
slate=stone.copy();slate.name='Quay / maintenance slate'
slate_bsdf=slate.node_tree.nodes.get('Principled BSDF')
for link in list(slate_bsdf.inputs['Base Color'].links):slate.node_tree.links.remove(link)
slate_bsdf.inputs['Base Color'].default_value=(.16,.18,.17,1)
for i in range(12):
    box('Maintenance / slab',(-4.6+(i%4)*1.05,-4.7+(i//4)*1.25,.043),(1.02,1.22,.016),slate,dressing,.012)
for x in [-1.03,1.03]:box('Engine / approach edge',(x,3.25,.07),(.16,2.4,.08),stone,dressing)
for x,y in [(-6.8,-4.8),(6.6,-3.7),(-6.8,5.8)]:
    cylinder('Stores / steel drum',(x,y,.49),.3,.91,iron,dressing,16)
    for z in [.1,.48,.9]:ring('Stores / drum hoop',(x,y,z),.303,.015,brass,dressing)
for x in [-7,-5,-3,-1,1,3,5,7]:
    pipe('Quay / front railing post',(x,-8.15,0),(x,-8.15,.85),.027,iron,architecture)
for z in [.35,.8]:pipe('Quay / front railing',(-7.2,-8.15,z),(7.2,-8.15,z),.025,iron,architecture)

# A non-walkable backdrop provides city context for the proof, without claiming
# the future 64m district is implemented or adding hidden collision changes.
box('Harbour / water',(3,-17,-.55),(72,32,.1),water,background,0)
random.seed(71)
for i in range(14):
    x=-35+i*5; h=random.uniform(5,13)
    box('Distant works / silhouette',(x,25+random.uniform(0,10),h/2-2),(random.uniform(3,6),5,h),iron,background,0)
    if i%3==0:cylinder('Distant works / chimney',(x,27,h-1),.45,8,iron,background,12)
for i in range(5):
    box('Harbour bridge / pier',(-23+i*9,18,1.6),(.8,1.2,4.4),stone,background)
box('Harbour bridge / deck',(-5,18,3.8),(39,2.1,.4),iron,background)

# Editable signs; font geometry is original rather than website imagery.
def text(name,body,pos,size,mat):
    bpy.ops.object.text_add(location=pos,rotation=(math.pi/2,0,0));o=bpy.context.object;o.name=name;o.data.body=body;o.data.align_x='CENTER';o.data.size=size;o.data.extrude=.001;o.data.materials.append(mat)
    bpy.ops.object.convert(target='MESH');return move(bpy.context.object,architecture)
box('Intake / enamel nameboard',(0,7.45,3.15),(3.3,.06,.5),sign,architecture)
text('Intake / ASH QUAY lettering','ASH QUAY',(0,7.405,3.02),.25,porcelain)
text('Intake / works number','THE VESPER WORKS  /  01',(0,7.405,2.79),.095,porcelain)

zones=[('Intake Gate',(-20,14),(12,12)),('Pump Alley',(-10,17),(8,24)),('Pressure Court',(4,8),(24,20)),('Loading Hall',(20,12),(16,14)),('Quayside',(8,-15),(40,12)),('Mortuary Portico',(3,25),(16,10))]
for name,(x,y),(w,d) in zones:
    o=box('BLOCKOUT / '+name,(x,y,.03),(w,d,.06),stone,blockout,0);o['zone']=name
scene['milestone']='Ash Quay rebuild / Checkpoint A / awaiting art review'
scene['district_envelope_metres']=64
scene['runtime_playable_bounds']='Original 16m courtyard retained for proof; expanded traversal is Checkpoint B'
scene.world.color=(.12,.16,.20)
for img in bpy.data.images:
    if img.source=='FILE' and not img.packed_file:
        # Appended .blend-relative paths must resolve against their original file.
        if 'modular_factory_facade' in img.name:
            candidates=list((root/'art/imports/environment/modular_factory_facade/textures').glob(img.name.split('.')[0]+'*'))
        elif 'modular_industrial_pipes' in img.name:
            candidates=list((root/'art/imports/environment/modular_industrial_pipes_01/textures').glob(img.name.split('.')[0]+'*'))
        else:candidates=[]
        if candidates:img.filepath=str(candidates[0])
        try:img.pack()
        except RuntimeError:raise RuntimeError('Missing source image '+img.name+' '+img.filepath)
bpy.ops.outliner.orphans_purge(do_recursive=True)
bpy.ops.wm.save_as_mainfile(filepath=str(root/'art/source/ash-quay-master.blend'),compress=True)
print('ASH_QUAY_AUTHOR_COMPLETE',len(scene.objects))
