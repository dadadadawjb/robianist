'use client';
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, Focus, Volume2, SlidersHorizontal, X, Maximize2, BookOpen, Upload, Download } from 'lucide-react';
import type { Song } from '@/lib/music';
import { builtinScores } from '@/lib/builtin-scores';
import { readScore } from '@/lib/score';
import { assignFingers } from '@/lib/fingering';
import { robots, hands } from '@/lib/presets';
import { usePlayer } from '@/lib/player';
const Scene = dynamic(() => import('@/components/Scene'), { ssr:false, loading:()=><div className="scene-loading">Loading the stage…</div> });
const SheetMusic = dynamic(() => import('@/components/SheetMusic'), { ssr:false });
const stamp = (s:number) => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
async function loadPreset(id:string) {
  const preset=builtinScores.find(s=>s.id===id)!;
  const response=await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH??''}/scores/${preset.file}`);
  if(!response.ok)throw new Error('Could not load this score. Please try again.');
  return {...readScore(new Uint8Array(await response.arrayBuffer()),preset.file,preset.id),title:preset.title,subtitle:`${preset.difficulty} · Piano score`};
}
export default function Page() {
  const [initial,setInitial]=useState<Song|null>(null);
  const [error,setError]=useState('');
  const [attempt,setAttempt]=useState(0);
  useEffect(()=>{
    let cancelled=false;
    setError('');
    void loadPreset(builtinScores[0].id).then(song=>{if(!cancelled)setInitial(song);}).catch(e=>{if(!cancelled)setError(e instanceof Error?e.message:'Could not load Human Light.');});
    return ()=>{cancelled=true;};
  },[attempt]);
  if(!initial)return <main className="experience"><div className="scene-loading" role={error?'alert':'status'}>{error||'Loading Human Light…'}{error&&<button onClick={()=>setAttempt(attempt+1)}>Retry</button>}</div></main>;
  return <Performance initialSong={initial}/>;
}
function Performance({initialSong}:{initialSong:Song}) {
  const [robot,setRobot]=useState(robots[0]);
  const [hand,setHand]=useState(hands[0]);
  const [song,setSong]=useState(initialSong);
  const [reset,setReset]=useState(0);
  const [closeup,setCloseup]=useState(false);
  const [library,setLibrary]=useState<{id:string;title:string;difficulty?:string}[]>([...builtinScores]);
  const cache=useRef(new Map([[initialSong.id,initialSong]]));
  const [tab,setTab]=useState<'settings'|'sheet'>('settings');
  const [error,setError]=useState('');
  const [uploading,setUploading]=useState(false);
  const [panelOpen,setPanelOpen]=useState(true);
  const player=usePlayer(song);
  const plan=useMemo(()=>{
    try{return {notes:assignFingers(song.notes,hand.fingers),error:''};}
    catch(e){return {notes:[],error:e instanceof Error?e.message:'This hand cannot play the score.'};}
  },[song,hand]);
  async function chooseSong(id:string){
    setUploading(true);setError('');player.pause();
    try {
      const next=cache.current.get(id)??await loadPreset(id);
      cache.current.set(id,next);setSong(next);
    } catch(e){setError(e instanceof Error?e.message:'Could not load this score.');}
    finally{setUploading(false);}
  }
  async function upload(file:File) {
    setUploading(true);setError('');player.pause();
    try {
      if(file.size>5_000_000)throw new Error('Please use a MusicXML file smaller than 5 MB.');
      const next=readScore(new Uint8Array(await file.arrayBuffer()),file.name,`upload-${crypto.randomUUID()}`);
      cache.current.set(next.id,next);setLibrary(current=>[...current,next]);setSong(next);
    } catch(e){setError(e instanceof Error?e.message:'Could not read this score.');}
    finally{setUploading(false);}
  }
  function download(){const url=URL.createObjectURL(new Blob([song.xml],{type:'application/vnd.recordare.musicxml+xml'}));const link=document.createElement('a');link.href=url;link.download=`${song.id}.musicxml`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  return <main className="experience">
    <div className="stage"><Scene plannedNotes={plan.notes} song={song} robot={robot} hand={hand} time={player.time} playing={player.playing} reset={reset} closeup={closeup}/></div>
    <header className="identity"><h1><img src={`${process.env.NEXT_PUBLIC_BASE_PATH??''}/logo.png`} alt="" width="46" height="46"/>Robianist<span>.</span></h1><p>A roboticist that happens to be a pianist.</p></header>
    <button className="glass icon-button settings-button" aria-label={panelOpen?'Hide settings':'Show settings'} title="Settings" onClick={()=>setPanelOpen(!panelOpen)}>{panelOpen?<X size={19}/>:<SlidersHorizontal size={19}/>}</button>
    {panelOpen&&<aside className={`glass setup-panel ${tab==='sheet'?'score-panel':''}`} aria-label="Performance panel">
      <div className="panel-tabs" role="tablist" aria-label="Performance panel"><button id="settings-tab" role="tab" aria-selected={tab==='settings'} aria-controls="settings-panel" onClick={()=>setTab('settings')}>Settings</button><button id="sheet-tab" role="tab" aria-selected={tab==='sheet'} aria-controls="sheet-panel" onClick={()=>setTab('sheet')}>Sheet music</button></div>
      <div id="settings-panel" role="tabpanel" aria-labelledby="settings-tab" hidden={tab!=='settings'} className="settings-fields">
      <label htmlFor="robot">Arm</label><select id="robot" value={robot.id} onChange={e=>setRobot(robots.find(r=>r.id===e.target.value)!)}>{robots.map(r=><option key={r.id} value={r.id} disabled={r.available===false}>{r.name}{r.available===false?' — unavailable':''}</option>)}</select>
      <label htmlFor="hand">Hand</label><select id="hand" value={hand.id} disabled={uploading} onChange={e=>{player.pause();setHand(hands.find(h=>h.id===e.target.value)!);setError('');}}>{hands.map(h=><option key={h.id} value={h.id}>{h.name}</option>)}</select>
      <label htmlFor="song">Score</label><select id="song" value={song.id} disabled={uploading} onChange={e=>void chooseSong(e.target.value)}>{library.map(s=><option key={s.id} value={s.id}>{s.title}{s.difficulty?` — ${s.difficulty}`:""}</option>)}</select>
      <div className="panel-divider"/><label className="upload-button"><Upload size={15}/>{uploading?'Reading score…':'Upload MusicXML'}<input aria-label="Upload MusicXML" type="file" accept=".musicxml,.xml,.mxl" disabled={uploading} onChange={e=>{const file=e.target.files?.[0];if(file)void upload(file);e.target.value='';}}/></label>
      <button className="download-button" onClick={download}><Download size={15}/>Download this score</button>
      <p className="upload-help">MusicXML or compressed MXL. One piano part, up to two staves; unfold repeats. Maximum 5 MB. Files stay in this browser session.</p>
      <p className="upload-help">Approximate fingering: fingers may switch or release held keys early while their sound sustains. Chords still require one finger per new key.</p>
      </div>
      {tab==='sheet'&&<div id="sheet-panel" role="tabpanel" aria-labelledby="sheet-tab"><SheetMusic song={song} time={player.time}/></div>}
      {error&&<p className="score-error" role="alert">{error}</p>}
      {plan.error&&<p className="score-error" role="alert">{plan.error} Playback is unavailable with this hand. You can view the sheet music or choose another hand.</p>}
    </aside>}
    <div className="glass view-controls"><button className="icon-button" aria-label="Reset view" title="Reset view" onClick={()=>{setCloseup(false);setReset(reset+1);}}><Maximize2 size={18}/></button><button className={`icon-button ${closeup?'active':''}`} aria-label={closeup?'Overview':'Hands close-up'} title={closeup?'Overview':'Hands close-up'} onClick={()=>setCloseup(!closeup)}><Focus size={19}/></button></div>
    <section className="glass transport" aria-label="Playback controls">
      <div className="track"><strong>{song.title}</strong></div>
      <div className="play-actions"><button className="icon-button" aria-label="Restart" title="Restart" onClick={()=>player.seek(0)}><RotateCcw size={18}/></button><button className="play-button" disabled={uploading||!!plan.error} aria-label={player.playing?'Pause':'Play'} onClick={()=>player.playing?player.pause():void player.play()}>{player.playing?<Pause size={21} fill="currentColor"/>:<Play size={21} fill="currentColor"/>}</button></div>
      <div className="timeline"><span>{stamp(player.time)}</span><input aria-label="Playback position" type="range" min="0" max={song.duration} step="0.01" value={player.time} onChange={e=>player.seek(Number(e.target.value))} style={{'--progress':`${player.time/song.duration*100}%`} as React.CSSProperties}/><span>{stamp(song.duration)}</span></div>
      <div className="volume"><Volume2 size={18}/><input aria-label="Volume" type="range" min="0" max="1" step=".01" value={player.volume} onChange={e=>player.setVolume(Number(e.target.value))}/></div>
      <button className={`icon-button ${panelOpen&&tab==='sheet'?'active':''}`} aria-label="Show sheet music" title="Show sheet music" onClick={()=>{setPanelOpen(true);setTab('sheet');}}><BookOpen size={20}/></button>
    </section>
  </main>;
}
