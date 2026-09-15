from pathlib import Path
p=Path('tmp/logo-cleanup.py');s=p.read_text();start=s.index('body=[');end=s.index('draw.ellipse',start)
s=s[:start]+'''pixels=im.load()
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
''' +s[end:];p.write_text(s)
