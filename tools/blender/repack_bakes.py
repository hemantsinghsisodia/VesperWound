"""Refresh repaired external bakes in the editable packed master."""
import bpy
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'art/source/iona-master.blend'))
for name,file in [('Iona authored waxcloth color atlas','clothing-color-atlas.png'),('Iona clothing sculpt NORMAL','clothing-baked-normal.png'),('Iona clothing sculpt AO','clothing-baked-ao.png')]:
    image=bpy.data.images[name]
    if image.packed_file: image.unpack(method='REMOVE')
    image.filepath=str(ROOT/'art/work'/file); image.reload(); image.pack()
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'art/source/iona-master.blend'))
print('IONA_REPAIRED_BAKES_PACKED')
