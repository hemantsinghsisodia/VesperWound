"""Final inspected wrist/finger transfer and garment bake repairs."""
import bpy,json,re,numpy as np
from pathlib import Path
from mathutils.kdtree import KDTree
ROOT=Path(__file__).resolve().parents[2]
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'art/source/iona-master.blend'))
body=bpy.data.objects['Complete anatomical deformation reference']; ids=[]; group=''
for line in (ROOT/'art/downloads/base.obj').read_text().splitlines():
    if line.startswith('g '): group=line[2:]
    elif group=='body' and line.startswith('f '): ids.extend(int(s.split('/')[0])-1 for s in line.split()[1:])
ids=sorted(set(ids)); tree=KDTree(len(ids))
for v in body.data.vertices: tree.insert(v.co,v.index)
tree.balance(); by_vertex={}
for bone,pairs in json.loads((ROOT/'art/downloads/iona-morphs/default_weights.mhw').read_text())['weights'].items():
    mapped=re.sub(r'finger([1-5])-([1-3])',r'finger\1_\2',bone)
    mapped=re.sub(r'lowerarm0[12]', 'forearm', mapped); mapped=re.sub(r'metacarpal[1-4]|wrist','hand',mapped)
    if mapped.startswith(('finger','hand','forearm')):
        for vi,w in pairs: by_vertex.setdefault(vi,[]).append((mapped,w))
rig=bpy.data.objects['Iona_Rig']
for tier in ['cinematic','desktop','mobile']:
    for o in bpy.data.collections['Export_'+tier].objects:
        if o.name.startswith('Anatomical glove'):
            o.vertex_groups.clear(); groups={n:o.vertex_groups.new(name=n) for n in rig.data.bones.keys()}
            for v in o.data.vertices:
                _,index,_=tree.find(v.co); sums={}
                for bone,w in by_vertex.get(ids[index],[]):
                    if bone in groups: sums[bone]=sums.get(bone,0)+w
                total=sum(sums.values())
                if total<.001: sums={'hand.L' if v.co.x>0 else 'hand.R':1}; total=1
                for bone,w in sums.items(): groups[bone].add([v.index],w/total,'REPLACE')
        if o.name.startswith(('Lantern','Pressure shoulder')):
            if o.type=='MESH': o.location.z-=.06
            elif o.type=='CURVE':
                for s in o.data.splines:
                    for p in s.bezier_points: p.co.z-=.06
image=bpy.data.images['Iona clothing sculpt NORMAL']; w,h=image.size
data=np.array(image.pixels[:],dtype=np.float32).reshape(h,w,4); bad=data[:,:,2]<.55
data[bad,:3]=[.5,.5,1]; image.pixels.foreach_set(data.ravel()); image.save(); image.pack()
bpy.context.scene['normal_bake_ray_repairs']=int(bad.sum())
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'art/source/iona-master.blend')); print('IONA_DEFORMATION_REFINED',int(bad.sum()))
