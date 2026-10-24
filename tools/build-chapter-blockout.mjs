// Explicit editable blockout export; final environment art is a later milestone.
import {mkdir,writeFile} from 'node:fs/promises';
import {SECTORS,sectorBoxes} from '../src/chapter/definition.ts';
for(const tier of ['desktop','mobile']){
  await mkdir(`public/assets/chapter/${tier}`,{recursive:true});
  for(const sector of SECTORS)await writeFile(`public/assets/chapter/${tier}/${sector.id}.json`,JSON.stringify({version:1,id:sector.id,boxes:sectorBoxes(sector.id)}));
}
