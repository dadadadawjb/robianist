'use client';
import { useEffect, useRef, useState } from 'react';
import type { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';
import type { Song } from '@/lib/music';
import { beatAt } from '@/lib/score';
import { builtinScores } from '@/lib/builtin-scores';

export default function SheetMusic({song,time}:{song:Song;time:number}) {
  const preset=builtinScores.find(p=>p.id===song.id);
  const host=useRef<HTMLDivElement>(null);
  const display=useRef<OpenSheetMusicDisplay|null>(null);
  const [ready,setReady]=useState(false);
  const [error,setError]=useState('');
  const lastBeat=useRef(-1);
  const events=useRef<number[]>([]);
  const index=useRef(0);
  useEffect(()=>{
    let cancelled=false;
    setReady(false);setError('');lastBeat.current=-1;
    const node=host.current!;
    async function render() {
      const {OpenSheetMusicDisplay}=await import('opensheetmusicdisplay');
      if(cancelled)return;
      const osmd=new OpenSheetMusicDisplay(node,{autoResize:false,backend:'svg',drawingParameters:'compacttight',drawTitle:false,drawComposer:false,followCursor:false,defaultColorMusic:'#dededf',pageBackgroundColor:'transparent',cursorsOptions:[{type:0,color:'#b1b1b5',alpha:.3,follow:false}]});
      await osmd.load(song.xml);
      if(cancelled)return;
      osmd.Zoom=.75;osmd.render();
      events.current=[];index.current=0;
      while(!osmd.cursor.Iterator.EndReached){events.current.push(osmd.cursor.Iterator.CurrentSourceTimestamp.RealValue*4);osmd.cursor.next();}
      osmd.cursor.reset();osmd.cursor.show();display.current=osmd;setReady(true);
    }
    void render().catch(e=>{if(!cancelled)setError(e instanceof Error?e.message:'Could not display this score.');});
    const observer=new ResizeObserver(()=>{if(display.current){display.current.render();display.current.cursor.show();}});
    observer.observe(node);
    return ()=>{cancelled=true;observer.disconnect();display.current?.clear();display.current=null;node.replaceChildren();};
  },[song]);
  useEffect(()=>{
    const osmd=display.current;
    if(!ready||!osmd)return;
    const beat=beatAt(time,song.tempos);
    if(beat<lastBeat.current){osmd.cursor.reset();index.current=0;}
    while(index.current+1<events.current.length&&events.current[index.current+1]<=beat+1e-6){osmd.cursor.next();index.current++;}
    lastBeat.current=beat;
    osmd.cursor.show();
    const scroller=host.current?.parentElement;
    if(scroller) {
      const cursor=osmd.cursor.cursorElement.getBoundingClientRect(),bounds=scroller.getBoundingClientRect();
      if(cursor.top<bounds.top||cursor.bottom>bounds.bottom)scroller.scrollTop+=cursor.top-bounds.top-40;
    }
  },[time,song,ready]);
  return <><p className="score-caption">{song.title}</p>{preset&&<p className="score-credits">Artist: <a href={preset.artist.url} target="_blank" rel="noreferrer">{preset.artist.name}</a>; Arranger: <a href={preset.arranger.url} target="_blank" rel="noreferrer">{preset.arranger.name}</a></p>}{!ready&&!error&&<p role="status">Engraving sheet music…</p>}{error&&<p role="alert">{error}</p>}<div className="sheet-frame"><div className="sheet-scroll"><div className="sheet-paper" ref={host}/></div></div></>;
}
