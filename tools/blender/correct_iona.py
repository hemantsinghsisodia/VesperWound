"""Correct inspected bake/skin defects in the canonical authored source."""
import bpy,bmesh,json,numpy as np,re
from pathlib import Path
from mathutils.kdtree import KDTree
ROOT=Path(__file__).resolve().parents[2]
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'art/source/iona-master.blend'))
body=bpy.data.objects['Complete anatomical deformation reference']; ids=[]; group=''
for line in (ROOT/'art/downloads/base.obj').read_text().splitlines():
    if line.startswith('g '): group=line[2:]
    elif group=='body' and line.startswith('f '): ids.extend(int(s.split('/')[0])-1 for s in line.split()[1:])
ids=sorted(set(ids)); assert len(ids)==len(body.data.vertices)
tree=KDTree(len(ids))
for v in body.data.vertices: tree.insert(v.co,v.index)
tree.balance()
weights=json.loads((ROOT/'art/downloads/iona-morphs/default_weights.mhw').read_text())['weights']
by_vertex={}
for bone,pairs in weights.items():
    mapped=re.sub(r'finger([1-5])-([1-3])',r'finger\1_\2',bone)
    mapped=re.sub(r'lowerarm0[12]', 'forearm', mapped)
    mapped=re.sub(r'upperarm0[12]', 'upper_arm', mapped)
    mapped=re.sub(r'metacarpal[1-4]|wrist', 'hand', mapped)
    if mapped.startswith(('finger','hand','forearm')):
        for vi,w in pairs: by_vertex.setdefault(vi,[]).append((mapped,w))
rig=bpy.data.objects['Iona_Rig']
for tier in ['cinematic','desktop','mobile']:
    for o in bpy.data.collections['Export_'+tier].objects:
        if o.name.startswith('Anatomical glove'):
            o.vertex_groups.clear(); groups={name:o.vertex_groups.new(name=name) for name in rig.data.bones.keys()}
            for v in o.data.vertices:
                _,index,distance=tree.find(v.co); assert distance<.00001,distance
                assignments=[(bone,w) for bone,w in by_vertex.get(ids[index],[]) if bone in groups]
                total=sum(w for _,w in assignments)
                if total<.001: assignments=[('hand.L' if v.co.x>0 else 'hand.R',1)]; total=1
                for bone,w in assignments: groups[bone].add([v.index],w/total,'REPLACE')
        if tier=='mobile' and o.name.startswith('Face and neck'):
            bm=bmesh.new(); bm.from_mesh(o.data)
            edges=[e for e in bm.edges if all(v.co.z<1.58 or v.co.z>1.65 or v.co.y>-.10 for v in e.verts)]
            vertices=list({v for e in edges for v in e.verts})
            bmesh.ops.dissolve_limit(bm,angle_limit=.35,use_dissolve_boundaries=False,verts=vertices,edges=edges,delimit=set())
            bm.to_mesh(o.data); bm.free()
# Repair failed rays in the diffuse atlas with authored waxcloth, never black.
image=bpy.data.images['Iona authored waxcloth color atlas']; w,h=image.size
data=np.array(image.pixels[:],dtype=np.float32).reshape(h,w,4); missing=np.max(data[:,:,:3],axis=2)<.003
y,x=np.mgrid[0:h,0:w].astype(np.float32); patches=np.sin(x/w*27+np.sin(y/h*17))*np.sin(y/h*31+np.sin(x/w*19))
fallback=(.9+.15*patches)[:,:,None]*np.array([.045,.048,.037],dtype=np.float32)
data[:,:,:3]=np.where(missing[:,:,None],fallback,data[:,:,:3]); data[:,:,3]=1
image.pixels.foreach_set(data.ravel()); image.filepath_raw=str(ROOT/'art/work/clothing-color-atlas.png'); image.save(); image.pack()
bpy.context.scene['hand_weight_source']='Pinned CC0 MakeHuman default_weights.mhw; remapped articulated fingers and normalized per vertex'
bpy.context.scene['bake_ray_repairs']=int(missing.sum())
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'art/source/iona-master.blend'))
print('IONA_INSPECTED_CORRECTIONS',int(missing.sum()))
