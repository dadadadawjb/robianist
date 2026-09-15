from pathlib import Path
for p in Path('public/scores').glob('*.musicxml'):
 s=p.read_text(encoding='utf-8').replace('<direction><sound tempo="100"/></direction>','<direction><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>100</per-minute></metronome></direction-type><sound tempo="100"/></direction>');p.write_text(s,encoding='utf-8')
p=Path('lib/score.ts');s=p.read_text(encoding='utf-8').replace("subtitle:'MusicXML piano score'", "subtitle:elements(root,'creator').find(c=>c.getAttribute('type')==='arranger')?.textContent||'MusicXML piano score'");p.write_text(s,encoding='utf-8')
p=Path('components/SheetMusic.tsx');s=p.read_text(encoding='utf-8').replace('<p className="score-caption">{song.title}</p>','<p className="score-caption">{song.title}</p><p className="upload-help">{song.subtitle}</p>');s=s.replace('const scroller=nodeScrollParent(host.current);','const scroller=host.current?.parentElement;').replace('\nfunction nodeScrollParent(node:HTMLElement|null){return node?.parentElement;}','');p.write_text(s,encoding='utf-8')
Path('output/musicxml').mkdir(parents=True,exist_ok=True)
p=Path('tmp/pdfs/if-only-raw.musicxml');s=p.read_text(encoding='utf-8');s=s.replace(r'E:\Learnings\MusicLearning\Piano\可惜没如果钢琴谱.pdf','User-provided piano score PDF');Path('output/musicxml/if-only-omr-draft.musicxml').write_text(s,encoding='utf-8')
