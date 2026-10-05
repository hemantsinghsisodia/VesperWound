"""Authored garment grids and anatomical source helpers for Iona's master."""
import bpy, math, random
from mathutils import Vector

def material(name,color,metal=0,rough=.6):
    m=bpy.data.materials.new(name); m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Roughness'].default_value=rough; p.inputs['Metallic'].default_value=metal
    return m

def mesh(name,verts,faces,mat,uv=None,collection=None):
    data=bpy.data.meshes.new(name); data.from_pydata(verts,[],faces); data.update()
    o=bpy.data.objects.new(name,data); (collection or bpy.context.scene.collection).objects.link(o)
    data.materials.append(mat)
    layer=data.uv_layers.new(name='UVMap')
    for p in data.polygons:
        p.use_smooth=True
        for li in p.loop_indices:
            vi=data.loops[li].vertex_index
            layer.data[li].uv=uv[vi] if uv else (verts[vi][0],verts[vi][2])
    return o

def surface(name,fn,nu,nv,mat,collection,closed=False):
    verts=[]; uvs=[]; faces=[]
    for j in range(nv+1):
        for i in range(nu+1):
            u=i/nu; v=j/nv; verts.append(tuple(fn(u,v))); uvs.append((.02+.96*u,.02+.96*v))
    for j in range(nv):
        for i in range(nu):
            a=j*(nu+1)+i; faces.append((a,a+1,a+nu+2,a+nu+1))
    o=mesh(name,verts,faces,mat,uvs,collection)
    return o

def sphere(name,pos,scale,mat,collection,segments=24,rings=16):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,location=pos)
    o=bpy.context.object; o.name=name; o.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.data.materials.append(mat)
    for c in list(o.users_collection): c.objects.unlink(o)
    collection.objects.link(o)
    for p in o.data.polygons: p.use_smooth=True
    return o

def tube(name,a,b,r,mat,collection,segments=24,r2=None):
    a,b=Vector(a),Vector(b); d=b-a
    bpy.ops.mesh.primitive_cone_add(vertices=segments,radius1=r,radius2=r if r2 is None else r2,depth=d.length,location=(a+b)/2)
    o=bpy.context.object; o.name=name; o.rotation_mode='QUATERNION'; o.rotation_quaternion=d.to_track_quat('Z','Y')
    bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
    o.data.materials.append(mat)
    for c in list(o.users_collection): c.objects.unlink(o)
    collection.objects.link(o)
    for p in o.data.polygons: p.use_smooth=True
    return o

def curve(name,points,r,mat,collection,resolution=3):
    data=bpy.data.curves.new(name,'CURVE'); data.dimensions='3D'; data.resolution_u=resolution
    data.bevel_depth=r; data.bevel_resolution=2
    s=data.splines.new('BEZIER'); s.bezier_points.add(len(points)-1)
    for p,v in zip(s.bezier_points,points): p.co=v; p.handle_left_type=p.handle_right_type='AUTO'
    o=bpy.data.objects.new(name,data); collection.objects.link(o); data.materials.append(mat)
    return o

def box(name,pos,size,mat,collection,bevel=.006):
    bpy.ops.mesh.primitive_cube_add(size=1,location=pos); o=bpy.context.object; o.name=name; o.scale=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.data.materials.append(mat)
    b=o.modifiers.new('Edge construction','BEVEL'); b.width=bevel; b.segments=3
    for c in list(o.users_collection): c.objects.unlink(o)
    collection.objects.link(o)
    return o

def ring(name,pos,r,thickness,mat,collection,rotation=(0,0,0),segments=24):
    bpy.ops.mesh.primitive_torus_add(major_radius=r,minor_radius=thickness,major_segments=segments,minor_segments=6,location=pos,rotation=rotation)
    o=bpy.context.object; o.name=name; o.data.materials.append(mat)
    for c in list(o.users_collection): c.objects.unlink(o)
    collection.objects.link(o)
    for p in o.data.polygons: p.use_smooth=True
    return o

def interpolate(stations,v):
    x=v*(len(stations)-1); i=min(int(x),len(stations)-2); t=x-i
    return [a*(1-t)+b*t for a,b in zip(stations[i],stations[i+1])]

def garment_body(u,v):
    z,rx,ry,cy=interpolate([(.49,.28,.175,.018),(.62,.285,.17,.014),(.82,.245,.153,.01),
        (1.02,.177,.125,0),(1.13,.162,.117,-.007),(1.30,.215,.153,0),(1.43,.215,.118,0),(1.49,.088,.077,0)],v)
    a=-math.pi/2+.055+u*(math.tau-.11)
    fold=(math.sin(a*9+z*4)*.009+math.sin(a*17-z*3)*.003)*(max(0,1.04-z)/.55)
    tension=math.sin(z*47+a*4)*.004*math.exp(-((z-1.08)/.12)**2)
    z+=.006*math.sin(a*7)*(1-v)**5
    return Vector(((rx+fold+tension)*math.cos(a),cy+(ry+fold+tension)*math.sin(a),z))

def sleeve(u,v,a,b,c):
    # One continuous quad sleeve spanning shoulder, elbow and wrist.
    a,b,c=Vector(a),Vector(b),Vector(c)
    t=v*2; center=a.lerp(b,t) if t<=1 else b.lerp(c,t-1)
    direction=(b-a if t<1 else c-b).normalized()
    axis=direction.cross(Vector((0,1,0))).normalized(); other=direction.cross(axis).normalized()
    radius=interpolate([(.078,),(.072,),(.065,),(.059,),(.047,)],v)[0]
    angle=u*math.tau
    fold=.0035*math.sin(v*69+angle*3)+.002*math.sin(v*110-angle*2)
    fold*=.25+.75*math.exp(-((v-.5)/.16)**2)
    return center+(axis*math.cos(angle)+other*math.sin(angle))*(radius+fold)

def boot(u,v,x):
    angle=u*math.tau
    z,rx,ry,cy=interpolate([(.025,.057,.143,-.082),(.048,.062,.148,-.083),(.070,.063,.143,-.080),
        (.098,.054,.110,-.058),(.15,.045,.058,-.008),(.23,.047,.051,.001),(.34,.058,.061,.003),(.44,.061,.063,.003)],v)
    wrinkle=.003*math.sin(angle*5+z*95)*math.exp(-((z-.16)/.055)**2)
    return Vector((x+(rx+wrinkle)*math.cos(angle),cy+(ry+wrinkle)*math.sin(angle),z))

def hair_lock(points,width,steps,mat,collection,name):
    points=[Vector(p) for p in points]; verts=[]; uvs=[]; faces=[]
    for i in range(steps+1):
        t=i/steps; x=t*(len(points)-1); a=min(int(x),len(points)-2); q=x-a
        p0=points[max(0,a-1)]; p1=points[a]; p2=points[a+1]; p3=points[min(len(points)-1,a+2)]
        v=.5*((2*p1)+(-p0+p2)*q+(2*p0-5*p1+4*p2-p3)*q*q+(-p0+3*p1-3*p2+p3)*q*q*q)
        tangent=(.5*((-p0+p2)+2*(2*p0-5*p1+4*p2-p3)*q+3*(-p0+3*p1-3*p2+p3)*q*q)).normalized()
        radial=(v-Vector((0,.0,1.66))).normalized()
        side=tangent.cross(radial).normalized(); w=width*(.85+.15*math.sin(t*math.pi))
        for sign,uu in [(-1,0),(1,1)]: verts.append(tuple(v+side*w*.5*sign)); uvs.append((uu,t))
        if i: k=(i-1)*2; faces.append((k,k+1,k+3,k+2))
    return mesh(name,verts,faces,mat,uvs,collection)
