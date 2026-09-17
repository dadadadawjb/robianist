import { DOMParser, type Element } from '@xmldom/xmldom';
import { unzipSync, strFromU8 } from 'fflate';
import type { Note, Song, PedalEvent } from './music.ts';

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
  const raw:(Note & {voice:string;grace?:boolean;arpeggio?:string;down?:boolean})[]=[];
  const pedalBeats:{beat:number;down:boolean}[]=[];
  const dynamics:{beat:number;staff:string;velocity:number}[]=[];
  const levels:Record<string,number>={pppp:20,ppp:28,pp:38,p:49,mp:62,mf:76,f:92,ff:108,fff:120,ffff:127};
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
      } else if(child.tagName==='direction'||child.tagName==='sound') {
        const beat=measureStart+cursor+Number(value(child,'offset')||0)/divisions;
        if(!Number.isFinite(beat)||beat<0)throw new Error('Invalid expression timing.');
        const staff=value(child,'staff');
        const sounds=child.tagName==='sound'?[child]:elements(child,'sound');
        const soundDynamics=sounds.find(s=>s.hasAttribute('dynamics'));
        const mark=elements(child,'dynamics')[0];
        const symbol=mark&&Array.from(mark.childNodes).find(n=>n.nodeType===1)?.nodeName;
        const velocity=soundDynamics?Number(soundDynamics.getAttribute('dynamics'))*.9:symbol?levels[symbol]:undefined;
        if(velocity!==undefined){
          if(!Number.isFinite(velocity)||velocity<0)throw new Error('Invalid score dynamics.');
          dynamics.push({beat,staff,velocity:Math.min(127,velocity)});
        }
        const soundPedal=sounds.find(s=>s.hasAttribute('damper-pedal'));
        if(soundPedal){
          const setting=soundPedal.getAttribute('damper-pedal')!;
          if(setting!=='yes'&&setting!=='no'&&(!Number.isFinite(Number(setting))||Number(setting)<0||Number(setting)>100))throw new Error('Invalid damper pedal.');
          pedalBeats.push({beat,down:setting==='yes'||Number(setting)>0});
        } else for(const pedal of elements(child,'pedal')){
          const type=pedal.getAttribute('type');
          if(type==='stop'||type==='discontinue'||type==='change')pedalBeats.push({beat,down:false});
          if(type==='start'||type==='resume'||type==='change')pedalBeats.push({beat,down:true});
        }
        for(const sound of sounds) {
          if(['dacapo','dalsegno','tocoda','fine'].some(a=>sound.hasAttribute(a)))throw new Error('Please unfold score navigation before exporting.');
          if(sound.hasAttribute('tempo')) {
            const bpm=Number(sound.getAttribute('tempo'));
            if(!Number.isFinite(bpm)||bpm<=0)throw new Error('Invalid score tempo.');
            tempos.push({beat,bpm});
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
            const arpeggiate=elements(child,'arpeggiate')[0];
            const velocity=child.hasAttribute('dynamics')?Number(child.getAttribute('dynamics'))*.9:undefined;
            if(velocity!==undefined&&(!Number.isFinite(velocity)||velocity<0))throw new Error('Invalid note dynamics.');
            const note={midi,start:measureStart+start,duration,hand,voice,grace,velocity:velocity===undefined?undefined:Math.min(127,velocity),arpeggio:arpeggiate?(arpeggiate.getAttribute('number')||'1'):undefined,down:arpeggiate?.getAttribute('direction')==='down'} as const;
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
  dynamics.sort((a,b)=>a.beat-b.beat);
  const notes=raw.map(({midi,start,duration,hand,velocity})=>{
    const staff=hand==='left'?'2':'1';
    const dynamic=dynamics.findLast(d=>d.beat<=start&&(!d.staff||d.staff===staff));
    return {midi,hand,start:secondsAt(start,ordered),duration:secondsAt(start+duration,ordered)-secondsAt(start,ordered),velocity:velocity??dynamic?.velocity??76};
  });
  const rolls=new Map<string,number[]>();
  raw.forEach((n,i)=>{if(n.arpeggio){const key=`${n.start}:${n.arpeggio}`;const group=rolls.get(key)??[];group.push(i);rolls.set(key,group);}});
  for(const group of rolls.values()){
    const down=group.some(i=>raw[i].down);
    group.sort((a,b)=>(notes[a].midi-notes[b].midi)*(down?-1:1));
    const spread=Math.min(.12,.035*(group.length-1),Math.min(...group.map(i=>notes[i].duration))*.25);
    group.forEach((index,i)=>{const delay=group.length>1?spread*i/(group.length-1):0;notes[index].start+=delay;notes[index].duration-=delay;});
  }
  notes.sort((a,b)=>a.start-b.start||a.midi-b.midi);
  // Multiple voices share physical keys: merge unisons and release before a reattack.
  const keys=new Map<string,Note>();
  const playable:Note[]=[];
  for(const note of notes) {
    const key=`${note.hand}-${note.midi}`,prior=keys.get(key);
    if(prior&&Math.abs(prior.start-note.start)<1e-6) {prior.duration=Math.max(prior.duration,note.duration);continue;}
    if(prior&&prior.start+prior.duration>note.start)prior.duration=note.start-prior.start;
    playable.push(note);keys.set(key,note);
  }
  const end=secondsAt(measureStart,ordered);
  const pedals:PedalEvent[]=pedalBeats.sort((a,b)=>a.beat-b.beat).map(p=>({time:secondsAt(p.beat,ordered),down:p.down}));
  if(pedals.at(-1)?.down)pedals.push({time:Math.max(end,pedals.at(-1)!.time),down:false});
  return {id,title:value(root,'work-title')||value(root,'movement-title')||'Uploaded piano score',subtitle:elements(root,'creator').find(c=>c.getAttribute('type')==='arranger')?.textContent||'MusicXML piano score',bpm:ordered[0].bpm,notes:playable,duration:Math.max(end,pedals.at(-1)?.time??0)+.8,xml,tempos:ordered,pedals};
}
