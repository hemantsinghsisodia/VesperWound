"""One-time correction using measured animated skin bounds from the browser."""
import bpy, json
from pathlib import Path
base=Path.cwd();bpy.ops.wm.open_mainfile(filepath=str(base/'art/source/zombie7-master.blend'),load_ui=False)
root=bpy.data.objects['Zombie7_Normalization']
bottom=.6651563800189685;top=1.799200070874121
factor=1.8/(top-bottom)
root.scale=tuple(s*factor for s in root.scale)
root.location.z=(root.location.z-bottom)*factor
for obj in bpy.context.scene.objects:
    if obj.type!='MESH':continue
    preserve=obj.vertex_groups.get('Reduction_PreserveFaceHands')
    names={g.index:g.name for g in obj.vertex_groups}
    for v in obj.data.vertices:
        anatomical=max([g.weight for g in v.groups if any(s in names[g.group] for s in ['Head','Neck','Hand'])]+[0])
        preserve.add([v.index],1.0 if anatomical>.2 or obj.name=='Eyes' else .15,'REPLACE')
bpy.context.scene['normalization_correction']='Measured animated Idle skin bounds in Three.js; excludes importer rest-bound artefacts.'
bpy.ops.wm.save_as_mainfile(filepath=str(base/'art/source/zombie7-master.blend'))
(base/'docs/qa/phase4a/normalization-correction.json').write_text(json.dumps({'measuredBefore':{'bottom':bottom,'top':top},'factor':factor,'targetHeight':1.8,'normalizationScale':list(root.scale),'groundOffset':root.location.z},indent=2))
print('ENEMY_NORMALIZATION_CORRECTED')
