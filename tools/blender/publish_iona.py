"""Explicit reviewed-work publication; never invoked by the runtime art build."""
import bpy,bmesh,math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'art/work/iona-authoring.blend'))
for tier in ['cinematic','desktop','mobile']:
    col=bpy.data.collections['Export_'+tier]
    for o in col.objects:
        if tier=='cinematic' and o.name.startswith('Face and neck'):
            o.modifiers['Retopology refinement'].levels=1; o.modifiers['Retopology refinement'].render_levels=1
        if o.type=='CURVE' and tier!='cinematic':
            o.data.bevel_resolution=1 if tier=='desktop' else 0; o.data.resolution_u=2 if tier=='desktop' else 1
        if tier=='mobile' and o.name.startswith('Anatomical glove'):
            for m in list(o.modifiers):
                if m.type=='SOLIDIFY': o.modifiers.remove(m)
        if tier=='mobile' and o.name.startswith('Face and neck'):
            # Limited dissolve only on covered/back skull and low neck. Facial
            # edge loops, lips, eyelids and ear silhouettes remain untouched.
            bm=bmesh.new(); bm.from_mesh(o.data)
            edges=[e for e in bm.edges if all(v.co.y>-.09 or v.co.z<1.535 for v in e.verts)]
            bmesh.ops.dissolve_limit(bm,angle_limit=.12,use_dissolve_boundaries=False,verts=[],edges=edges,delimit={'UV'})
            bm.to_mesh(o.data); bm.free()
        if o.type=='MESH' and not o.name.startswith(('Face','Anatomical')):
            # Keep arm-twist influences explicit in all tiers. Twist bones inherit
            # the arm pose, preserving rest shape while allowing later refinement.
            for side in ['L','R']:
                for name in ['upper_arm','forearm']:
                    base=o.vertex_groups.get(name+'.'+side); twist=o.vertex_groups.get(name+'_twist.'+side)
                    if base and twist:
                        for v in o.data.vertices:
                            try: weight=base.weight(v.index)
                            except RuntimeError: continue
                            if weight>.001: base.add([v.index],weight*.7,'REPLACE'); twist.add([v.index],weight*.3,'REPLACE')
# Separate editable authoring collections, alongside the three export selections.
for name,prefixes in [('Garments — authored panels',('Coat','Continuous','Shoulder','Raised','Folded','Trousers','Cross-body','Waist')),
    ('Equipment — original pressure works',('Lantern','Pressure','Wake-hook','Forged')),
    ('Hair — layered runtime cards',('Swept','Loose','Fitted','Eyebrow','Upper eyelash'))]:
    c=bpy.data.collections.new(name); bpy.context.scene.collection.children.link(c)
    for o in bpy.data.collections['Export_cinematic'].objects:
        if o.name.startswith(prefixes): c.objects.link(o)
    c.hide_render=True
bpy.context.scene['art_review_status']='awaiting art review — concept fidelity requires visual review'
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'art/source/iona-master.blend'))
print('IONA_MASTER_PUBLISHED')
