"""Original Iona costume, equipment, rig/clips and Ash Quay kit. Run with Blender 5.2."""
import bpy, math, json, random, sys, zipfile
from pathlib import Path
from mathutils import Vector, Quaternion, Matrix
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/'art/source'; SOURCE.mkdir(exist_ok=True)
variant=sys.argv[sys.argv.index('--')+1] if '--' in sys.argv else 'desktop'
MOBILE=variant=='mobile'; OUT=ROOT/f'art/source/{variant}'; OUT.mkdir(exist_ok=True)
SEG=20 if MOBILE else 32
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
bpy.context.scene.render.fps=30
random.seed(17)

def mat(name,color,metal=0,rough=.6,texture=None,emission=0):
    m=bpy.data.materials.new(name); m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Metallic'].default_value=metal; p.inputs['Roughness'].default_value=rough
    if emission: p.inputs['Emission Color'].default_value=(*color,1); p.inputs['Emission Strength'].default_value=emission
    if texture:
        for suffix,socket in [('diff','Base Color'),('rough','Roughness'),('normal','Normal')]:
            path=ROOT/f'art/downloads/{texture}/{suffix}_{"1k" if MOBILE else "2k"}.jpg'
            if not path.exists(): continue
            tex=m.node_tree.nodes.new('ShaderNodeTexImage'); tex.image=bpy.data.images.load(str(path),check_existing=True)
            if suffix!='diff': tex.image.colorspace_settings.name='Non-Color'
            if suffix=='normal':
                normal=m.node_tree.nodes.new('ShaderNodeNormalMap'); normal.inputs['Strength'].default_value=.5
                m.node_tree.links.new(tex.outputs['Color'],normal.inputs['Color']); m.node_tree.links.new(normal.outputs['Normal'],p.inputs[socket])
            else: m.node_tree.links.new(tex.outputs['Color'],p.inputs[socket])
        ao_path=ROOT/f'art/downloads/{texture}/ao_{"1k" if MOBILE else "2k"}.jpg'
        if ao_path.exists():
            group=bpy.data.node_groups.get('glTF Material Output')
            if not group:
                group=bpy.data.node_groups.new('glTF Material Output','ShaderNodeTree')
                group.interface.new_socket(name='Occlusion',in_out='INPUT',socket_type='NodeSocketFloat')
            node=m.node_tree.nodes.new('ShaderNodeGroup'); node.node_tree=group
            ao=m.node_tree.nodes.new('ShaderNodeTexImage'); ao.image=bpy.data.images.load(str(ao_path),check_existing=True); ao.image.colorspace_settings.name='Non-Color'
            m.node_tree.links.new(ao.outputs['Color'],node.inputs['Occlusion'])
    return m

skin=mat('Iona / warm skin',(.36,.235,.17),rough=.76)
skin_dir=ROOT/'art/downloads/iona-skin'; skin_dir.mkdir(exist_ok=True)
with zipfile.ZipFile(ROOT/'art/downloads/skins01_cc0.zip') as archive:
    for name in ['middleage_eurasian_female_diffuse.png','onlytheghosts_middle_aged_eurasian_female.mhmat']:
        (skin_dir/name).write_bytes(archive.read('skins/onlytheghosts_middle_aged_eurasian_female/'+name))
skin_image=bpy.data.images.load(str(skin_dir/'middleage_eurasian_female_diffuse.png'))
skin_image.scale(1024 if MOBILE else 2048,1024 if MOBILE else 2048)
skin_texture=skin.node_tree.nodes.new('ShaderNodeTexImage'); skin_texture.image=skin_image
skin.node_tree.links.new(skin_texture.outputs['Color'],skin.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
detail_skin=mat('Iona / eyelid skin',(.36,.235,.17),rough=.76)
coat=mat('Iona / waxed charcoal cloth',(.075,.10,.085),rough=.52,texture='denim_fabric')
# Multiply scanned cloth color to the chosen waxcloth palette; bake to PBR below.
p=coat.node_tree.nodes.get('Principled BSDF'); colorlink=next(l for l in coat.node_tree.links if l.to_socket==p.inputs['Base Color'])
mix=coat.node_tree.nodes.new('ShaderNodeMixRGB'); mix.blend_type='MULTIPLY'; mix.inputs[0].default_value=1; mix.inputs[2].default_value=(.12,.20,.17,1)
desaturate=coat.node_tree.nodes.new('ShaderNodeHueSaturation'); desaturate.inputs['Saturation'].default_value=.12
coat.node_tree.links.new(colorlink.from_socket,desaturate.inputs['Color']); coat.node_tree.links.new(desaturate.outputs['Color'],mix.inputs[1]); coat.node_tree.links.new(mix.outputs[0],p.inputs['Base Color'])
leather=mat('Iona / worn leather',(.13,.073,.035),rough=.65)
iron=mat('Black iron',(.075,.105,.10),.72,.36,texture='rusty_metal_04')
iron_shader=iron.node_tree.nodes.get('Principled BSDF'); iron_link=next(l for l in iron.node_tree.links if l.to_socket==iron_shader.inputs['Base Color'])
soot=iron.node_tree.nodes.new('ShaderNodeMixRGB'); soot.blend_type='MULTIPLY'; soot.inputs[0].default_value=1; soot.inputs[2].default_value=(.30,.34,.32,1)
iron.node_tree.links.new(iron_link.from_socket,soot.inputs[1]); iron.node_tree.links.new(soot.outputs[0],iron_shader.inputs['Base Color'])
brass=mat('Oxidized brass',(.40,.27,.10),.75,.32)
porcelain=mat('Old porcelain',(.66,.66,.52),.05,.43)
hair=mat('Iona / dark hair',(.035,.018,.013),rough=.67)
eye=mat('Iona / eye white',(.57,.57,.46),rough=.4)
iris=mat('Iona / dark iris',(.03,.045,.035),rough=.22)
amber=mat('Amber pressure',(.95,.37,.055),rough=.3,emission=4)
cold=mat('Pale pressure',(.23,.70,.54),rough=.25,emission=3)
stone=mat('Ash Quay / worn paving',(.25,.28,.24),rough=.62,texture='cobblestone_floor_08')
wallmat=mat('Ash Quay / masonry',(.21,.25,.22),rough=.82,texture='stone_brick_wall_001')

def finish(o,name,m):
    o.name=name; o.data.materials.append(m)
    if o.type=='MESH':
        for p in o.data.polygons: p.use_smooth=True
    return o

def sphere(name,pos,scale,m,segments=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments or SEG,ring_count=12 if MOBILE else 20,location=pos)
    o=bpy.context.object; o.scale=scale; bpy.ops.object.transform_apply(location=False,rotation=False,scale=True); return finish(o,name,m)

def box(name,pos,size,m,bevel=.03):
    bpy.ops.mesh.primitive_cube_add(size=1,location=pos); o=bpy.context.object; o.scale=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        b=o.modifiers.new('Rounded worn edges','BEVEL'); b.width=bevel; b.segments=2 if MOBILE else 3
        bpy.ops.object.modifier_apply(modifier=b.name)
    return finish(o,name,m)

def tube(name,a,b,r,m,r2=None):
    d=Vector(b)-Vector(a); mid=(Vector(a)+Vector(b))/2
    bpy.ops.mesh.primitive_cone_add(vertices=SEG,radius1=r,radius2=r2 if r2 is not None else r,depth=d.length,location=mid)
    o=bpy.context.object; o.rotation_mode='QUATERNION'; o.rotation_quaternion=d.to_track_quat('Z','Y')
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True); return finish(o,name,m)

def curve(name,points,r,m):
    c=bpy.data.curves.new(name,'CURVE'); c.dimensions='3D'; c.resolution_u=4; c.bevel_depth=r; c.bevel_resolution=2 if MOBILE else 3
    s=c.splines.new('BEZIER'); s.bezier_points.add(len(points)-1)
    for p,v in zip(s.bezier_points,points): p.co=v; p.handle_left_type='AUTO'; p.handle_right_type='AUTO'
    o=bpy.data.objects.new(name,c); bpy.context.collection.objects.link(o); bpy.context.view_layer.objects.active=o; o.select_set(True)
    bpy.ops.object.convert(target='MESH'); o=bpy.context.object; o.select_set(False); return finish(o,name,m)

def ring(name,pos,r,thick,m,rotation=(0,0,0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=r,minor_radius=thick,major_segments=SEG,minor_segments=6 if MOBILE else 8,location=pos,rotation=rotation)
    return finish(bpy.context.object,name,m)

def mesh(name,vertices,faces,m):
    data=bpy.data.meshes.new(name); data.from_pydata(vertices,[],faces); data.update()
    o=bpy.data.objects.new(name,data); bpy.context.collection.objects.link(o); finish(o,name,m)
    # Deterministic projected UVs for offline scanned material use.
    uv=data.uv_layers.new(name='UVMap')
    for p in data.polygons:
        for li in p.loop_indices:
            v=data.vertices[data.loops[li].vertex_index].co; uv.data[li].uv=(v.x*2+v.y*.7,v.z*2+v.y*.7)
    return o

verts=[]; groups={}; groupuv={}; group=''; objuv=[]; body=[]
for l in (ROOT/'art/downloads/base.obj').read_text().splitlines():
    if l.startswith('v '):
        x,y,z=map(float,l.split()[1:4]); height=(y+8.4488)*.106
        verts.append(Vector((x*.106*(.67 if height<1.02 else 1),-z*.106,height)))
    elif l.startswith('vt '): objuv.append(tuple(map(float,l.split()[1:3])))
    elif l.startswith('g '): group=l[2:]; groups.setdefault(group,[]); groupuv.setdefault(group,[])
    elif l.startswith('f '):
        entries=[v.split('/') for v in l.split()[1:]]
        groups[group].append([int(v[0])-1 for v in entries]); groupuv[group].append([int(v[1])-1 if len(v)>1 and v[1] else 0 for v in entries])
def joint(name):
    ids=set(i for f in groups['joint-'+name] for i in f); return sum((verts[i] for i in ids),Vector())/len(ids)

# Retain exposed anatomy only; the body under clothing is intentionally removed.
face_ids=[i for i,f in enumerate(groups['body']) if min(verts[v].z for v in f)>1.51 or (min(verts[v].z for v in f)>1.45 and max(abs(verts[v].x) for v in f)<.095)]
faces=[groups['body'][i] for i in face_ids]
used=sorted(set(i for f in faces for i in f)); remap={v:i for i,v in enumerate(used)}
head=mesh('Iona / original customized MakeHuman head',[verts[i] for i in used],[[remap[i] for i in f] for f in faces],skin)
for polygon,face_id in zip(head.data.polygons,face_ids):
    for li,uv_index in zip(polygon.loop_indices,groupuv['body'][face_id]): head.data.uv_layers.active.data[li].uv=objuv[uv_index]
if not MOBILE:
    bpy.context.view_layer.objects.active=head; sub=head.modifiers.new('Face surface refinement','SUBSURF'); sub.levels=1; bpy.ops.object.modifier_apply(modifier=sub.name)

bpy.ops.object.armature_add(); rig=bpy.context.object; rig.name='Iona_Rig'
bpy.ops.object.mode_set(mode='EDIT'); rig.data.edit_bones.remove(rig.data.edit_bones[0])
spec=[('hips',(0,0,.973),(0,0,1.06),None),('spine',(0,0,1.06),(0,0,1.23),'hips'),('chest',(0,0,1.23),(0,0,1.46),'spine'),('neck',joint('neck'),joint('head'),'chest'),('head',joint('head'),joint('head-2'),'neck')]
for side,letter in [('l','L'),('r','R')]:
    spec += [(f'thigh.{letter}',joint(side+'-upper-leg'),joint(side+'-knee'),'hips'),(f'shin.{letter}',joint(side+'-knee'),joint(side+'-ankle'),f'thigh.{letter}'),(f'foot.{letter}',joint(side+'-ankle'),joint(side+'-foot-2'),f'shin.{letter}'),(f'upper_arm.{letter}',joint(side+'-shoulder'),joint(side+'-elbow'),'chest'),(f'forearm.{letter}',joint(side+'-elbow'),joint(side+'-hand'),f'upper_arm.{letter}'),(f'hand.{letter}',joint(side+'-hand'),joint(side+'-hand-3'),f'forearm.{letter}'),(f'coat.{letter}',(.15 if letter=='L' else -.15,0,.97),(.18 if letter=='L' else -.18,0,.57),'hips')]
for name,a,b,parent in spec:
    bone=rig.data.edit_bones.new(name); bone.head=a; bone.tail=b
    if parent: bone.parent=rig.data.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT')
segments={n:(Vector(a),Vector(b)) for n,a,b,_ in spec}

def bind(o,bone=None):
    if o.type!='MESH': return o
    o.parent=rig; modifier=o.modifiers.new('Iona armature','ARMATURE'); modifier.object=rig
    if bone:
        g=o.vertex_groups.new(name=bone); g.add(list(range(len(o.data.vertices))),1,'REPLACE'); return o
    vg={name:o.vertex_groups.new(name=name) for name in segments}
    for v in o.data.vertices:
        pos=o.matrix_world@v.co
        if pos.z>1.52: weights=[('head',1)]
        elif pos.z>1.43 and abs(pos.x)<.10: weights=[('neck',1)]
        elif .54<pos.z<.99 and abs(pos.x)>.12 and o.name.startswith('Coat'): weights=[('coat.L' if pos.x>0 else 'coat.R',1)]
        else:
            allowed=[n for n in segments if not n.startswith('coat') and n not in ['head','neck']]
            distances=[]
            for n in allowed:
                a,b=segments[n]; d=b-a; t=max(0,min(1,(pos-a).dot(d)/d.length_squared)); distances.append(((pos-(a+d*t)).length,n))
            distances.sort(); nearest=distances[:2]; values=[1/(d+.012)**4 for d,_ in nearest]; total=sum(values)
            weights=[(n,w/total) for (_,n),w in zip(nearest,values)]
        for n,w in weights: vg[n].add([v.index],w,'REPLACE')
    return o
bind(head,'head')

def loft(name,rings,m,open_front=False):
    n=32 if MOBILE else 64; points=[]; faces=[]
    for j,(cx,cy,z,rx,ry) in enumerate(rings):
        for i in range(n):
            angle=-math.pi/2+.12+i/(n-1)*(2*math.pi-.24) if open_front else i/n*math.tau
            wrinkle=1+.015*math.sin(i*1.8+j*.7)
            points.append((cx+rx*math.cos(angle)*wrinkle,cy+ry*math.sin(angle)*wrinkle,z))
    for j in range(len(rings)-1):
        for i in range(n-1 if open_front else n): faces.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
    o=mesh(name,points,faces,m)
    bpy.context.view_layer.objects.active=o
    sub=o.modifiers.new('Tailored smooth surface','SUBSURF'); sub.levels=1 if MOBILE else 2; bpy.ops.object.modifier_apply(modifier=sub.name)
    return bind(o)

loft('Coat / split waxed hem',[(0,0,.59,.29,.19),(0,0,.66,.285,.19),(0,0,.8,.255,.17),(0,0,.94,.21,.155),(0,0,1.07,.16,.13),(0,0,1.22,.185,.15),(0,0,1.36,.23,.16),(0,0,1.44,.21,.12),(0,0,1.49,.095,.085)],coat,True)
loft('Inner working shirt',[(0,0,.97,.145,.11),(0,0,1.12,.145,.125),(0,0,1.32,.19,.14),(0,0,1.45,.19,.10),(0,0,1.50,.08,.07)],leather)
for letter,side in [('L','l'),('R','r')]:
    s=1 if letter=='L' else -1
    for bn in ['upper_arm','forearm']:
        a,b=segments[bn+'.'+letter]
        bind(tube('Coat sleeve / '+bn+'.'+letter,a,b,.068 if bn=='upper_arm' else .06,coat,.058 if bn=='upper_arm' else .045))
    bind(sphere('Tailored shoulder '+letter,joint(side+'-shoulder')+Vector((0,0,-.02)),(.079,.082,.061),coat),f'upper_arm.{letter}')
    bind(sphere('Waxcloth elbow '+letter,joint(side+'-elbow'),(.062,.065,.070),coat),f'forearm.{letter}')
    bind(sphere('Gloved grip '+letter,joint(side+'-hand-3'),(.043,.048,.058),leather),f'hand.{letter}')
    bind(ring('Brass cuff '+letter,joint(side+'-hand'),.047,.006,brass,rotation=(math.pi/2,0,0)),f'hand.{letter}')
    hip=joint(side+'-upper-leg'); knee=joint(side+'-knee'); ankle=joint(side+'-ankle')
    loft('Working trousers '+letter,[(hip.x,hip.y,.96,.085,.10),(hip.x,0,.84,.09,.105),(knee.x,-.025,.55,.07,.09),(knee.x,-.015,.39,.063,.072)],leather)
    bind(tube('Tall boot shaft '+letter,(ankle.x,0,.075),(knee.x,0,.43),.069,leather,.07),f'shin.{letter}')
    bind(box('Boot sole '+letter,(ankle.x,-.085,.038),(.145,.30,.065),iron,.028),f'foot.{letter}')
    bind(sphere('Boot toe '+letter,(ankle.x,-.12,.082),(.079,.145,.065),leather),f'foot.{letter}')
    bind(ring('Boot welt '+letter,(knee.x,0,.40),.073,.008,brass),f'shin.{letter}')
    for z in [.32,.40]: bind(box('Boot strap '+letter,(knee.x,-.064,z),(.09,.026,.026),leather,.007),f'shin.{letter}')
    eye_pos=joint(side+'-eye')
    bind(sphere('Eye '+letter,eye_pos,(.017,.018,.009),eye), 'head')
    bind(sphere('Iris '+letter,eye_pos+Vector((0,-.017,0)),(.006,.002,.006),iris,16),'head')
    bind(curve('Upper eyelid '+letter,[eye_pos+Vector((-.016,-.012,.003)),eye_pos+Vector((0,-.018,.009)),eye_pos+Vector((.016,-.012,.003))],.0028,detail_skin),'head')
    bind(curve('Eyebrow '+letter,[eye_pos+Vector((-.018,-.011,.022)),eye_pos+Vector((0,-.015,.026)),eye_pos+Vector((.018,-.010,.023))],.0027,hair),'head')

bind(sphere('Swept hair cap',(0,-.037,1.756),(.096,.122,.068),hair),'head')
for s in [-1,1]: bind(sphere('Swept temple hair',(s*.078,-.040,1.711),(.013,.063,.035),hair),'head')
bind(sphere('Compact hair bun',(0,.105,1.716),(.061,.057,.050),hair),'head')
for i in range(11):
    x=(i-5)*.014
    bind(curve('Hair swept strand',[(x,-.072,1.747),(x,.01,1.794),(x*.6,.096,1.738)],.0035,hair),'head')
bind(ring('Raised waxcloth collar',(0,0,1.49),.092,.021,coat),'neck')
for s in [-1,1]:
    bind(mesh('Tailored lapel',[(s*.09,-.10,1.48),(s*.145,-.17,1.37),(s*.05,-.169,1.28),(s*.035,-.12,1.48)],[(0,1,2,3)],coat),'chest')
bind(curve('Leather diagonal harness',[(-.18,-.135,1.44),(-.08,-.155,1.30),(.035,-.16,1.15),(.15,-.15,1.04)],.015,leather),'chest')
bind(ring('Harness brass clasp',(-.05,-.171,1.26),.019,.004,brass,rotation=(math.pi/2,0,0)),'chest')
bind(ring('Working belt',(0,0,1.055),.177,.018,leather),'hips')
bind(box('Belt buckle',(0,-.16,1.055),(.055,.013,.035),brass,.004),'hips')
for x in [-.15,.15]: bind(box('Belt pouch',(x,-.08,1.00),(.10,.08,.11),leather,.015),'hips')
for z in [1.14,1.23,1.32,1.41]: bind(sphere('Coat brass button',(.027,-.153,z),(.009,.007,.009),brass,12),'chest')
bind(sphere('Porcelain breath insignia',(.12,-.162,1.37),(.024,.007,.03),porcelain,16),'chest')

def socket(name,pos,bone):
    o=bpy.data.objects.new(name,None); bpy.context.collection.objects.link(o)
    o.parent=rig; o.parent_type='BONE'; o.parent_bone=bone
    parent_matrix=rig.matrix_world@rig.data.bones[bone].matrix_local@Matrix.Translation((0,rig.data.bones[bone].length,0))
    o.matrix_basis=parent_matrix.inverted()@Matrix.Translation(pos); return o
socket('socket_lantern',joint('l-hand-3'),'hand.L'); socket('socket_wake_hook',joint('r-hand-3'),'hand.R')
lantern=joint('l-hand-3')+Vector((0,0,-.19)); x,y,z=lantern
for dz in [-.10,.10]: bind(tube('Lantern cap',(x,y,z+dz-.01),(x,y,z+dz+.01),.09,brass), 'hand.L')
bind(tube('Lantern amber chamber',(x,y,z-.085),(x,y,z+.085),.046,amber),'hand.L')
for i in range(6):
    a=i*math.tau/6; dx=.065*math.cos(a); dy=.065*math.sin(a)
    bind(tube('Lantern cage',(x+dx,y+dy,z-.10),(x+dx,y+dy,z+.10),.005,brass),'hand.L')
bind(curve('Lantern handle',[(x-.07,y,z+.10),(x-.07,y,z+.20),(x+.07,y,z+.20),(x+.07,y,z+.10)],.008,brass),'hand.L')
x,y,z=joint('r-hand-3')
bind(tube('Wake-hook ash shaft',(x,y,z-.76),(x,y,z+.28),.017,leather),'hand.R')
bind(curve('Wake-hook curved blade',[(x,y,z-.76),(x-.03,y,z-.87),(x-.14,y,z-.85),(x-.22,y,z-.69),(x-.20,y,z-.61)],.018,iron),'hand.R')
for dz in [-.15,.20]: bind(ring('Wake-hook grip collar',(x,y,z+dz),.02,.006,brass),'hand.R')

# Consolidate by material while preserving skin groups. Bound geometry remains editable in master .blend.
def consolidate(objects):
    buckets={}
    for o in objects:
        if o.type=='MESH': buckets.setdefault(o.data.materials[0].name,[]).append(o)
    for name,objs in buckets.items():
        bpy.ops.object.select_all(action='DESELECT')
        for o in objs: o.select_set(True)
        bpy.context.view_layer.objects.active=objs[0]
        if len(objs)>1: bpy.ops.object.join()
        bpy.context.object.name=name

def bake_vertex_ao(objects):
    """Deterministic short-range geometric AO, separate from the scanned surface AO."""
    points=[]; faces=[]
    for o in objects:
        offset=len(points); points.extend(o.matrix_world@v.co for v in o.data.vertices)
        faces.extend(tuple(offset+i for i in p.vertices) for p in o.data.polygons)
    tree=BVHTree.FromPolygons(points,faces)
    for o in objects:
        colors=o.data.color_attributes.new(name='Baked contact AO',type='FLOAT_COLOR',domain='POINT')
        o.data.color_attributes.active_color=colors
        for vertex in o.data.vertices:
            origin=o.matrix_world@vertex.co; n=(o.matrix_world.to_3x3()@vertex.normal).normalized()
            tangent=n.cross(Vector((0,0,1)))
            if tangent.length<.01: tangent=n.cross(Vector((0,1,0)))
            tangent.normalize(); bitangent=n.cross(tangent)
            occlusion=0
            for i in range(8):
                a=i*2.39996; r=math.sqrt((i+.5)/8)*.88
                direction=(tangent*math.cos(a)*r+bitangent*math.sin(a)*r+n*math.sqrt(1-r*r)).normalized()
                hit=tree.ray_cast(origin+n*.015,direction,.65)
                if hit[0] is not None: occlusion+=max(0,1-hit[3]/.65)
            value=1-.55*occlusion/8
            colors.data[vertex.index].color=(value,value,value,1)
def pose_world(name,axis,angle):
    b=rig.pose.bones[name]; q=b.bone.matrix_local.to_quaternion()
    b.rotation_mode='QUATERNION'; b.rotation_quaternion=q.inverted()@Quaternion(Vector(axis),angle)@q

def leg_ik(letter,foot_y,foot_z,hip_offset):
    """Analytic sagittal two-bone pose. Keep planted boots flat against the paving."""
    hip,knee=segments['thigh.'+letter]; _,ankle=segments['shin.'+letter]
    l1=math.hypot(knee.y-hip.y,knee.z-hip.z); l2=math.hypot(ankle.y-knee.y,ankle.z-knee.z)
    dy=foot_y-hip.y; dz=foot_z-(hip.z+hip_offset); d=min(math.hypot(dy,dz),l1+l2-.0005)
    direction=math.atan2(dy,-dz)
    upper=direction-math.acos(max(-1,min(1,(l1*l1+d*d-l2*l2)/(2*l1*d))))
    lower=direction+math.acos(max(-1,min(1,(l2*l2+d*d-l1*l1)/(2*l2*d))))
    rest_upper=math.atan2(knee.y-hip.y,hip.z-knee.z); rest_lower=math.atan2(ankle.y-knee.y,knee.z-ankle.z)
    a=upper-rest_upper; b=lower-rest_lower-a
    pose_world('thigh.'+letter,(1,0,0),a); pose_world('shin.'+letter,(1,0,0),b)
    pose_world('foot.'+letter,(1,0,0),-a-b)
    return a

for clip,duration in [('idle',2),('walk',1),('run',.7),('attack',1.2),('dodge',.9)]:
    rig.animation_data_create(); rig.animation_data.action=bpy.data.actions.new(clip)
    frames=round(duration*30)
    for frame in range(frames+1):
        t=frame/frames; phase=t*math.tau
        for b in rig.pose.bones: b.rotation_mode='QUATERNION'; b.rotation_quaternion=Quaternion(); b.location=(0,0,0)
        for letter,s in [('L',1),('R',-1)]:
            pose_world('upper_arm.'+letter,(0,1,0),s*.50)
            pose_world('hand.'+letter,(0,1,0),-s*.50)
            pose_world('coat.'+letter,(1,0,0),math.sin(phase)*.025)
        pose_world('chest',(1,0,0),math.sin(phase)*.013)
        if clip in ['walk','run']:
            stride=.15 if clip=='walk' else .24; swing=math.sin(phase)
            hip_offset=-.035+abs(swing)*(.008 if clip=='walk' else .016)
            for letter,s in [('L',1),('R',-1)]:
                ankle=segments['shin.'+letter][1]
                lift=max(0,math.cos(phase)*s)*(.07 if clip=='walk' else .12)
                thigh=leg_ik(letter,ankle.y-swing*s*stride,ankle.z+lift,hip_offset)
                pose_world('upper_arm.'+letter,(0,1,0),s*.5)
                # A small forearm swing protects the lantern / hook grip alignment.
                pose_world('forearm.'+letter,(1,0,0),-swing*s*.12)
                pose_world('coat.'+letter,(1,0,0),thigh*.35)
            b=rig.pose.bones['hips']; b.location=b.bone.matrix_local.to_3x3().inverted()@Vector((0,0,hip_offset))
            pose_world('chest',(1,0,0),-.04 if clip=='walk' else -.10)
        elif clip=='attack':
            envelope=math.sin(math.pi*t)**2; twist=math.sin(phase)*.45
            pose_world('chest',(0,0,1),twist)
            pose_world('upper_arm.R',(0,1,0),-.5-envelope*.9)
            pose_world('forearm.R',(1,0,0),-envelope*.4)
            pose_world('coat.R',(1,0,0),envelope*.20)
        elif clip=='dodge':
            env=math.sin(math.pi*t)**2
            hip_offset=-.20*env
            b=rig.pose.bones['hips']; b.location=b.bone.matrix_local.to_3x3().inverted()@Vector((0,0,hip_offset))
            for letter,s in [('L',1),('R',-1)]:
                ankle=segments['shin.'+letter][1]; leg_ik(letter,ankle.y+s*.08*env,ankle.z,hip_offset)
            pose_world('chest',(1,0,0),-.15*env)
        for b in rig.pose.bones:
            b.keyframe_insert(data_path='rotation_quaternion',frame=frame+1); b.keyframe_insert(data_path='location',frame=frame+1)
    rig.animation_data.action.use_fake_user=True
rig.animation_data.action=None
for b in rig.pose.bones: b.rotation_quaternion=Quaternion(); b.location=(0,0,0)

# Baking the tinted cloth color retains the selected palette in standard GLB materials.
cloth_object=next(o for o in bpy.context.scene.objects if o.type=='MESH' and o.data.materials[0]==coat)
bpy.context.scene.render.engine='CYCLES'; bpy.context.scene.cycles.samples=8
image=bpy.data.images.new('Iona waxcloth baked',width=1024 if MOBILE else 2048,height=1024 if MOBILE else 2048)
target=coat.node_tree.nodes.new('ShaderNodeTexImage'); target.image=image; coat.node_tree.nodes.active=target
bpy.ops.object.select_all(action='DESELECT')
bpy.ops.mesh.primitive_plane_add(size=2)
bake_plane=bpy.context.object; bake_plane.data.materials.append(coat)
bpy.context.scene.render.bake.use_pass_direct=False; bpy.context.scene.render.bake.use_pass_indirect=False; bpy.context.scene.render.bake.use_pass_color=True
bpy.ops.object.bake(type='DIFFUSE',margin=8)
coat.node_tree.links.new(target.outputs['Color'],p.inputs['Base Color'])
image.pack()
bpy.data.objects.remove(bake_plane,do_unlink=True)
for img in bpy.data.images:
    if img.has_data: img.pack()
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/f'iona-{variant}.blend'))
# Keep the editable source detail, then reduce only the exported derivative.
consolidate([o for o in bpy.context.scene.objects if o.type=='MESH'])
hero_meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
total=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in hero_meshes)
ratio=min(1,(16000 if MOBILE else 42000)/total)
for o in hero_meshes:
    bpy.context.view_layer.objects.active=o
    for mod in list(o.modifiers):
        if mod.type=='ARMATURE': o.modifiers.remove(mod)
    dec=o.modifiers.new('Runtime detail reduction','DECIMATE'); dec.ratio=ratio
    bpy.ops.object.modifier_apply(modifier=dec.name)
    mod=o.modifiers.new('Iona armature','ARMATURE'); mod.object=rig
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(OUT/'iona.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_nla_strips=False,export_yup=True,export_extras=True)
stats={'variant':variant,'heroTriangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in bpy.context.scene.objects if o.type=='MESH'),'clips':['idle','walk','run','attack','dodge']}
print('IONA_STATS',json.dumps(stats))
(OUT/'stats.json').write_text(json.dumps(stats,indent=2))

# Environment collection is built as a separate reusable Blender master.
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
box('Stone foundation',(0,0,-.3),(16.3,16.3,.6),wallmat,.12)
floor=box('Wet scanned paving',(0,0,-.02),(16,16,.12),stone,.04)
# Planar floor UVs maintain a 2-metre material repeat; other kit UVs use object-scale projection.
for li in range(len(floor.data.loops)):
    v=floor.data.vertices[floor.data.loops[li].vertex_index].co; floor.data.uv_layers.active.data[li].uv=(v.x/2,v.y/2)
for x in [-7.9,7.9]:
    box('Boundary masonry',(x,1.7,1.1),(.48,12.5,2.2),wallmat,.05)
    box('Boundary coping',(x,1.7,2.25),(.62,12.6,.18),stone,.06)
box('Intake back wall',(0,7.85,2.6),(16,.55,5.2),wallmat,.06)
for x in [-6,-3,3,6]:
    box('Stone buttress',(x,7.35,2.25),(.62,.8,4.5),wallmat,.05)
    box('Buttress capital',(x,7.35,4.6),(.9,1,.22),stone,.06)
    for z in [.15,1.15,2.15,3.15,4.15]: box('Buttress masonry seam',(x,6.92,z),(.64,.025,.045),iron,.004)
for x in [-4.8,4.8]:
    box('Raised landing',(x,5.0,.42),(3.4,4.8,.85),wallmat,.06)
    for i in range(5): box('Landing stair',(x,2.0+i*.35,.07+i*.085),(3.3,.4,.16+i*.17),stone,.045)
    # Two arch jambs and fitted voussoirs around original industrial gates.
    for dx in [-.8,.8]: box('Gate jamb',(x+dx,7.0,1.8),(.32,.5,2.2),stone,.025)
    for i in range(11):
        a=i/10*math.pi
        o=box('Gate arch stone',(x+math.cos(a)*.95,7.0,2.85+math.sin(a)*.95),(.3,.55,.34),stone,.025); o.rotation_euler.y=a-math.pi/2
    box('Black iron intake gate',(x,7.28,1.9),(1.4,.08,2.4),iron,.02)
    for dx in [-.6,-.3,0,.3,.6]: tube('Gate brass bars',(x+dx,7.15,.8),(x+dx,7.15,3.0),.018,brass)
for x in [-6.8,6.8]:
    for z in [1.15,1.8,2.4]:
        curve('Wall pipe',[(x,6.9,z),(x,2,z),(x,1,z-.2),(x,-1,.18)],.065,iron)
        for y in [2,4,6]: ring('Pipe compression joint',(x,y,z),.085,.012,brass,rotation=(math.pi/2,0,0))
for x in [-2.8,2.8]:
    box('Drain channel',(x,0,.025),(.45,15,.07),iron,.01)
    for y in [i*.32-7 for i in range(45)]: box('Drain grate',(x,y,.075),(.46,.035,.04),iron,.004)
# Central boiler: layered silhouette, bolts, flues, pressure chamber, gauges and conduits.
E=Vector((0,2,0))
def ep(v): return E+Vector(v)
tube('Engine stone cradle',ep((0,0,.08)),ep((0,0,.5)),1.55,stone)
for z,r in [(.5,1.18),(.7,1.05),(1.35,.85),(2.7,.75),(3.0,.94)]:
    tube('Engine iron shell',ep((0,0,z-.1)),ep((0,0,z+.12)),r,iron)
    ring('Engine brass seam',ep((0,0,z+.13)),r,.025,brass)
tube('Pressure chamber',ep((0,0,1.45)),ep((0,0,2.7)),.53,cold)
tube('Lower boiler body',ep((0,0,.75)),ep((0,0,1.45)),.82,iron)
for i in range(12):
    a=i*math.tau/12; x=.66*math.cos(a); y=.66*math.sin(a)
    tube('Chamber iron cage',ep((x,y,1.35)),ep((x,y,2.9)),.045,brass)
    for z in [.8,1.3,2.8,3.1]: sphere('Riveted brass collar',ep((.88*math.cos(a),.88*math.sin(a),z)),(.024,.024,.024),brass,12)
for x,z in [(-.55,4.15),(0,4.7),(.55,4.35)]:
    tube('Exhaust chimney',ep((x,.2,3.0)),ep((x,.2,z)),.13,iron)
    for height in [3.15,z-.15,z]: ring('Chimney collar',ep((x,.2,height)),.16,.024,brass)
for x in [-.47,.47]:
    tube('Pressure gauge bezel',ep((x,-.8,1.05)),ep((x,-.85,1.05)),.16,brass)
    tube('Pressure gauge porcelain',ep((x,-.85,1.05)),ep((x,-.862,1.05)),.13,porcelain)
    tube('Gauge needle',ep((x,-.866,1.05)),ep((x+.075,-.867,1.13)),.009,iron)
    for i in range(10):
        a=i/9*math.pi; box('Gauge tick',ep((x+math.cos(a)*.10,-.87,1.05+math.sin(a)*.10)),(.012,.007,.015),iron,.001)
for side in [-1,1]:
    curve('Pressure conduit',[ep((side*.8,0,2.8)),ep((side*1.3,0,2.9)),ep((side*1.65,.3,1.8)),ep((side*1.65,.3,.2)),(side*6.8,3,.2)],.085,iron)
    sphere('Porcelain flow regulator',ep((side*.95,-.6,.70)),(.13,.15,.3),porcelain)
for x,y in [(-6,0),(6,0),(-5.5,5.5),(5.5,5.5)]:
    tube('Lamp iron post',(x,y,.15),(x,y,2.5),.055,iron)
    tube('Lamp cap',(x,y,2.45),(x,y,2.55),.18,brass)
    tube('Lamp warm glass',(x,y,2.1),(x,y,2.45),.10,amber)
    for i in range(4):
        a=i*math.tau/4; tube('Lamp cage',(x+.12*math.cos(a),y+.12*math.sin(a),2.1),(x+.12*math.cos(a),y+.12*math.sin(a),2.45),.009,iron)
    ring('Lamp base trim',(x,y,2.1),.13,.018,brass)
# Original waxcloth-covered bundles and selected free crate prop.
for x,y in [(-6,4),(6,5),(-6.4,-2)]:
    box('Waxcloth covered stores',(x,y,.43),(1.2,.9,.85),leather,.12)
    for offset in [-.4,.4]: curve('Bundle leather strap',[(x+offset,y-.5,.15),(x+offset,y-.5,.88),(x+offset,y+.5,.88),(x+offset,y+.5,.15)],.012,iron)
crate_path=ROOT/'art/downloads/wooden_crate_01/wooden_crate_01.blend'
with bpy.data.libraries.load(str(crate_path),link=False) as (available,loaded): loaded.objects=[name for name in available.objects if 'crate' in name.lower()]
crate_objects=[]
for o in loaded.objects:
    if o and o.type=='MESH': bpy.context.collection.objects.link(o); crate_objects.append(o)
if crate_objects:
    for o in crate_objects:
        o.location=Vector((-5.3,1.6,.1)); o.scale*=.65
        for pos in [(5.5,3.6,.1),(-5.2,4.0,.1)]:
            c=o.copy(); c.data=o.data; bpy.context.collection.objects.link(c); c.location=pos; c.rotation_euler.z=.4
for i in range(35 if not MOBILE else 15):
    x=random.choice([-1,1])*random.uniform(4.8,7.5); y=random.uniform(-6,6)
    o=box('Restrained stone debris',(x,y,.08),(random.uniform(.06,.23),random.uniform(.06,.20),.09),stone,.02); o.rotation_euler.z=random.uniform(0,math.tau)
print('Baking courtyard contact AO')
for o in bpy.context.scene.objects:
    if o.type=='MESH' and o.data.users>1: o.data=o.data.copy()
bake_vertex_ao([o for o in bpy.context.scene.objects if o.type=='MESH'])
for action in list(bpy.data.actions): bpy.data.actions.remove(action)
bpy.data.orphans_purge(do_recursive=True)
for img in bpy.data.images:
    if img.has_data: img.pack()
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/f'ash-quay-{variant}.blend'))
consolidate([o for o in bpy.context.scene.objects if o.type=='MESH'])
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(OUT/'ash-quay.glb'),export_format='GLB',use_selection=True,export_animations=False,export_yup=True,export_vertex_color='ACTIVE')
print('VISUAL_ASSETS_COMPLETE',variant)
