"""Explicit Milestone A authoring operation. Never run by the normal export.

Retains the approved district as a baseline and authors a separate saved source.
Coordinates are Blender Z-up; runtime forward Z is Blender -Y.
"""
import bpy, math, random
from pathlib import Path
from mathutils import Matrix, Vector

root=Path.cwd(); destination=root/'art/source/chapter-art-proof.blend'
if destination.exists(): raise RuntimeError('Proof already exists. Edit its saved source instead of regenerating it.')
bpy.ops.wm.open_mainfile(filepath=str(root/'art/source/ash-quay-district.blend'),load_ui=False)
scene=bpy.context.scene
detail=bpy.data.collections.new('10_Chapter_Street_And_Warehouse');scene.collection.children.link(detail)
cutaway=bpy.data.collections.new('11_Chapter_Loading_Canopy');scene.collection.children.link(cutaway)
iron=bpy.data.materials['Quay / patinated iron'];stone=bpy.data.materials['District / dock limestone warm']
brass=bpy.data.materials['Quay / worn brass'];ivory=bpy.data.materials['Quay / old porcelain']
wood=next(m for m in bpy.data.materials if 'wooden_crate' in m.name)
amber=bpy.data.materials['District / amber glass'];red=bpy.data.materials['District / oxide paint']

def move(o,c=detail):
 for previous in list(o.users_collection):previous.objects.unlink(o)
 c.objects.link(o);return o
def material(name,color,rough=.7,metal=0):
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF')
 p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal;return m
enamel=material('Chapter / petrol enamel',(.028,.075,.073),.48,.3)
roof=material('Chapter / charcoal zinc',(.052,.071,.074),.57,.65)
mortar=material('Chapter / recessed mortar',(.075,.083,.077),.95)
ochre=material('Chapter / faded ochre',(.42,.27,.095),.8)
dark=material('Chapter / recessed interior',(.012,.019,.018),1)
cool=material('Chapter / frosted clerestory',(.18,.27,.28),.4)
p=cool.node_tree.nodes.get('Principled BSDF');p.inputs['Emission Color'].default_value=(.12,.22,.23,1);p.inputs['Emission Strength'].default_value=.35

def box(name,pos,size,mat,bevel=.015,c=detail):
 bpy.ops.mesh.primitive_cube_add(size=1,location=pos);o=bpy.context.object;o.name='Chapter / '+name;o.dimensions=size
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat)
 for face in o.data.polygons:
  axis=max(range(3),key=lambda i:abs(face.normal[i]));axes=[i for i in range(3) if i!=axis]
  for li in face.loop_indices:
   co=o.data.vertices[o.data.loops[li].vertex_index].co+o.location;o.data.uv_layers.active.data[li].uv=(co[axes[0]]/1.5,co[axes[1]]/1.5)
 if bevel:
  b=o.modifiers.new('Worn arris','BEVEL');b.width=bevel;b.segments=1;bpy.ops.object.modifier_apply(modifier=b.name)
  n=o.modifiers.new('Face normals','WEIGHTED_NORMAL');bpy.ops.object.modifier_apply(modifier=n.name)
 return move(o,c)
def pipe(name,a,b,r=.035,mat=iron,c=detail):
 a,b=Vector(a),Vector(b);bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=r,depth=(b-a).length,location=(a+b)/2)
 o=bpy.context.object;o.name='Chapter / '+name;o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();o.data.materials.append(mat)
 for p in o.data.polygons:p.use_smooth=True
 return move(o,c)
def text(body,pos,size=.2,angle=math.pi/2,mat=ivory):
 bpy.ops.object.text_add(location=pos,rotation=(math.pi/2,0,angle));o=bpy.context.object;o.name='Chapter / lettering '+body
 o.data.body=body;o.data.align_x='CENTER';o.data.size=size;o.data.extrude=.0005;o.data.resolution_u=3;o.data.materials.append(mat)
 bpy.ops.object.convert(target='MESH');return move(bpy.context.object)

# Replace visual shells only. Matching CPU walls, crate and crane footprints remain.
prefixes=('Lane / basalt sett','Lane / CC0','Loading house / CC0','Loading / enamel board','Lettering / INTAKE', 'Loading canopy roof','Canopy / truss')
for o in list(scene.objects):
 if o.name in ['Pump Alley west wall','Loading house wall','Loading house north wall'] or o.name.startswith(prefixes):bpy.data.objects.remove(o,do_unlink=True)
# Remove prior partial wall/window clones by name, recorded in the predecessor source.
for o in list(scene.objects):
 if o.name.startswith(('Lane brick','Lane window','Loading brick','Loading window')):bpy.data.objects.remove(o,do_unlink=True)

# Selected CC0 library pieces retain their deliberate UVs and actual relief.
names=['wall_standard_standard_01','wall_window_tall_large_01','window_tall_large_01','wall_door_recessed_large_01','door_recessed_large_01','wall_door_garage_centered_01','door_garage_centered_01','cornice01_standard_standard_01']
with bpy.data.libraries.load(str(root/'art/imports/environment/modular_factory_facade/source.blend'),link=False) as (src,dst):dst.objects=names[:]
templates=dict(zip(names,dst.objects))
anchors={'wall_standard_standard_01':(-20,0,0),'wall_window_tall_large_01':(-12,0,4),'window_tall_large_01':(-12,0,4),'wall_door_recessed_large_01':(8,0,0),'door_recessed_large_01':(8,0,0),'wall_door_garage_centered_01':(-16,0,0),'door_garage_centered_01':(-16,0,0),'cornice01_standard_standard_01':(-20,0,6)}
def module(key,name,p,angle=math.pi/2):
 t=templates[key];o=t.copy();o.data=t.data.copy();o.name='Chapter / '+name;detail.objects.link(o)
 transform=Matrix.Translation(Vector(p))@Matrix.Rotation(angle,4,'Z')@Matrix.Translation(-Vector(anchors[key]))@Matrix.LocRotScale(t.location,t.rotation_euler.to_quaternion(),t.scale)
 o.data.transform(transform);o.matrix_world=Matrix.Identity(4);o['source']='Poly Haven / Modular Factory Facade';return o

# Street: full bays, workshop shutters, deep jambs, continuous stone plinth.
for i,y in enumerate([-17,-14,-11]):
 key='wall_door_recessed_large_01' if i!=1 else 'wall_standard_standard_01'
 module(key,'workshop ground bay',(-2.79,y,.06))
 if i!=1:module('door_recessed_large_01','workshop recessed door',(-2.79,y,.06))
 module('wall_window_tall_large_01','workshop upper brick',(-2.79,y,3.06))
 module('window_tall_large_01','workshop iron window',(-2.79,y,3.06))
 module('cornice01_standard_standard_01','workshop cornice',(-2.79,y,6.08))
 box('workshop shadow backing',(-3.16,y+1.5,3.05),(.12,2.98,5.95),dark)
 box('workshop foundation',(-2.64,y+1.5,.25),(.30,3,.5),stone)
 box('brick pier',(-2.65,y,3.05),(.26,.29,6.1),stone)
 box('window sill',(-2.58,y+1.5,4.03),(.34,2.7,.12),stone)
box('street building body',(-5.45,-12.5,2.8),(5.0,9.05,5.6),mortar)
for x,tilt in [(-4.1,-.15),(-6.75,.15)]:
 o=box('street pitched zinc roof',(x,-12.5,6.02),(2.8,9.5,.15),roof);o.rotation_euler.y=tilt
for y in [-16.9,-10.95]:
 pipe('workshop rain pipe',(-2.52,y,.25),(-2.52,y,6),.045)
 for z in [.55,2,4.3,5.8]:box('pipe collar',(-2.52,y,z),(.12,.11,.06),iron)
box('workshop sign back',(-2.5,-12.5,2.7),(.09,2.4,.57),enamel)
text('VESPER  /  REPAIRS',(-2.444,-12.5,2.76),.18)
text('PRESSURE FITTINGS',(-2.444,-12.5,2.51),.11)

# Warehouse: nine-metre, two-storey elevation with a recessed six-metre loading bay.
module('wall_door_garage_centered_01','bonded loading bay',(-7.76,-26.5,.06))
module('door_garage_centered_01','bonded sliding doors',(-7.76,-26.5,.06))
module('wall_door_recessed_large_01','warehouse office bay',(-7.76,-20.5,.06))
module('door_recessed_large_01','office door',(-7.76,-20.5,.06))
for y in [-26.5,-23.5,-20.5]:
 module('wall_window_tall_large_01','warehouse clerestory masonry',(-7.76,y,3.06))
 module('window_tall_large_01','warehouse clerestory',(-7.76,y,3.06))
 module('cornice01_standard_standard_01','warehouse roof cornice',(-7.76,y,6.1))
 box('warehouse plinth',(-7.63,y+1.5,.28),(.38,3,.56),stone)
 box('warehouse structural pier',(-7.56,y,3.1),(.42,.35,6.2),stone)
 box('clerestory backing',(-8.03,y+1.5,4.95),(.035,2.7,1.85),cool)
# North return facade closes the silhouette where the alley reveals the warehouse.
for x in [-13.7,-10.7]:
 module('wall_standard_standard_01','warehouse north foundation',(x,-17.48,.06),0)
 module('wall_window_tall_large_01','warehouse north upper',(x,-17.48,3.06),0)
 module('window_tall_large_01','warehouse north glass',(x,-17.48,3.06),0)
box('warehouse dark interior',(-10.9,-22,2.95),(5.8,8.9,5.8),dark)
for x,tilt in [(-9.3,-.18),(-12.4,.18)]:
 o=box('warehouse roof plane',(x,-22,6.37),(3.2,9.5,.18),roof);o.rotation_euler.y=tilt
 for y in [-26.5,-24,-21.5,-19]:pipe('warehouse standing seam',(x-1.5,y,6.4),(x+1.5,y,6.4),.018,roof)
pipe('warehouse ridge',(-10.85,-27,6.75),(-10.85,-17,6.75),.07,iron)
box('warehouse eave',(-7.65,-22,6.18),(.35,9.4,.25),stone)
# Readable projecting sign is the lane landmark. Its long face looks into the camera.
box('bonded sign',(-5.7,-17.96,3.04),(3.35,.14,.78),enamel)
text('BONDED  /  03',(-5.7,-18.045,3.1),.31,0)
text('ASH QUAY FREIGHT',(-5.7,-18.045,2.83),.14,0)
for x in [-7,-4.4]:pipe('sign suspension',(x,-17.96,3.44),(x,-17.96,3.85),.025)
# Canopy retains existing cutaway ownership and collision-free head clearance.
for y in [-18.25,-21.6,-24.9]:
 pipe('canopy tie',(-7.6,y,3.8),(-3.65,y,3.35),.045,c=cutaway)
 pipe('canopy brace',(-7.6,y,2.9),(-5.1,y,3.55),.035,c=cutaway)
for x in [-7.3,-6.5,-5.7,-4.9,-4.1]:
 box('canopy zinc strip',(x,-21.6,3.7),(.82,7.6,.055),roof,c=cutaway)
pipe('canopy rain gutter',(-3.6,-17.8,3.66),(-3.6,-25.4,3.66),.055,c=cutaway)

# Scanned wet cobbles provide a distinct service route; large slabs remain on apron.
cobbles=material('Chapter / wet service cobbles',(.4,.4,.4),.65)
p=cobbles.node_tree.nodes.get('Principled BSDF');nodes=cobbles.node_tree.nodes;links=cobbles.node_tree.links
for slot,socket in [('Diffuse','Base Color'),('Rough','Roughness'),('nor_gl','Normal')]:
 tex=nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(root/'art/imports/chapter/cobblestone_floor_04'/(slot+'.jpg')),check_existing=True)
 if slot!='Diffuse':tex.image.colorspace_settings.name='Non-Color'
 if slot=='nor_gl':
  normal=nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.65;links.new(tex.outputs['Color'],normal.inputs['Color']);links.new(normal.outputs['Normal'],p.inputs[socket])
 else:links.new(tex.outputs['Color'],p.inputs[socket])
# glTF's standard occlusion group carries the supplied scan AO, without a new pass.
group=bpy.data.node_groups.new('glTF Material Output','ShaderNodeTree');group.interface.new_socket(name='Occlusion',in_out='INPUT',socket_type='NodeSocketFloat')
output=nodes.new('ShaderNodeGroup');output.node_tree=group
ao=nodes.new('ShaderNodeTexImage');ao.image=bpy.data.images.load(str(root/'art/imports/chapter/cobblestone_floor_04/AO.jpg'));ao.image.colorspace_settings.name='Non-Color';links.new(ao.outputs['Color'],output.inputs['Occlusion'])
for x in [-1.1,1.1]:box('service cobbled route',(x,-12.5,.041),(1.94,9,.028),cobbles,0)
for y in [-17.5,-19,-20.5,-22,-23.5,-25]:box('loading cobbled apron',(-2.43,y,.069),(1.6,1.46,.018),cobbles,0)
# Kerb stones stay flush enough to retain the approved flat-ground traversal.
for y in [-8.5-i*.75 for i in range(12)]:
 for x in [-2.28,2.28]:box('drain kerb',(x,y,.05),(.32,.73,.045),stone,.007)

# Small working details belong to the wall or existing solid footprints, never lanes.
for x,y in [(-2.47,-10),(-2.47,-15.8),(-7.38,-24.8)]:
 box('lamp wall plate',(x,y,2.65),(.06,.23,.38),iron)
 pipe('lamp bracket',(x,y,2.8),(x+.24,y,2.8),.025)
 box('lamp frosted glass',(x+.26,y,2.62),(.16,.18,.27),amber)
 for dy in [-.11,.11]:pipe('lamp cage',(x+.35,y+dy,2.45),(x+.35,y+dy,2.8),.009)
 box('lamp hood',(x+.26,y,2.8),(.3,.32,.055),iron)
for x,y in [(-2.48,-13.6),(-7.35,-25.9)]:
 box('pressure service cabinet',(x,y,1.1),(.15,.48,.7),enamel)
 box('service label',(x+.081,y,1.2),(.012,.31,.15),ivory)
 pipe('cabinet conduit',(x,y,1.5),(x,y,2.2),.025)
for y in [-26.1,-24.4,-22.7,-21.0]:
 box('warehouse kick guard',(-7.36,y,.7),(.11,.9,.22),red)
for y in [-16.85,-17.25]:pipe('overhead pressure main',(-2.45,y,3.7),(-7.4,y,3.7),.09)
for x in [-3,-4.5,-6,-7.2]:box('pipe saddle',(x,-17.05,3.7),(.07,.65,.33),iron)
# A few paper seals and iron access covers communicate use without scatter noise.
random.seed(23)
for x,y in [(-1.35,-14.4),(1.45,-10.8),(-3.9,-25.8)]:
 o=box('discarded docket',(x,y,.085),(.16,.24,.005),ivory,.001);o.rotation_euler.z=random.uniform(-.5,.5)
for x,y in [(1.15,-15.4),(-1.8,-26.9)]:
 box('flush service hatch',(x,y,.076),(.65,.8,.025),iron)
 for dx in [-.23,.23]:box('hatch hinge',(x+dx,y,.093),(.035,.58,.012),brass,.003)
# Original rooftop pressure vessels and stack silhouettes give a working district depth.
for x,y,h,r in [(-6,-10,8,.42),(-12,-19,9,.55)]:
 pipe('distant brick flue',(x,y,5.8),(x,y,h),r,mortar)
 for z in [h-.4,h]:pipe('flue rim',(x,y,z-.07),(x,y,z+.07),r+.09,iron)
box('warehouse roof ventilator',(-11,-24.3,7.08),(1.6,2.4,.85),enamel)
for y in [-25.2,-24.8,-24.4,-24,-23.6]:box('ventilator louvre',(-10.15,y,7.1),(.08,.22,.55),iron)

# Resolve images against the verified original, then pack the editable source.
for image in bpy.data.images:
 if image.source=='FILE' and not image.packed_file:
  if 'modular_factory_facade' in image.name:
   candidates=list((root/'art/imports/environment/modular_factory_facade/textures').glob(image.name.split('.')[0]+'*'))
   if candidates:image.filepath=str(candidates[0])
  image.pack()
scene['milestone']='Last Departure / A / street and bonded warehouse visual proof'
scene['art_review']='Awaiting user review; no district progression implemented'
scene['source_baseline']='art/source/ash-quay-district.blend'
bpy.ops.outliner.orphans_purge(do_recursive=True)
bpy.ops.wm.save_as_mainfile(filepath=str(destination),compress=True)
print('CHAPTER_PROOF_AUTHORED',len(scene.objects))
