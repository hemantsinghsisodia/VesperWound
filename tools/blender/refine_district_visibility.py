"""Explicit browser-review corrections to saved Checkpoint C art."""
import bpy
from pathlib import Path
root=Path.cwd();master=root/'art/source/ash-quay-district.blend'
bpy.ops.wm.open_mainfile(filepath=str(master),load_ui=False)
scene=bpy.context.scene
if scene.get('checkpoint_c_visibility'):raise RuntimeError('Visibility correction already authored.')
cutaway=bpy.data.collections['11_Cutaway_Canopy']
patch=bpy.data.materials['District / dock limestone worn']
for o in list(scene.objects):
 if o.name.startswith('Dock / inset repair'):
  # The flat material read as blue stickers in-browser; reuse the scanned stone.
  o.data.materials.clear();o.data.materials.append(patch)
  for loop in o.data.uv_layers.active.data:loop.uv*=.35
 if o.name.startswith(('Canopy pier north','Canopy pier south')):
  upper=o.copy();upper.data=o.data.copy();upper.name='Canopy / cutaway upper support';cutaway.objects.link(upper)
  # Keep a visible base at collision locations when the roof/support cuts away.
  upper.dimensions.z=2.65;upper.location.z=2.075
  o.dimensions.z=.75;o.location.z=.375
scene['checkpoint_c_visibility']=True
bpy.ops.wm.save_as_mainfile(filepath=str(master),compress=True)
print('DISTRICT_VISIBILITY_COMPLETE')
