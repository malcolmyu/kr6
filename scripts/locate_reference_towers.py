"""Read-only template matching on HD video frames; emit coordinates, not edited images."""
from PIL import Image,ImageChops,ImageStat
import pathlib,sys,json
root=pathlib.Path(__file__).resolve().parents[1];source=Image.open(root/'analysis/video-iron/page04-090s.png').convert('RGB');box=(650,533,704,550);template=source.crop(box);w,h=template.size
path=root/(sys.argv[1]if len(sys.argv)>1 else'analysis/video-iron/page04-090s.png');im=Image.open(path).convert('RGB')
def score(x,y):return sum(ImageStat.Stat(ImageChops.difference(template,im.crop((x,y,x+w,y+h)))).mean)/3
coarse=sorted((score(x,y),x,y)for y in range(140,590,4)for x in range(150,1110,4))[:100]
fine=sorted({(score(x,y),x,y)for _,cx,cy in coarse for y in range(cy-4,cy+5)for x in range(cx-4,cx+5)})
found=[]
for value,x,y in fine:
 if all((x-p['x'])**2+(y-p['y'])**2>45**2 for p in found):found.append({'score':round(value,2),'x':x,'y':y,'center':[x+w/2,y+h/2]})
 if len(found)==9:break
print(json.dumps({'file':str(path.relative_to(root)),'template':box,'matches':found},indent=2))
