"""Explicit authoring pass. Saves a WORK file; normal builds only read the master."""
import bpy, sys, math, json, random, numpy as np
from pathlib import Path
from mathutils import Vector, Quaternion, Matrix
from mathutils.bvhtree import BVHTree
sys.path.insert(0,str(Path(__file__).parent))
from iona_geometry import material, mesh, surface, sphere, tube, curve, box, ring, interpolate, garment_body, sleeve, boot, hair_lock
ROOT=Path(__file__).resolve().parents[2]; WORK=ROOT/'art/work'; WORK.mkdir(exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
random.seed(41); bpy.context.scene.render.fps=30
def collection(name):
    c=bpy.data.collections.new(name); bpy.context.scene.collection.children.link(c); return c
reference=collection('Anatomy reference — complete body'); sculpt=collection('Sculpt and garment construction')
groom=collection('Hair groom — editable curves'); controls=collection('Rig and attachments')
tiers={name:collection('Export_'+name) for name in ['cinematic','desktop','mobile']}

skin=material('Iona.Skin',(.45,.29,.22),rough=.52)
image=bpy.data.images.load(str(ROOT/'art/downloads/iona-skin/middleage_eurasian_female_diffuse.png'))
node=skin.node_tree.nodes.new('ShaderNodeTexImage'); node.image=image
p=skin.node_tree.nodes.get('Principled BSDF'); skin.node_tree.links.new(node.outputs['Color'],p.inputs['Base Color'])
p.inputs['Subsurface Weight'].default_value=.08
cloth=material('Iona.Waxcloth',(.037,.042,.035),rough=.61)
leather=material('Iona.Leather',(.075,.038,.022),rough=.55)
brass=material('Iona.Brass',(.32,.22,.095),metal=.85,rough=.38)
iron=material('Iona.Iron',(.035,.044,.039),metal=.78,rough=.46)
porcelain=material('Iona.Porcelain',(.55,.54,.45),rough=.36)
hair=material('Iona.Hair',(.024,.013,.008),rough=.48)
scalp=material('Iona.Scalp',(.025,.014,.008),rough=.62)
scalp.node_tree.nodes.get('Principled BSDF').inputs['Specular IOR Level'].default_value=.18
eye=material('Iona.Eyes',(.58,.52,.41),rough=.14)
iris=material('Iona.Iris',(.07,.083,.055),rough=.23)
pupil=material('Iona.Pupil',(.002,.002,.002),rough=.12)
amber=material('Iona.Amber',(.9,.30,.035),rough=.38)
p=amber.node_tree.nodes.get('Principled BSDF'); p.inputs['Emission Color'].default_value=(1,.29,.035,1); p.inputs['Emission Strength'].default_value=1.4

# Original wear, textile and leather maps, with UV-aligned stitching/contact wear.
def maps(mat,kind,size=2048):
    rng=np.random.default_rng(42); y,x=np.mgrid[0:size,0:size].astype(np.float32); u=x/size; v=y/size
    noise=rng.random((size,size),dtype=np.float32)
    weave=np.sin(x*1.8)*np.sin(y*1.8)
    seam=np.exp(-np.minimum(np.minimum(u,1-u),np.minimum(v,1-v))*110)
    abrasion=(np.sin(u*41+np.sin(v*23))*np.sin(v*59+u*16)>.84).astype(np.float32)
    base=np.array((.12,.13,.108) if kind=='cloth' else (.17,.10,.052),dtype=np.float32)
    # Broad damp patches, accumulated dust and fine scratches share the garment
    # UV domain. They are authored maps, not lighting-dependent tinting.
    patches=np.sin(u*27+np.sin(v*17))*np.sin(v*31+np.sin(u*19))
    flecks=((noise>.985)&(patches>.1)).astype(np.float32)
    value=(.74+.19*noise+.035*weave+.28*seam+.23*abrasion+.12*patches+.45*flecks)
    rgb=np.clip(value[:,:,None]*base,0,1)
    rough=np.clip((.63 if kind=='cloth' else .54)+.15*(noise-.5)+.12*patches+.08*abrasion-.08*seam,0,1)
    height=.002*weave+.008*np.sin(u*40+v*3)*np.sin(v*55)+.015*seam
    dx=np.gradient(height,axis=1)*size; dy=np.gradient(height,axis=0)*size
    normal=np.stack((-dx*.09,-dy*.09,np.ones_like(dx)),axis=-1); normal/=np.linalg.norm(normal,axis=-1)[:,:,None]
    for suffix,data in [('color',rgb),('normal',normal*.5+.5),('roughness',np.repeat(rough[:,:,None],3,axis=2))]:
        rgba=np.concatenate((data,np.ones((size,size,1),dtype=np.float32)),axis=2).astype(np.float32)
        img=bpy.data.images.new('Iona '+kind+' '+suffix,width=size,height=size)
        if suffix!='color': img.colorspace_settings.name='Non-Color'
        img.pixels.foreach_set(rgba.ravel()); img.filepath_raw=str(WORK/(kind+'-'+suffix+'.png')); img.file_format='PNG'; img.save(); img.pack()
        n=mat.node_tree.nodes.new('ShaderNodeTexImage'); n.image=img
        p=mat.node_tree.nodes.get('Principled BSDF')
        if suffix=='normal':
            m=mat.node_tree.nodes.new('ShaderNodeNormalMap'); m.inputs['Strength'].default_value=.32
            mat.node_tree.links.new(n.outputs['Color'],m.inputs['Color']); mat.node_tree.links.new(m.outputs['Normal'],p.inputs['Normal'])
        else: mat.node_tree.links.new(n.outputs['Color'],p.inputs['Base Color' if suffix=='color' else 'Roughness'])
maps(cloth,'cloth'); maps(leather,'leather',1024)

# Hair opacity comprises many individual fibres, with coverage-preserving margins.
size=1024; y,x=np.mgrid[0:size,0:size].astype(np.float32); u=x/size; v=y/size
alpha=np.zeros((size,size),dtype=np.float32)
for i in range(27):
    center=(i+.5)/27+.008*np.sin(v*6+i*.8)
    a=np.exp(-((u-center)/(.002+.001*(i%3)))**2)*np.clip((1-v)*14,0,1)*np.clip(v*20,0,1)
    alpha=np.maximum(alpha,a)
data=np.empty((size,size,4),dtype=np.float32); data[:,:,:3]=np.stack([np.full_like(u,.035),np.full_like(u,.018),np.full_like(u,.009)],axis=-1); data[:,:,3]=alpha
img=bpy.data.images.new('Iona strand atlas',width=size,height=size,alpha=True); img.pixels.foreach_set(data.ravel()); img.filepath_raw=str(WORK/'hair-strands.png'); img.file_format='PNG'; img.save(); img.pack()
n=hair.node_tree.nodes.new('ShaderNodeTexImage'); n.image=img; hp=hair.node_tree.nodes.get('Principled BSDF')
hair.node_tree.links.new(n.outputs['Color'],hp.inputs['Base Color']); hair.node_tree.links.new(n.outputs['Alpha'],hp.inputs['Alpha'])
hair.surface_render_method='DITHERED'; hair.use_backface_culling=False
hp.inputs['Roughness'].default_value=.67; hp.inputs['Specular IOR Level'].default_value=.18
hp.inputs['Anisotropic'].default_value=.5
# Subtle fibre relief in the fitted inner layer prevents a polished-cap finish.
n=scalp.node_tree.nodes.new('ShaderNodeTexNoise'); n.inputs['Scale'].default_value=280
b=scalp.node_tree.nodes.new('ShaderNodeBump'); b.inputs['Strength'].default_value=.28; b.inputs['Distance'].default_value=.001
scalp.node_tree.links.new(n.outputs['Fac'],b.inputs['Height']); scalp.node_tree.links.new(b.outputs['Normal'],scalp.node_tree.nodes.get('Principled BSDF').inputs['Normal'])

# Licensed macro morphs are applied to original topology and all rig landmarks.
raw=[]; groups={}; groupuv={}; uvs=[]; group=''
for l in (ROOT/'art/downloads/base.obj').read_text().splitlines():
    if l.startswith('v '): raw.append(Vector(tuple(map(float,l.split()[1:4]))))
    elif l.startswith('vt '): uvs.append(tuple(map(float,l.split()[1:3])))
    elif l.startswith('g '): group=l[2:]; groups.setdefault(group,[]); groupuv.setdefault(group,[])
    elif l.startswith('f '):
        entries=[s.split('/') for s in l.split()[1:]]; groups[group].append([int(s[0])-1 for s in entries]); groupuv[group].append([int(s[1])-1 for s in entries])
for target,weight in [('caucasian-female-young',1),('universal-female-young-averagemuscle-averageweight',1),('head-oval',.18),('head-age-incr',.10)]:
    for l in (ROOT/f'art/downloads/iona-morphs/{target}.target').read_text().splitlines():
        if not l or l.startswith('#'): continue
        values=l.split(); raw[int(values[0])]+=Vector(tuple(map(float,values[1:4])))*weight
verts=[]
for p in raw:
    z=(p.y+8.4488)*.106; width=.82 if z<1.02 else 1
    v=Vector((p.x*.106*width,-p.z*.106,z))
    # Original facial sculpt: softer jaw, stronger cheek planes, less spherical cranium.
    if 1.53<v.z<1.75 and v.y<-.03:
        jaw=math.exp(-((v.z-1.56)/.05)**2); v.x*=1-.07*jaw
        v.y-=.003*math.exp(-((abs(v.x)-.043)/.024)**2-((v.z-1.67)/.04)**2)
    verts.append(v)
def joint(name):
    ids=set(i for f in groups['joint-'+name] for i in f); return sum((verts[i] for i in ids),Vector())/len(ids)
def anatomy(name,predicate,mat,col):
    ids=[i for i,f in enumerate(groups['body']) if predicate([verts[v] for v in f])]
    used=sorted(set(v for i in ids for v in groups['body'][i])); lookup={v:i for i,v in enumerate(used)}
    o=mesh(name,[verts[v] for v in used],[[lookup[v] for v in groups['body'][i]] for i in ids],mat,collection=col)
    for p,i in zip(o.data.polygons,ids):
        for li,uv in zip(p.loop_indices,groupuv['body'][i]): o.data.uv_layers.active.data[li].uv=uvs[uv]
    return o
body=anatomy('Complete anatomical deformation reference',lambda f:True,skin,reference)
body.hide_render=True; reference.hide_viewport=True

# Exactly 63 deform bones; controls are kept outside the exported armature.
bpy.ops.object.armature_add(); rig=bpy.context.object; rig.name='Iona_Rig'; controls.objects.link(rig)
for c in list(rig.users_collection):
    if c!=controls: c.objects.unlink(rig)
bpy.ops.object.mode_set(mode='EDIT'); rig.data.edit_bones.remove(rig.data.edit_bones[0])
spec=[('hips',(0,0,.973),(0,0,1.06),None),('spine',(0,0,1.06),(0,0,1.23),'hips'),('chest',(0,0,1.23),(0,0,1.46),'spine'),('neck',joint('neck'),joint('head'),'chest'),('head',joint('head'),joint('head-2'),'neck')]
for side,letter in [('l','L'),('r','R')]:
    spec += [(f'clavicle.{letter}',joint(side+'-clavicle'),joint(side+'-shoulder'),'chest'),
        (f'thigh.{letter}',joint(side+'-upper-leg'),joint(side+'-knee'),'hips'),(f'shin.{letter}',joint(side+'-knee'),joint(side+'-ankle'),f'thigh.{letter}'),
        (f'foot.{letter}',joint(side+'-ankle'),joint(side+'-foot-2'),f'shin.{letter}'),
        (f'upper_arm.{letter}',joint(side+'-shoulder'),joint(side+'-elbow'),f'clavicle.{letter}'),(f'forearm.{letter}',joint(side+'-elbow'),joint(side+'-hand'),f'upper_arm.{letter}'),
        (f'hand.{letter}',joint(side+'-hand'),joint(side+'-hand-3'),f'forearm.{letter}'),(f'eye.{letter}',joint(side+'-eye'),joint(side+'-eye')+Vector((0,-.025,0)),'head')]
    for part in ['upper_arm','forearm']:
        a=joint(side+('-shoulder' if part=='upper_arm' else '-elbow')); b=joint(side+('-elbow' if part=='upper_arm' else '-hand'))
        spec.append((f'{part}_twist.{letter}',a.lerp(b,.45),a.lerp(b,.8),f'{part}.{letter}'))
    for finger in range(1,6):
        for segment in range(1,4): spec.append((f'finger{finger}_{segment}.{letter}',joint(f'{side}-finger-{finger}-{segment}'),joint(f'{side}-finger-{finger}-{segment+1}'),f'hand.{letter}' if segment==1 else f'finger{finger}_{segment-1}.{letter}'))
    sign=1 if letter=='L' else -1
    for back in [False,True]:
        name=('coat_back.' if back else 'coat.')+letter; y=.10 if back else -.10
        spec.extend([(name,(sign*.13,y,1.02),(sign*.19,y,.76),'hips'),(name.replace('.', '_tip.'),(sign*.19,y,.76),(sign*.24,y,.49),name)])
for name,a,b,parent in spec:
    bone=rig.data.edit_bones.new(name); bone.head=a; bone.tail=b
    if parent: bone.parent=rig.data.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT'); assert len(spec)==63,len(spec)
segments={n:(Vector(a),Vector(b)) for n,a,b,_ in spec}
def bind(o,bone=None):
    o.parent=rig
    o['iona_bone']=bone or ''
    if o.type!='MESH':
        if bone:
            o.parent_type='BONE'; o.parent_bone=bone
            rest=rig.matrix_world@rig.data.bones[bone].matrix_local@Matrix.Translation((0,rig.data.bones[bone].length,0))
            o.matrix_basis=rest.inverted()
        return o
    mod=o.modifiers.new('Authored deformation','ARMATURE'); mod.object=rig
    if bone:
        g=o.vertex_groups.new(name=bone); g.add(list(range(len(o.data.vertices))),1,'REPLACE'); return o
    vg={n:o.vertex_groups.new(name=n) for n in segments}
    for vertex in o.data.vertices:
        p=o.matrix_world@vertex.co
        if p.z>1.53: weights=[('head',1)]
        elif o.name.startswith('Coat') and p.z<1.01:
            letter='L' if p.x>0 else 'R'; root=('coat_back.' if p.y>0 else 'coat.')+letter; tip=root.replace('.','_tip.')
            t=max(0,min(1,(.85-p.z)/.30)); weights=[(root,1-t),(tip,t)]
        else:
            allowed=[n for n in segments if not n.startswith(('coat','eye')) and 'twist' not in n and (p.z>1.0 or not n.startswith(('finger','hand','forearm','upper_arm','clavicle','neck','head')))]
            if o.name.startswith('Anatomical glove'):
                side='L' if p.x>0 else 'R'
                allowed=[n for n in segments if n.endswith('.'+side) and n.startswith(('finger','hand','forearm')) and 'twist' not in n]
            distances=[]
            for n in allowed:
                a,b=segments[n]; d=b-a; t=max(0,min(1,(p-a).dot(d)/d.length_squared)); distances.append(((p-a-d*t).length,n))
            distances.sort(); near=distances[:4]; values=[1/(d+.008)**5 for d,n in near]; total=sum(values)
            weights=[(n,w/total) for (_,n),w in zip(near,values)]
        for n,w in weights:
            if w>.00001: vg[n].add([vertex.index],w,'REPLACE')
    return o
bind(body)

def sub(o,levels):
    if levels:
        m=o.modifiers.new('Retopology refinement','SUBSURF'); m.levels=levels; m.render_levels=levels
    return o

for tier,col in tiers.items():
    nu,nv=(72,36) if tier=='cinematic' else (40,20) if tier=='desktop' else (20,12)
    seg=36 if tier=='cinematic' else 24 if tier=='desktop' else 12
    head=anatomy('Face and neck / '+tier,lambda f:min(v.z for v in f)>1.46,skin,col); sub(head,2 if tier=='cinematic' else 0); bind(head,'head')
    head['iona_semantic']='skin'
    scalp_tree=BVHTree.FromPolygons([v.co for v in head.data.vertices],[list(p.vertices) for p in head.data.polygons])
    coat=surface('Coat / tailored split panels / '+tier,garment_body,nu,nv,cloth,col); bind(coat)
    solid=coat.modifiers.new('Garment thickness','SOLIDIFY'); solid.thickness=.003; solid.offset=0
    for letter,side in [('L','l'),('R','r')]:
        sign=1 if letter=='L' else -1
        a,b=segments['upper_arm.'+letter]; _,c=segments['forearm.'+letter]
        bind(surface('Continuous coat sleeve '+letter+' / '+tier,lambda u,v:sleeve(u,v,a,b,c),nu//2,nv,cloth,col))
        hands=anatomy('Anatomical glove '+letter+' / '+tier,lambda f:min(sign*v.x for v in f)>.405 and max(v.z for v in f)<1.225,leather,col)
        shell=hands.modifiers.new('Leather glove thickness','SOLIDIFY'); shell.thickness=.0015
        sub(hands,1 if tier=='cinematic' else 0); bind(hands)
        hip,knee=segments['thigh.'+letter]; _,ankle=segments['shin.'+letter]
        def trouser(u,v):
            z,rx,ry=interpolate([(.39,.06,.068),(.55,.065,.08),(.79,.077,.094),(.99,.082,.10)],v)
            x=knee.x*(1-v)+hip.x*v; angle=u*math.tau; w=.004*math.sin(z*69+angle*4)
            return (x+(rx+w)*math.cos(angle),-.012+(ry+w)*math.sin(angle),z)
        bind(surface('Trousers '+letter+' / '+tier,trouser,nu//2,nv//2,cloth,col))
        bind(surface('Shaped boot '+letter+' / '+tier,lambda u,v:boot(u,v,ankle.x),nu//2,nv//2,leather,col))
        bind(box('Boot heel '+letter+' / '+tier,(ankle.x,.022,.034),(.105,.10,.045),iron,col,.005),'foot.'+letter)
        for z in [.32,.415]:
            bind(ring('Boot leather strap '+letter+' / '+tier,(ankle.x,0,z),.061,.006,leather,col,segments=seg),'shin.'+letter)
            bind(box('Boot brass buckle '+letter+' / '+tier,(ankle.x+sign*.064,-.025,z),(.007,.023,.016),brass,col,.002),'shin.'+letter)
        eye_pos=joint(side+'-eye')
        bind(sphere('Eye globe '+letter+' / '+tier,eye_pos,(.0125,.0125,.0125),eye,col,seg,seg//2),'eye.'+letter)
        bind(sphere('Iris fibres '+letter+' / '+tier,eye_pos+Vector((0,-.0118,0)),(.0047,.001,.0047),iris,col,seg,seg//2),'eye.'+letter)
        bind(sphere('Pupil '+letter+' / '+tier,eye_pos+Vector((0,-.0127,0)),(.0019,.0005,.0019),pupil,col,16,8),'eye.'+letter)
        brow=eye_pos+Vector((0,-.016,.020))
        for k in range(18 if tier!='mobile' else 6):
            t=k/(17 if tier!='mobile' else 5)
            root=brow+Vector((sign*(t-.5)*.031,-.002*math.sin(t*math.pi),.003*math.sin(t*math.pi)))
            bind(curve('Eyebrow fibre '+letter+' / '+tier,[root,root+Vector((sign*.002,-.0003,.0025))],.0003,scalp,col),'head')
    # Collar, shoulder cape, scarf and genuine flat leather straps.
    bind(surface('Shoulder cape / '+tier,lambda u,v:( (.095+v*.19)*math.cos(u*math.tau),(.08+v*.078)*math.sin(u*math.tau),1.485-v*.155-.007*math.sin(u*math.tau*5)),nu,nv//3,cloth,col))
    bind(surface('Raised folded collar / '+tier,lambda u,v:( (.088+v*.024)*math.cos(-math.pi/2+.15+u*(math.tau-.3)),(.078+v*.018)*math.sin(-math.pi/2+.15+u*(math.tau-.3)),1.47+v*.075),nu,nv//4,cloth,col),'neck')
    scarf=surface('Folded working scarf / '+tier,lambda u,v:(.075*math.cos(u*math.tau),.075*math.sin(u*math.tau)-.002,1.47+v*.045+.003*math.sin(u*38+v*12)),nu,nv//4,cloth,col); bind(scarf,'neck')
    bind(surface('Cross-body leather harness / '+tier,lambda u,v:(-.19+v*.34+(u-.5)*.036,-.151-.012*math.sin(v*math.pi),1.43-v*.40),4,16,leather,col),'chest')
    bind(surface('Waist leather belt / '+tier,lambda u,v:(.181*math.cos(u*math.tau),.135*math.sin(u*math.tau)-.001,1.035+(v-.5)*.038),nu,3,leather,col),'hips')
    bind(box('Belt buckle / '+tier,(0,-.144,1.036),(.04,.012,.028),brass,col,.002),'hips')
    for x in [-.155,.155]:
        bind(box('Leather pouch / '+tier,(x,-.086,.985),(.08,.052,.105),leather,col,.009),'hips')
        bind(box('Pouch flap / '+tier,(x,-.118,1.015),(.085,.008,.038),leather,col,.006),'hips')
    for z in [1.17,1.25,1.33,1.41]: bind(sphere('Coat brass button / '+tier,(.019,-.157,z),(.005,.003,.005),brass,col,12,8),'chest')
    bind(sphere('Porcelain badge / '+tier,(.12,-.163,1.38),(.018,.004,.023),porcelain,col,seg,12),'chest')
    if tier!='mobile':
        for sign in [-1,1]:
            bind(curve('Tailored front seam / '+tier,[(sign*.016,-.17,1.42),(sign*.02,-.13,1.10),(sign*.035,-.18,.74),(sign*.055,-.19,.49)],.0008,leather,col),'chest')
    # Layered groom-derived ribbons replace the old solid hair cap.
    locks=150 if tier=='cinematic' else 85 if tier=='desktop' else 35
    head_top=max(v.z for v in verts if abs(v.x)<.12 and v.z>1.5)
    shift=head_top-1.786
    fitted=anatomy('Fitted anatomical scalp / '+tier,lambda f:all(v.z>head_top-(.070 if v.y<-.10 else .135) for v in f),scalp,col)
    for vertex in fitted.data.vertices: vertex.co+=vertex.normal*.002
    sub(fitted,1 if tier!='mobile' else 0); bind(fitted,'head')
    crown=head_top+.012
    for i in range(locks):
        a=math.tau*i/locks; start=Vector((.084*math.cos(a),.079*math.sin(a)-.008,1.68+shift+.025*math.sin(a)))
        top=Vector((.067*math.cos(a)*.8,.040*math.sin(a),crown+.014*math.sin(a*3)))
        end=Vector((.028*math.cos(a),.094+.012*math.sin(a),1.705+shift))
        # Front hairline rises above brows; side locks are asymmetric and loose.
        if math.sin(a)<-.2: start.z=1.716+shift+.014*math.cos(a*2)
        points=[start,start.lerp(top,.48)+Vector((0,-.01,.018)),top,top.lerp(end,.55)+Vector((0,0,.015)),end]
        for j,p in enumerate(points):
            nearest=scalp_tree.find_nearest(p)
            if nearest[0] is not None: points[j]=nearest[0]+nearest[1]*(.004+(i%4)*.0009)
        bind(hair_lock(points,.015 if tier!='mobile' else .023,12 if tier=='cinematic' else 8,hair,col,'Swept hair ribbon / '+tier),'head')
        if tier=='cinematic': curve('Editable swept groom',points,.0005,hair,groom)
    for i in range(60 if tier=='cinematic' else 30 if tier=='desktop' else 12):
        a=i*2.39996; center=Vector((0,.060,1.717+shift)); points=[]
        for j in range(13):
            t=j/12; angle=t*math.tau*1.4+a; points.append(center+Vector((.048*math.cos(angle)*math.sin(t*math.pi),.041*math.sin(angle)*math.sin(t*math.pi),.041*math.cos(t*math.pi))))
        bind(hair_lock(points,.014,12,hair,col,'Loose bun ribbon / '+tier),'head')
    for sign in [-1,1]:
        for k in range(6 if tier!='mobile' else 2):
            points=[(sign*(.05+k*.004),-.073,1.744+shift),(sign*(.085+k*.002),-.104,1.71+shift),(sign*(.065+k*.003),-.139,1.625+shift-k*.007)]
            bind(hair_lock(points,.003,12,hair,col,'Loose temple strand / '+tier),'head')
    # Original pressure lantern and sharpened wake-hook.
    center=joint('l-hand-3')+Vector((0,0,-.205)); x,y,z=center
    for dz,radius in [(-.125,.074),(-.112,.080),(.100,.079),(.125,.063)]: bind(tube('Lantern machined rim / '+tier,(x,y,z+dz-.007),(x,y,z+dz+.007),radius,brass,col,seg),'hand.L')
    bind(tube('Lantern amber core / '+tier,(x,y,z-.10),(x,y,z+.09),.031,amber,col,seg),'hand.L')
    bind(tube('Lantern pressure reservoir / '+tier,(x,y,z+.126),(x,y,z+.17),.052,iron,col,seg),'hand.L')
    for i in range(8):
        a=i*math.tau/8; dx=.057*math.cos(a); dy=.057*math.sin(a)
        bind(tube('Lantern cage strut / '+tier,(x+dx,y+dy,z-.105),(x+dx,y+dy,z+.095),.0028,brass,col,12),'hand.L')
    bind(curve('Lantern bail grip / '+tier,[(x-.061,y,z+.12),(x-.057,y,z+.215),(x,y,z+.235),(x+.057,y,z+.215),(x+.061,y,z+.12)],.005,brass,col),'hand.L')
    bind(tube('Lantern valve / '+tier,(x+.042,y,z+.17),(x+.066,y,z+.17),.007,brass,col,12),'hand.L')
    bind(sphere('Lantern porcelain pressure dial / '+tier,(x,y-.058,z+.148),(.018,.004,.018),porcelain,col,16,8),'hand.L')
    x,y,z=joint('r-hand-3')
    bind(tube('Wake-hook ash handle / '+tier,(x,y,z-.76),(x,y,z+.21),.012,leather,col,seg),'hand.R')
    for dz in [-.12,.18,-.72]: bind(ring('Wake-hook collar / '+tier,(x,y,z+dz),.014,.0025,brass,col,segments=seg),'hand.R')
    blade=[(x,y-.006,z-.75),(x-.028,y-.006,z-.865),(x-.12,y-.006,z-.88),(x-.215,y-.006,z-.73),(x-.218,y-.006,z-.61),(x-.176,y-.006,z-.725),(x-.106,y-.006,z-.824),(x-.05,y-.006,z-.82)]
    blade2=[(a,y+.006,c) for a,b,c in blade]; faces=[tuple(range(8)),tuple(range(15,7,-1))]+[(i,(i+1)%8,(i+1)%8+8,i+8) for i in range(8)]
    bind(mesh('Forged cutting blade / '+tier,blade+blade2,faces,iron,collection=col),'hand.R')

for name,side,letter in [('socket_lantern','l','L'),('socket_wake_hook','r','R')]:
    o=bpy.data.objects.new(name,None); controls.objects.link(o); o.parent=rig; o.parent_type='BONE'; o.parent_bone='hand.'+letter
    parent=rig.matrix_world@rig.data.bones[o.parent_bone].matrix_local@Matrix.Translation((0,rig.data.bones[o.parent_bone].length,0))
    o.matrix_basis=parent.inverted()@Matrix.Translation(joint(side+'-hand-3')); o['attachment']=name

# Original preview clips transferred to the expanded anatomical rig.
def pose(name,axis,angle):
    b=rig.pose.bones[name]; q=b.bone.matrix_local.to_quaternion(); b.rotation_mode='QUATERNION'; b.rotation_quaternion=q.inverted()@Quaternion(Vector(axis),angle)@q
def leg(letter,y,z,offset):
    h,k=segments['thigh.'+letter]; _,a=segments['shin.'+letter]; l1=(k-h).length; l2=(a-k).length
    dy=y-h.y; dz=z-h.z-offset; d=min(math.hypot(dy,dz),l1+l2-.0005); direction=math.atan2(dy,-dz)
    up=direction-math.acos(max(-1,min(1,(l1*l1+d*d-l2*l2)/(2*l1*d)))); low=direction+math.acos(max(-1,min(1,(l2*l2+d*d-l1*l1)/(2*l2*d))))
    aa=up-math.atan2(k.y-h.y,h.z-k.z); bb=low-math.atan2(a.y-k.y,k.z-a.z)-aa
    pose('thigh.'+letter,(1,0,0),aa); pose('shin.'+letter,(1,0,0),bb); pose('foot.'+letter,(1,0,0),-aa-bb); return aa
for name,duration in [('idle',3),('walk',1.1),('run',.8),('attack',1.3),('dodge',1.0)]:
    rig.animation_data_create(); action=bpy.data.actions.new(name); rig.animation_data.action=action; frames=round(duration*30)
    for frame in range(frames+1):
        t=frame/frames; phase=t*math.tau
        for b in rig.pose.bones: b.rotation_mode='QUATERNION'; b.rotation_quaternion=Quaternion(); b.location=(0,0,0)
        for letter,sign in [('L',1),('R',-1)]:
            pose('upper_arm.'+letter,(0,1,0),sign*.46); pose('hand.'+letter,(0,1,0),-sign*.46)
            for finger in range(1,6):
                for s in range(1,4):
                    pose(f'finger{finger}_{s}.{letter}',(0,0,1) if finger==1 else (1,0,0),sign*.25 if finger==1 else .63)
            for root in ['coat.','coat_back.']:
                pose(root+letter,(1,0,0),math.sin(phase+sign*.3)*.018); pose(root.replace('.','_tip.')+letter,(1,0,0),math.sin(phase-.4)*.02)
        pose('chest',(1,0,0),math.sin(phase)*.009)
        if name in ['walk','run']:
            swing=math.sin(phase); offset=-.025+abs(swing)*.01
            rig.pose.bones['hips'].location=rig.data.bones['hips'].matrix_local.to_3x3().inverted()@Vector((0,0,offset))
            for letter,sign in [('L',1),('R',-1)]:
                a=segments['shin.'+letter][1]; thigh=leg(letter,a.y-swing*sign*(.15 if name=='walk' else .24),a.z+max(0,math.cos(phase)*sign)*(.07 if name=='walk' else .11),offset)
                pose('forearm.'+letter,(1,0,0),-swing*sign*.09); pose('coat.'+letter,(1,0,0),thigh*.33)
                pose('coat_tip.'+letter,(1,0,0),thigh*.16)
        elif name=='attack':
            e=math.sin(math.pi*t)**2; pose('chest',(0,0,1),math.sin(phase)*.38); pose('upper_arm.R',(0,1,0),-.46-e*.8); pose('forearm.R',(1,0,0),-e*.32)
        elif name=='dodge':
            e=math.sin(math.pi*t)**2; offset=-.18*e; rig.pose.bones['hips'].location=rig.data.bones['hips'].matrix_local.to_3x3().inverted()@Vector((0,0,offset))
            for letter,sign in [('L',1),('R',-1)]:
                a=segments['shin.'+letter][1]; leg(letter,a.y+sign*.06*e,a.z,offset); pose('coat.'+letter,(1,0,0),.15*e)
        for b in rig.pose.bones: b.keyframe_insert(data_path='rotation_quaternion',frame=frame+1); b.keyframe_insert(data_path='location',frame=frame+1)
    action.use_fake_user=True
rig.animation_data.action=bpy.data.actions.get('idle'); bpy.context.scene.frame_set(1)
for c in tiers.values(): c.hide_render=c.name!='Export_cinematic'
groom.hide_render=True; groom.hide_viewport=True
for img in bpy.data.images:
    if img.has_data: img.pack()
bpy.context.scene['iona_contract']=json.dumps({'bones':63,'tiers':['cinematic','desktop','mobile'],'clips':['idle','walk','run','attack','dodge'],'source_license':'CC0 anatomy; original costume/groom/equipment'})
bpy.ops.wm.save_as_mainfile(filepath=str(WORK/'iona-authoring.blend'))
print('IONA_AUTHORING_READY',str(WORK/'iona-authoring.blend'))
