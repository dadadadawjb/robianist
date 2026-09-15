import { DOMParser, type Element } from '@xmldom/xmldom';
import { unzipSync, strFromU8 } from 'fflate';
import type { Note, Song } from './music.ts';

export function readScore(data:Uint8Array,filename:string,id='upload'):Song {
  if(data.byteLength>5_000_000)throw new Error('Please use a MusicXML file smaller than 5 MB.');
  if(!/\.(musicxml|xml|mxl)$/i.test(filename))throw new Error('Choose a .musicxml, .xml or .mxl file.');
  let xml:string;
  if(/\.mxl$/i.test(filename)) {
    const extract=(path:string,limit:number)=> {
      const files=unzipSync(data,{filter:entry=>{
        if(entry.name!==path)return false;
        if(entry.originalSize>limit)throw new Error('The expanded MusicXML file is too large.');
        return true;
      }});
      if(!files[path])throw new Error(`Invalid MXL: missing ${path}.`);
      return strFromU8(files[path]);
    };
    const container=new DOMParser().parseFromString(extract('META-INF/container.xml',64_000),'text/xml');
    const path=container.getElementsByTagName('rootfile')[0]?.getAttribute('full-path');
    if(!path||path.startsWith('/')||path.split('/').includes('..'))throw new Error('Invalid MXL score path.');
    xml=extract(path,5_000_000);
  } else xml=new TextDecoder('utf-8',{fatal:true}).decode(data);
  const song=parseScore(xml,id);
  if(song.title==='Uploaded piano score')song.title=filename.replace(/\.(musicxml|xml|mxl)$/i,'');
  return song;
}

// MusicXML durations are quarter-note units; playback and the cursor share this map.
export type Tempo = { beat: number; bpm: number };
export function secondsAt(beat:number, tempos:Tempo[]) {
  let seconds=0;
  for(let i=0;i<tempos.length;i++) {
    const end=Math.min(beat,tempos[i+1]?.beat??beat);
    if(end>tempos[i].beat)seconds+=(end-tempos[i].beat)*60/tempos[i].bpm;
  }
  return seconds;
}
export function beatAt(seconds:number,tempos:Tempo[]) {
  for(let i=tempos.length-1;i>=0;i--) {
    const start=secondsAt(tempos[i].beat,tempos);
    if(seconds>=start)return tempos[i].beat+(seconds-start)*tempos[i].bpm/60;
  }
  return 0;
}
export function parseScore(xml:string,id='upload'):Song {
  if(xml.length>5_000_000)throw new Error('Please use a MusicXML file smaller than 5 MB.');
  if(/<!ENTITY/i.test(xml))throw new Error('XML entities are not supported.');
  const doc=new DOMParser({onError:(level,message)=>{if(level!=='warning')throw new Error(`Invalid MusicXML: ${message}`);}}).parseFromString(xml,'text/xml');
  const root=doc.documentElement;
  if(!root||root.tagName!=='score-partwise')throw new Error('Upload an uncompressed partwise MusicXML score (.musicxml or .xml).');
  const elements=(node:Element,name:string)=>Array.from(node.getElementsByTagName(name));
  const value=(node:Element,name:string)=>elements(node,name)[0]?.textContent??'';
  const parts=elements(root,'part');
  if(parts.length!==1)throw new Error('Export a single piano part with right and left hand staves.');
  if(elements(root,'repeat').length||elements(root,'ending').length)throw new Error('Please unfold repeats before exporting the score.');
  if(elements(root,'transpose').length)throw new Error('Please export the piano score at concert pitch.');
  const raw:(Note & {voice:string;grace?:boolean})[]=[];
  const tempos:Tempo[]=[{beat:0,bpm:100}];
  const ties=new Map<string,Note>();
  let divisions=1,measureStart=0,measureBeats=4;
  for(const measure of elements(parts[0],'measure')) {
    let cursor=0,lastStart=0,end=0;
    for(const child of Array.from(measure.childNodes).filter(n=>n.nodeType===1) as unknown as Element[]) {
      if(child.tagName==='attributes') {
        if(value(child,'divisions'))divisions=Number(value(child,'divisions'));
        if(!(divisions>0))throw new Error('Invalid MusicXML divisions.');
        if(value(child,'beats'))measureBeats=Number(value(child,'beats'))*4/Number(value(child,'beat-type'));
      } else if(child.tagName==='direction') {
        for(const sound of elements(child,'sound')) {
          if(['dacapo','dalsegno','tocoda','fine'].some(a=>sound.hasAttribute(a)))throw new Error('Please unfold score navigation before exporting.');
          if(sound.hasAttribute('tempo')) {
            const bpm=Number(sound.getAttribute('tempo'));
            if(!Number.isFinite(bpm)||bpm<=0)throw new Error('Invalid score tempo.');
            tempos.push({beat:measureStart+cursor+Number(value(child,'offset')||0)/divisions,bpm});
          }
        }
      } else if(child.tagName==='backup'||child.tagName==='forward') {
        cursor+=(child.tagName==='backup'?-1:1)*Number(value(child,'duration'))/divisions;
        if(cursor< -1e-6)throw new Error('A voice starts before its measure.');
        end=Math.max(end,cursor);
      } else if(child.tagName==='note') {
        const grace=elements(child,'grace').length>0;
        const duration=grace?0:Number(value(child,'duration'))/divisions;
        if(!Number.isFinite(duration)||(!grace&&duration<=0))throw new Error('Every note and rest must have a positive duration.');
        const chord=elements(child,'chord').length>0;
        const start=chord?lastStart:cursor;
        const staff=value(child,'staff')||'1';
        if(!['1','2'].includes(staff))throw new Error('Only two piano staves are supported.');
        if(!elements(child,'rest').length) {
          const step=value(child,'step');
          // MusicXML pitch already includes sounding octaves; octave-shift is notation only.
          const midi=({C:0,D:2,E:4,F:5,G:7,A:9,B:11}[step]??NaN)+12*(Number(value(child,'octave'))+1)+Number(value(child,'alter')||0);
          if(!Number.isInteger(midi)||midi<21||midi>108)throw new Error('Notes must fit the 88-key piano (A0–C8).');
          const voice=value(child,'voice')||'1',hand=staff==='2'?'left':'right';
          const key=`${voice}-${staff}-${midi}`;
          const types=elements(child,'tie').map(t=>t.getAttribute('type'));
          let prior=ties.get(key);
          let priorKey=key;
          if(types.includes('stop')&&!prior) {
            const matches=[...ties].filter(([,n])=>n.hand===hand&&n.midi===midi&&Math.abs(n.start+n.duration-measureStart-start)<1e-5);
            if(matches.length===1)[priorKey,prior]=matches[0];
          }
          if(types.includes('stop')) {
            if(!prior||Math.abs(prior.start+prior.duration-measureStart-start)>1e-5)throw new Error(`A tie does not connect matching consecutive notes in measure ${measure.getAttribute('number')} (${key}, beat ${measureStart+start}, previous end ${prior?prior.start+prior.duration:'missing'}).`);
            prior.duration+=duration;
          } else {
            const note={midi,start:measureStart+start,duration,hand,voice,grace} as const;
            raw.push(note);
            if(types.includes('start'))ties.set(key,note);
          }
          if(types.includes('stop')) {
            ties.delete(priorKey);
            if(types.includes('start'))ties.set(key,prior!);
          }
        }
        lastStart=start;
        if(!chord)cursor+=duration;
        end=Math.max(end,start+duration);
      }
    }
    measureStart+=measure.getAttribute('implicit')==='yes'?end:Math.max(end,measureBeats);
  }
  if(ties.size)throw new Error('The score contains unfinished ties.');
  // Untimed grace notes borrow up to an eighth of a beat from the following attack.
  for(const grace of raw.filter(n=>n.grace)) {
    if(!grace.grace)continue;
    const group=raw.filter(n=>n.grace&&n.hand===grace.hand&&n.voice===grace.voice&&n.start===grace.start);
    const following=raw.filter(n=>!n.grace&&n.hand===grace.hand&&n.voice===grace.voice&&n.start===grace.start);
    if(!following.length)throw new Error('Grace notes must precede a timed note in the same voice.');
    const borrowed=Math.min(.125,Math.min(...following.map(n=>n.duration))/4);
    group.forEach((n,i)=>{n.start+=i*borrowed/group.length;n.duration=borrowed/group.length;n.grace=false;});
    following.forEach(n=>{n.start+=borrowed;n.duration-=borrowed;});
  }
  if(!raw.length||raw.length>20000)throw new Error('The score must contain between 1 and 20,000 notes.');
  const ordered=tempos.sort((a,b)=>a.beat-b.beat).filter((t,i,a)=>a[i+1]?.beat!==t.beat);
  if(ordered.some(t=>t.beat<0)||!Number.isFinite(measureStart))throw new Error('Invalid score timing.');
  const notes=raw.map(({midi,start,duration,hand})=>({midi,hand,start:secondsAt(start,ordered),duration:secondsAt(start+duration,ordered)-secondsAt(start,ordered)})).sort((a,b)=>a.start-b.start||a.midi-b.midi);
  // Multiple voices share physical keys: merge unisons and release before a reattack.
  const keys=new Map<string,Note>();
  const playable:Note[]=[];
  for(const note of notes) {
    const key=`${note.hand}-${note.midi}`,prior=keys.get(key);
    if(prior&&Math.abs(prior.start-note.start)<1e-6) {prior.duration=Math.max(prior.duration,note.duration);continue;}
    if(prior&&prior.start+prior.duration>note.start)prior.duration=note.start-prior.start;
    playable.push(note);keys.set(key,note);
  }
  return {id,title:value(root,'work-title')||value(root,'movement-title')||'Uploaded piano score',subtitle:elements(root,'creator').find(c=>c.getAttribute('type')==='arranger')?.textContent||'MusicXML piano score',bpm:ordered[0].bpm,notes:playable,duration:secondsAt(measureStart,ordered)+.8,xml,tempos:ordered};
}
