from pathlib import Path
import zipfile,xml.etree.ElementTree as E
z=zipfile.ZipFile(next(Path('tmp/pdfs/recognized').glob('*.mxl')))
print(z.namelist())
f=next(n for n in z.namelist() if n.endswith('.xml') and not n.startswith('META-INF'))
x=z.read(f);Path('tmp/pdfs/if-only-raw.musicxml').write_bytes(x)
r=E.fromstring(x)
for p in r.findall('part'):
 print('part',p.attrib,'measures',len(p.findall('measure')),'notes',len(p.findall('.//note')))
 for m in p.findall('measure'):
  ds=m.findall('.//divisions');print(m.get('number'),len(m.findall('note')),[(n.findtext('pitch/step'),n.findtext('pitch/octave'),n.findtext('duration'),n.findtext('staff')) for n in m.findall('note')][:3])
