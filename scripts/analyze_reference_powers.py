"""Read-only cooldown-mask candidates; changes require manual frame verification."""
import json,pathlib
from PIL import Image
ROOT=pathlib.Path(__file__).resolve().parents[1]
ref=Image.open(ROOT/'analysis/video-iron/page06-065s.png').convert('RGB')
rows=[]
for t in range(65,301):
 p=ROOT/f'analysis/video-iron/page06-{t:03d}s.png'
 if not p.exists():continue
 im=Image.open(p).convert('RGB');score=[]
 for x in [201,257,312]:
  dim=[]
  for y in range(657,689):
   ratios=[]
   for xx in range(x-12,x+12):
    a=ref.getpixel((xx,y));b=im.getpixel((xx,y))
    if sum(a)>220:ratios.append(sum(b)/sum(a))
   dim.append(sum(ratios)/len(ratios)if ratios else 1)
  score.append(sum(s<.45 for s in dim)/len(dim))
 rows.append({'mediaSeconds':t,'dimFraction':score})
out={'note':'Automatic pixel-mask discontinuity candidates only, not verified casts or continuous cooldown estimates. Fixed UI crop and baseline frame65.','rows':rows,'candidates':[]}
for a,b in zip(rows,rows[1:]):
 for i,k in enumerate(['reinforcements','rain_of_fire','royal_edict']):
  if b['dimFraction'][i]-a['dimFraction'][i]>.25:out['candidates'].append({'kind':k,'window':[a['mediaSeconds'],b['mediaSeconds']],'change':b['dimFraction'][i]-a['dimFraction'][i]})
p=ROOT/'analysis/video-iron/page06-power-candidates.json';p.write_text(json.dumps(out,indent=2));print(json.dumps(out['candidates'],indent=2))
