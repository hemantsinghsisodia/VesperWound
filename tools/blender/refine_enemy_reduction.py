"""One-time authored derivative repair; original topology remains in the master."""
import bpy
from pathlib import Path
base=Path.cwd()
bpy.ops.wm.open_mainfile(filepath=str(base/'art/source/zombie7-master.blend'),load_ui=False)
for obj in bpy.context.scene.objects:
    if obj.type!='MESH':continue
    preserve=obj.vertex_groups['Reduction_PreserveFaceHands']
    names={g.index:g.name for g in obj.vertex_groups}
    for vertex in obj.data.vertices:
        anatomical=max([g.weight for g in vertex.groups if g.group!=preserve.index and any(s in names[g.group] for s in ['Head','Neck','Hand'])]+[0])
        preserve.add([vertex.index],.85 if anatomical>.2 or obj.name=='Eyes' else .15,'REPLACE')
    # UV seams have duplicated vertices. Weld before reduction so independent
    # edge collapses cannot open cracks along those seams.
    weld=obj.modifiers.get('Export_SeamWeld') or obj.modifiers.new('Export_SeamWeld','WELD')
    weld.merge_threshold=.00001
    weld.show_viewport=weld.show_render=False
    bpy.context.view_layer.objects.active=obj
    while list(obj.modifiers).index(weld)>1:
        bpy.ops.object.modifier_move_up(modifier=weld.name)
    for mod in obj.modifiers:
        if mod.type=='DECIMATE':mod.invert_vertex_group=True
bpy.context.scene['reduction_notes']='Derivative-only seam weld and anatomically weighted collapse; face, neck and hands protected via inverted reduction weights.'
bpy.ops.wm.save_as_mainfile(filepath=str(base/'art/source/zombie7-master.blend'))
print('ENEMY_REDUCTION_REPAIRED')
