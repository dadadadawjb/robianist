from pathlib import Path
from PIL import Image, ImageDraw
import math
source=Path(r'C:/Users/JunboWang/.codex/generated_images/01a0a404-6667-7c73-8545-ca4d872601c7/exec-ca9f46f4-81f0-4f87-82ff-ab6ecaad58bc.png')
im=Image.open(source).convert('RGBA')
scale=4
mask=Image.new('L',(im.width*scale,im.height*scale),0)
draw=ImageDraw.Draw(mask)
def shape(points):
    draw.polygon([(round(x*scale),round(y*scale)) for x,y in points],fill=255)
def curve(a,b,c,d):
    return [((1-t)**3*a[0]+3*(1-t)**2*t*b[0]+3*(1-t)*t*t*c[0]+t**3*d[0],(1-t)**3*a[1]+3*(1-t)**2*t*b[1]+3*(1-t)*t*t*c[1]+t**3*d[1]) for t in [i/120 for i in range(121)]]
# Fit the clean outer silhouette, keeping the opaque eyes and keys inside it.
pixels=im.load()
rows={}
for y in range(310,1134):
    xs=[x for x in range(208,1044) if min(pixels[x,y][:3])>230]
    if xs: rows[y]=(min(xs)+.5,max(xs)-.5)
valid=sorted(rows)
for y in range(310,1134):
    if y not in rows:
        before=max((r for r in valid if r<y),default=valid[0])
        after=min((r for r in valid if r>y),default=valid[-1])
        t=(y-before)/(after-before) if after!=before else 0
        rows[y]=tuple(rows[before][i]*(1-t)+rows[after][i]*t for i in [0,1])
shape([(rows[y][0],y) for y in sorted(rows)]+[(rows[y][1],y) for y in sorted(rows,reverse=True)])
draw.ellipse(tuple(round(v*scale) for v in (556,75,697,214)),fill=255)
draw.rectangle(tuple(round(v*scale) for v in (605,202,648,312)),fill=255)
left=[(186,527),(179,527)]
left+=curve((179,527),(133,527),(97,565),(97,610))
left+=[(97,690)]
left+=curve((97,690),(97,738),(131,774),(179,774))
left+=[(186,774)]
shape(left)
right=[(1067,526),(1074,526)]
right+=curve((1074,526),(1121,526),(1155,563),(1155,610))
right+=[(1155,690)]
right+=curve((1155,690),(1155,738),(1120,774),(1074,774))
right+=[(1067,774)]
shape(right)
alpha=mask.resize(im.size,Image.Resampling.LANCZOS)
# Drop negligible resampling halos outside the antialiased contour.
alpha=alpha.point(lambda x:0 if x<8 else x)
im.putalpha(alpha)
for target in ['public/logo.png','app/icon.png']:
    im.save(target,optimize=True)
preview=Image.new('RGB',im.size,'#353537');preview.paste(im,mask=alpha)
Path('tmp/logo').mkdir(parents=True,exist_ok=True)
preview.resize((627,627),Image.Resampling.LANCZOS).save('tmp/logo/preview-dark.png')
print('RGBA:',im.mode,'alpha range:',alpha.getextrema(),'transparent pixels:',alpha.histogram()[0])
assert all(alpha.getpixel(p)==0 for p in [(0,0),(250,150),(950,150),(30,600),(1200,600),(600,1200)])
assert all(alpha.getpixel(p)==255 for p in [(440,580),(800,580),(350,850),(800,850),(620,150)])
assert Path('public/logo.png').read_bytes()==Path('app/icon.png').read_bytes()
print('Exterior transparency, opaque eyes/keys, and matching website/favicon verified.')
