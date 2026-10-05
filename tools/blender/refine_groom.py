"""Authored swept fringe correction on the canonical source."""
import bpy,sys,math,numpy as np
from pathlib import Path
from mathutils import Vector,Matrix
from mathutils.bvhtree import BVHTree
sys.path.insert(0,str(Path(__file__).parent))
from iona_geometry import hair_lock,curve
ROOT=Path(__file__).resolve().parents[2]
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'art/source/iona-master.blend'))
rig=bpy.data.objects['Iona_Rig']; hair=bpy.data.materials['Iona.Hair']; scalp=bpy.data.materials['Iona.Scalp']
scalp.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.85
scalp.node_tree.nodes.get('Principled BSDF').inputs['Specular IOR Level'].default_value=.1
size=2048; y,x=np.mgrid[0:size,0:size].astype(np.float32); u=x/size; v=y/size
alpha=np.zeros((size,size),dtype=np.float32)
for i in range(27):
    center=(i+.5)/27+.005*np.sin(v*6+i*.8)
    a=np.exp(-((u-center)/(.0035+.001*(i%3)))**2)*np.clip((1-v)*14,0,1)*np.clip(v*20,0,1)
    alpha=np.maximum(alpha,a)
data=np.empty((size,size,4),dtype=np.float32); data[:,:,:3]=np.stack([.029+.007*np.sin(u*400),.015+.003*np.sin(u*400),.008+.001*np.sin(u*400)],axis=-1); data[:,:,3]=alpha
img=bpy.data.images.new('Iona refined swept fibre atlas',width=size,height=size,alpha=True); img.pixels.foreach_set(data.ravel()); img.filepath_raw=str(ROOT/'art/work/hair-strands-refined.png'); img.file_format='PNG'; img.save(); img.pack()
node=next(n for n in hair.node_tree.nodes if n.type=='TEX_IMAGE'); node.image=img
for tier in ['cinematic','desktop','mobile']:
    col=bpy.data.collections['Export_'+tier]; head=next(o for o in col.objects if o.name.startswith('Face and neck'))
    tree=BVHTree.FromPolygons([v.co for v in head.data.vertices],[list(p.vertices) for p in head.data.polygons])
    for i in range(100 if tier=='cinematic' else 50 if tier=='desktop' else 18):
        count=100 if tier=='cinematic' else 50 if tier=='desktop' else 18; t=i/(count-1)
        x=-.076+t*.152; z=1.674-.022*abs(x/.076)+.006*math.sin(t*7)
        hit=tree.ray_cast(Vector((x,-.4,z)),Vector((0,1,0)))
        if hit[0] is None: continue
        root=hit[0]+hit[1]*(.003+(i%3)*.0009)
        points=[root,Vector((x*.9,-.135,1.704)),Vector((x*.7+.020,-.081,1.737+(i%4)*.001)),Vector((x*.42+.017,-.013,1.739)),Vector((x*.28,.057,1.714)),Vector((x*.14,.07,1.678))]
        for j in range(1,len(points)):
            near=tree.find_nearest(points[j]); points[j]=near[0]+near[1]*(.005+(i%5)*.0006)
        o=hair_lock(points,.014,20 if tier=='cinematic' else 12 if tier=='desktop' else 8,hair,col,'Swept frontal groom / '+tier)
        o.parent=rig; o['iona_bone']='head'; g=o.vertex_groups.new(name='head'); g.add(list(range(len(o.data.vertices))),1,'REPLACE'); m=o.modifiers.new('Groom deformation','ARMATURE'); m.object=rig
        if tier=='cinematic': curve('Editable frontal swept groom',points,.0004,hair,bpy.data.collections['Hair groom — editable curves'])
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'art/source/iona-master.blend'))
print('IONA_GROOM_REFINED')
