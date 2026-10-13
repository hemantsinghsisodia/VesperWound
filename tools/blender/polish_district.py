"""Explicit Checkpoint C edit of the saved B master. Never part of normal export."""
import bpy, math, random
from pathlib import Path
from mathutils import Vector
root=Path.cwd(); master=root/'art/source/ash-quay-district.blend'
bpy.ops.wm.open_mainfile(filepath=str(master),load_ui=False)
scene=bpy.context.scene
if scene.get('checkpoint_c_polish'): raise RuntimeError('C polish already authored; edit the saved master instead of reapplying.')
detail=bpy.data.collections.new('10_Quay_Polish_C');scene.collection.children.link(detail)
iron=bpy.data.materials['Quay / patinated iron'];brass=bpy.data.materials['Quay / worn brass']
wood=next(m for m in bpy.data.materials if 'wooden_crate' in m.name)
red=bpy.data.materials['District / oxide paint'];porcelain=bpy.data.materials['Quay / old porcelain']

def material(name,color,rough=.85,metal=0):
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF')
 p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal;return m
joint=material('Dock / repaired mortar',(.09,.10,.095))
paint=material('Dock / faded loading paint',(.30,.25,.13))
damp=material('Dock / damp seams',(.025,.032,.029),.4)

def box(name,p,size,mat,bevel=.012):
 bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.name=name;o.dimensions=size
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat)
 for c in list(o.users_collection):c.objects.unlink(o)
 detail.objects.link(o)
 if bevel:
  b=o.modifiers.new('Worn edge','BEVEL');b.width=bevel;b.segments=1;bpy.ops.object.modifier_apply(modifier=b.name)
 return o
def bar(name,a,b,width,mat):
 a,b=Vector(a),Vector(b);o=box(name,(a+b)/2,(width,width,(b-a).length),mat,.004);o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();return o

# Put the direction board beside the opening, away from the camera-to-player ray.
for o in scene.objects:
 if o.name.startswith(('Court / passage direction board','Court / passage post','Lettering / ARRIVAL QUAY')):o.location.x-=4.5

# Shared scan, deliberately varied UV placement and low-contrast material values.
random.seed(20261013)
base=next(m for m in bpy.data.materials if m.name.startswith('District / weathered concrete'))
stone=[]
for label in ['warm','cool','worn']:
 m=base.copy();m.name='District / dock limestone '+label;stone.append(m)
for o in list(scene.objects):
 if o.name.startswith('Quay / broad stone slab'):
  o.data.materials.clear();o.data.materials.append(random.choices(stone,[5,2,2])[0])
  offset=Vector((random.uniform(0,4),random.uniform(0,4)));angle=random.choice([0,math.pi/2,math.pi,3*math.pi/2])
  for loop in o.data.uv_layers.active.data:
   u,v=loop.uv;loop.uv=(u*math.cos(angle)-v*math.sin(angle)+offset.x,u*math.sin(angle)+v*math.cos(angle)+offset.y)
  # A few repaired corners read as use and wear rather than an even checker.
  if random.random()<.10:
   x,y,z=o.location;box('Dock / inset repair',(x+.5,y+.45,.062),(.32,.25,.007),joint,.003)

# A clear central walking apron; loading marks sit at the working edges.
for z in [19,20.5,22,23.5]:
 box('Dock / loading bay dash',(-3.1,-z,.064),(.09,.65,.007),paint,.002)
for x in [-6.7,-5.5,-4.3]:
 box('Dock / berth limit',(x,-25.7,.064),(.75,.09,.007),paint,.002)
for x,z,length in [(-7.25,23,3.2),(7.5,26,4.1),(-2.7,20,.8),(4.9,23.45,1.4)]:
 box('Dock / damp edge',(x,-z,.063),(.17,length,.005),damp,.002)

# Freight retains the existing collision footprints; add construction and load order.
for x,z in [(-6.55,19.5),(-6.5,21.5)]:
 for side in [-1,1]:
  for h in [.13,1.12]:box('Freight / edge rail',(x+side*.57,-z,h),(.11,1.03,.09),wood)
  bar('Freight / diagonal brace',(x+side*.63,-z-.48,.17),(x+side*.63,-z+.48,1.1),.07,wood)
 for dx in [-.4,.4]:box('Freight / skid',(x+dx,-z,.085),(.16,1.06,.12),wood)
 # Low second parcel, entirely inside the existing crate footprint.
 box('Freight / strapped upper parcel',(x,-z,1.42),(1.08,.85,.38),wood)
 for dx in [-.32,.32]:box('Freight / upper strap',(x+dx,-z,1.42),(.04,.865,.40),iron)
 box('Freight / upper seal',(x,-z-.435,1.43),(.22,.015,.14),porcelain,.002)

# Details are concentrated on the crane, not scattered across combat paths.
for z in [.95,1.6]:box('Crane / oxide collar',(4.8,-24.4,z),(.51,.51,.09),red)
box('Crane / service hatch',(4.8,-24.12,1.12),(.31,.04,.32),iron)
box('Crane / capacity plate',(4.8,-24.08,1.13),(.22,.013,.12),porcelain,.002)
for x in [4.55,5.05]:
 for y in [-24.15,-24.65]:box('Crane / anchor bolt',(x,y,.83),(.075,.075,.05),brass,.005)
# Move free-standing loading lamps against the facade so they cannot mask Medic.
for o in scene.objects:
 if o.name.startswith(('Quay / lamp post','Quay / lamp hood','Quay / amber lamp')) and abs(o.location.x+3.4)<.1:o.location.x=-7.15

scene['checkpoint_c_polish']=True;scene['milestone']='Ash Quay / Checkpoint C / traversal and waterfront polish'
for image in bpy.data.images:
 if image.source=='FILE' and not image.packed_file:image.pack()
bpy.ops.outliner.orphans_purge(do_recursive=True)
bpy.ops.wm.save_as_mainfile(filepath=str(master),compress=True)
print('DISTRICT_POLISH_COMPLETE',len(scene.objects))
