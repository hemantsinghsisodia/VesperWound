"""Original UV wear maps for equipment; packed into the editable master."""
import bpy,numpy as np
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'art/source/iona-master.blend'))
out=ROOT/'art/work'; size=512; y,x=np.mgrid[0:size,0:size].astype(np.float32); u=x/size; v=y/size; rng=np.random.default_rng(181)
noise=rng.random((size,size),dtype=np.float32)
patch=np.sin(u*23+np.sin(v*17))*np.sin(v*29+np.sin(u*13))
edge=np.exp(-np.minimum(v,1-v)*50)
for name,base,rough in [('Brass',(.24,.155,.067),.48),('Iron',(.028,.035,.031),.52),('Porcelain',(.49,.46,.37),.43)]:
    mat=bpy.data.materials['Iona.'+name]; nodes=mat.node_tree.nodes; p=nodes.get('Principled BSDF')
    oxidation=np.clip((patch-.25)*2,0,1) if name=='Brass' else np.clip((patch-.55)*1.5,0,1)
    color=(.82+.12*noise+.16*edge)[:,:,None]*np.array(base,dtype=np.float32)
    if name=='Brass': color=color*(1-oxidation*.55)[:,:,None]+oxidation[:,:,None]*np.array([.025,.065,.047],dtype=np.float32)
    else: color*=1-oxidation[:,:,None]*.28
    roughness=np.clip(rough+.16*oxidation+.09*(noise-.5)-.07*edge,.2,.9)
    for suffix,data,slot in [('color',color,'Base Color'),('roughness',np.repeat(roughness[:,:,None],3,axis=2),'Roughness')]:
        image=bpy.data.images.new('Iona '+name.lower()+' wear '+suffix,width=size,height=size)
        if suffix!='color': image.colorspace_settings.name='Non-Color'
        rgba=np.concatenate((data,np.ones((size,size,1),dtype=np.float32)),axis=2).astype(np.float32)
        image.pixels.foreach_set(rgba.ravel()); image.filepath_raw=str(out/(name.lower()+'-wear-'+suffix+'.png')); image.file_format='PNG'; image.save(); image.pack()
        n=nodes.new('ShaderNodeTexImage'); n.image=image; mat.node_tree.links.new(n.outputs['Color'],p.inputs[slot])
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'art/source/iona-master.blend')); print('IONA_MATERIAL_FINISH_COMPLETE')
