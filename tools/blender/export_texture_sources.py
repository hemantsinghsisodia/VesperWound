"""Extract editable packed texture sources without changing the saved master."""
import bpy,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'art/source/iona-master.blend'))
out=ROOT/'art/textures/iona'; out.mkdir(parents=True,exist_ok=True); records=[]
for image in bpy.data.images:
    if image.name in ['Render Result','Viewer Node'] or not image.size[0]: continue
    _=image.pixels[0] # Packed images decode lazily after opening a .blend.
    if not image.has_data: continue
    image.filepath_raw=str(out/(image.name.replace(' ','-').replace('/','-').lower()+'.png')); image.file_format='PNG'; image.save()
    records.append({'name':image.name,'size':list(image.size),'colorSpace':image.colorspace_settings.name,'file':str(Path(image.filepath_raw).relative_to(ROOT))})
(out/'sources.json').write_text(json.dumps(records,indent=2)); print('IONA_TEXTURE_SOURCES',len(records))
