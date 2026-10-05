import json
from pathlib import Path
vertices=[]; groups={}; name=''
for line in Path('art/downloads/base.obj').read_text().splitlines():
    if line.startswith('v '): vertices.append(tuple(map(float,line.split()[1:4])))
    elif line.startswith('g '): name=line[2:]; groups.setdefault(name,[])
    elif line.startswith('f '): groups[name].append([int(x.split('/')[0])-1 for x in line.split()[1:]])
for name, faces in groups.items():
    if name.startswith('joint-') and not any(s in name for s in ['finger','toe']):
        indices=set(i for f in faces for i in f)
        p=[sum(vertices[i][j] for i in indices)/len(indices) for j in range(3)]
        print(name,[round(p[0]*.106,3),round(-p[2]*.106,3),round((p[1]+8.4488)*.106,3)])
print('body faces',len(groups['body']))
