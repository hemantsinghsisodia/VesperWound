"""Local art corrections on the saved work model; separate from read-only export."""
import bpy,sys,math,numpy as np
from pathlib import Path
from mathutils import Vector,Matrix
from mathutils.bvhtree import BVHTree
sys.path.insert(0,str(Path(__file__).parent))
from iona_geometry import curve,ring,tube,box
ROOT=Path(__file__).resolve().parents[2]; WORK=ROOT/'art/work'
bpy.ops.wm.open_mainfile(filepath=str(WORK/'iona-authoring.blend'))
rig=bpy.data.objects['Iona_Rig']; rig.animation_data.action=None
for b in rig.pose.bones: b.rotation_quaternion=(1,0,0,0); b.location=(0,0,0)
bpy.context.view_layer.update()
def attach(o,bone):
    o.parent=rig; o['iona_bone']=bone
    if o.type=='CURVE':
        o.parent_type='BONE'; o.parent_bone=bone
        rest=rig.matrix_world@rig.data.bones[bone].matrix_local@Matrix.Translation((0,rig.data.bones[bone].length,0)); o.matrix_basis=rest.inverted()
    else:
        g=o.vertex_groups.new(name=bone); g.add(list(range(len(o.data.vertices))),1,'REPLACE')
        m=o.modifiers.new('Equipment deformation','ARMATURE'); m.object=rig
    return o
for tier in ['cinematic','desktop','mobile']:
    col=bpy.data.collections['Export_'+tier]; head=next(o for o in col.objects if o.name.startswith('Face and neck'))
    tree=BVHTree.FromPolygons([v.co for v in head.data.vertices],[list(p.vertices) for p in head.data.polygons])
    for o in list(col.objects):
        if o.name.startswith('Eyebrow fibre'):
            for p in o.data.splines[0].bezier_points:
                hit=tree.ray_cast(Vector((p.co.x,-.4,p.co.z)),Vector((0,1,0)))
                if hit[0] is not None: p.co=hit[0]+hit[1]*.0007
        if o.name.startswith('Forged cutting blade'):
            o.vertex_groups.clear(); g=o.vertex_groups.new(name='hand.R'); g.add(list(range(len(o.data.vertices))),1,'REPLACE')
    # Eyelashes follow the actual anterior lid surface and stay sparse.
    for side,sign in [('L',1),('R',-1)]:
        center=rig.data.bones['eye.'+side].head_local
        for i in range(14 if tier!='mobile' else 5):
            t=i/(13 if tier!='mobile' else 4); x=center.x+(t-.5)*.020
            z=center.z+.0044*math.sin(t*math.pi)
            hit=tree.ray_cast(Vector((x,-.4,z)),Vector((0,1,0)))
            if hit[0] is not None:
                p=hit[0]+hit[1]*.0004
                attach(curve('Upper eyelash / '+tier,[p,p+Vector((sign*.0004,-.0025,.0013))],.00012,bpy.data.materials['Iona.Scalp'],col),'head')
    # Original small harness rings, cuffs, grip wrapping and engraved insignia.
    brass=bpy.data.materials['Iona.Brass']; iron=bpy.data.materials['Iona.Iron']; leather=bpy.data.materials['Iona.Leather']
    for x,z in [(-.08,1.32),(.10,1.12)]:
        attach(ring('Harness brass fitting / '+tier,(x,-.173,z),.014,.0022,brass,col,rotation=(math.pi/2,0,0),segments=24 if tier!='mobile' else 12),'chest')
    for side in ['L','R']:
        a=rig.data.bones['forearm.'+side].tail_local
        attach(ring('Glove cuff binding / '+tier,a,.037,.003,leather,col,segments=24 if tier!='mobile' else 12),'hand.'+side)
    p=bpy.data.objects['socket_wake_hook'].matrix_world.translation
    for i in range(14 if tier!='mobile' else 7):
        attach(ring('Wake-hook wrapped grip / '+tier,p+Vector((0,0,-.1+i*.012)),.0128,.0018,leather,col,segments=24 if tier!='mobile' else 12),'hand.R')
    p=bpy.data.objects['socket_lantern'].matrix_world.translation+Vector((0,0,-.205))
    attach(tube('Pressure shoulder housing / '+tier,p+Vector((0,0,.09)),p+Vector((0,0,.132)),.055,iron,col,24 if tier!='mobile' else 12,r2=.045),'hand.L')
    for a,b in [((.12,-.168,1.362),(.12,-.168,1.394)),((.12,-.168,1.375),(.108,-.168,1.382)),((.12,-.168,1.375),(.132,-.168,1.386))]:
        attach(curve('Mortuary porcelain engraving / '+tier,[a,b],.0007,iron,col),'chest')

def save_map(mat,name,data,slot):
    h,w,_=data.shape; img=bpy.data.images.new(name,width=w,height=h)
    if slot!='Base Color': img.colorspace_settings.name='Non-Color'
    rgba=np.concatenate((data,np.ones((h,w,1),dtype=np.float32)),axis=2).astype(np.float32)
    img.pixels.foreach_set(rgba.ravel()); img.filepath_raw=str(WORK/(name.replace(' ','-').lower()+'.png')); img.file_format='PNG'; img.save(); img.pack()
    n=mat.node_tree.nodes.new('ShaderNodeTexImage'); n.image=img; p=mat.node_tree.nodes.get('Principled BSDF')
    if slot=='Normal':
        bump=mat.node_tree.nodes.new('ShaderNodeNormalMap'); bump.inputs['Strength'].default_value=.22; mat.node_tree.links.new(n.outputs['Color'],bump.inputs['Color']); mat.node_tree.links.new(bump.outputs['Normal'],p.inputs['Normal'])
    else: mat.node_tree.links.new(n.outputs['Color'],p.inputs[slot])
    return img
skin=bpy.data.materials['Iona.Skin']; source=next(n.image for n in skin.node_tree.nodes if n.type=='TEX_IMAGE')
source.scale(4096,4096); pixels=np.array(source.pixels[:],dtype=np.float32).reshape(4096,4096,4)
rng=np.random.default_rng(91); noise=rng.random((4096,4096),dtype=np.float32)
color=np.clip(pixels[:,:,:3]*np.array([.88,.84,.81],dtype=np.float32)*(1+.025*(noise-.5))[:,:,None],0,1)
save_map(skin,'Iona skin color authored',color,'Base Color')
rough=np.repeat((.49+.07*(noise-.5))[:,:,None],3,axis=2); save_map(skin,'Iona skin roughness authored',rough,'Roughness')
dy,dx=np.gradient(noise); normal=np.stack((-dx*.07,-dy*.07,np.ones_like(dx)),axis=-1); normal/=np.linalg.norm(normal,axis=2)[:,:,None]; save_map(skin,'Iona skin pores authored',normal*.5+.5,'Normal')
# A swept directional scalp atlas supports the groom, with low gloss.
size=2048; y,x=np.mgrid[0:size,0:size].astype(np.float32); u=x/size; v=y/size
fibres=np.sin((u+.1*np.sin(v*5))*1800); noise=rng.random((size,size),dtype=np.float32)
color=np.stack([.028+.009*fibres+.003*noise,.014+.004*fibres+.002*noise,.008+.002*fibres+.001*noise],axis=-1)
save_map(bpy.data.materials['Iona.Scalp'],'Iona swept inner hair',color,'Base Color')
normal=np.stack((fibres*.12,np.cos(v*25)*.04,np.ones_like(u)),axis=-1); normal/=np.linalg.norm(normal,axis=2)[:,:,None]; save_map(bpy.data.materials['Iona.Scalp'],'Iona swept inner hair relief',normal*.5+.5,'Normal')
rig.animation_data.action=bpy.data.actions['idle']; bpy.context.scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(WORK/'iona-authoring.blend'))
print('IONA_REFINEMENT_COMPLETE')
