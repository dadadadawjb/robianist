import re,json,pathlib
root=pathlib.Path('.')
source=(root/'tmp/pdfs/original-music.ts').read_text()
melodies=re.findall(r"song\('(tigers|star)'.*?(\[\[.*?\]\])\)",source)
(root/'public/scores').mkdir(parents=True,exist_ok=True)
titles={'tigers':'Frère Jacques','star':'Twinkle, Twinkle, Little Star'}
# Per-measure harmony for the complete traditional melodies.
harmony={'tigers':[[48,52,55],[48,52,55],[48,52,55],[48,52,55],[53,57,60],[55,59,62],[48,52,55],[48,52,55]],'star':[[48,52,55],[53,57,60],[53,57,60],[55,59,62],[48,52,55],[53,57,60],[55,59,62],[55,59,62],[48,52,55],[53,57,60],[53,57,60],[48,52,55]]}
steps=['C','C','D','D','E','F','F','G','G','A','A','B']
def note(midi,beats,staff):
    duration=int(beats*4); typ={2:'eighth',4:'quarter',8:'half',16:'whole'}[duration]
    return f'<note><pitch><step>{steps[midi%12]}</step><octave>{midi//12-1}</octave></pitch><duration>{duration}</duration><voice>{staff}</voice><type>{typ}</type><staff>{staff}</staff></note>'
for id,melody in melodies:
    measures=[];current=[];length=0
    for midi,beats in json.loads(melody.replace(".5", "0.5")):
        current.append(note(midi,beats,1));length+=beats
        if length==4: measures.append(current);current=[];length=0
    assert not current
    body=''
    for i,notes in enumerate(measures):
        attrs='<attributes><divisions>4</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><staves>2</staves><clef number="1"><sign>G</sign><line>2</line></clef><clef number="2"><sign>F</sign><line>4</line></clef></attributes><direction><sound tempo="100"/></direction>' if i==0 else ''
        chord=harmony[id][i]
        bass=[chord[0],chord[2],chord[1],chord[2]]
        left=''.join(note(m,1,2) for m in bass) if i<len(measures)-1 else note(chord[0],4,2)
        body+=f'<measure number="{i+1}">{attrs}{"".join(notes)}<backup><duration>16</duration></backup>{left}</measure>'
    xml=f'<?xml version="1.0" encoding="utf-8"?><score-partwise version="4.0"><work><work-title>{titles[id]}</work-title></work><identification><creator type="composer">Traditional</creator><creator type="arranger">Robianist two-hand arrangement</creator></identification><part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list><part id="P1">{body}</part></score-partwise>'
    (root/f'public/scores/{id}.musicxml').write_text(xml,encoding='utf-8')

