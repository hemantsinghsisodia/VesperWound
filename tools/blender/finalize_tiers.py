"""Inspected bake repairs and small-part mobile retopology on saved source."""
import bpy,math,numpy as np
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'art/source/iona-master.blend'))
for name in ['Iona clothing sculpt NORMAL','Iona clothing sculpt AO']:
    image=bpy.data.images[name]; w,h=image.size; data=np.array(image.pixels[:],dtype=np.float32).reshape(h,w,4)
    if name.endswith('NORMAL'):
        bad=data[:,:,2]<.55; data[bad,:3]=[.5,.5,1]
    else: data[:,:,:3]=np.clip(data[:,:,:3],.25,1)
    data[:,:,3]=1; image.pixels.foreach_set(data.ravel()); image.save(); image.pack()
for o in list(bpy.data.collections['Export_mobile'].objects):
    if o.type!='MESH': continue
    bone=o.get('iona_bone','')
    if o.name.startswith(('Boot leather strap','Wake-hook collar','Wake-hook wrapped grip','Harness brass fitting','Glove cuff binding')):
        radii=[math.hypot(v.co.x,v.co.y) for v in o.data.vertices]; major=(max(radii)+min(radii))/2; minor=(max(radii)-min(radii))/2
        vertices=[]; faces=[]; n=12; sides=3
        for j in range(n):
            a=j/n*math.tau
            for k in range(sides):
                b=k/sides*math.tau; r=major+minor*math.cos(b); vertices.append((r*math.cos(a),r*math.sin(a),minor*math.sin(b)))
        for j in range(n):
            for k in range(sides): faces.append((j*sides+k,((j+1)%n)*sides+k,((j+1)%n)*sides+(k+1)%sides,j*sides+(k+1)%sides))
        old=o.data; data=bpy.data.meshes.new('Mobile fitting retopology'); data.from_pydata(vertices,[],faces); data.materials.append(old.materials[0]); data.uv_layers.new(); o.data=data
        o.vertex_groups.clear(); g=o.vertex_groups.new(name=bone); g.add(list(range(len(vertices))),1,'REPLACE')
        for p in data.polygons: p.use_smooth=True
    if o.name.startswith(('Pupil','Porcelain badge','Lantern porcelain pressure dial','Coat brass button')):
        # These rigid pieces use eight radial segments/four rings in the mobile
        # authored selection; their desktop/cinematic versions remain detailed.
        bpy.ops.mesh.primitive_uv_sphere_add(segments=8,ring_count=4)
        proxy=bpy.context.object; scale=tuple(max(abs(v.co[i]) for v in o.data.vertices) for i in range(3))
        for v in proxy.data.vertices:
            for i in range(3): v.co[i]*=scale[i]
        proxy.data.materials.append(o.data.materials[0]); o.data=proxy.data; bpy.data.objects.remove(proxy,do_unlink=True)
        o.vertex_groups.clear(); g=o.vertex_groups.new(name=bone); g.add(list(range(len(o.data.vertices))),1,'REPLACE')
        for p in o.data.polygons: p.use_smooth=True
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'art/source/iona-master.blend'))
print('IONA_TIERS_FINALIZED')
