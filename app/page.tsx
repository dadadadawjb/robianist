'use client';
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, Video, Square, Focus, Eye, MoveLeft, UserRound, Orbit, Volume2, X, Maximize2, BookOpen, Upload, Download } from 'lucide-react';
import type { Song } from '@/lib/music';
import { builtinScores } from '@/lib/builtin-scores';
import { readScore } from '@/lib/score';
import { assignFingers } from '@/lib/fingering';
import { hand } from '@/lib/presets';
import { usePlayer } from '@/lib/player';
import { cameraViews, type CameraView } from '@/lib/camera';
import { useRecording } from '@/lib/use-recording';
const Scene = dynamic(() => import('@/components/Scene'), { ssr:false, loading:()=><div className="scene-loading">Loading the stage…</div> });
const SheetMusic = dynamic(() => import('@/components/SheetMusic'), { ssr:false });
const viewIcons={overview:Maximize2,hands:Focus,side:MoveLeft,eyes:Eye,shoulder:UserRound,motion:Orbit};
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
  const [song,setSong]=useState(initialSong);
  const [reset,setReset]=useState(0);
  const [view,setView]=useState<CameraView|null>('side');
  const [controlsHidden,setControlsHidden]=useState(false);
  const [library,setLibrary]=useState<{id:string;title:string;difficulty?:string}[]>([...builtinScores]);
  const cache=useRef(new Map([[initialSong.id,initialSong]]));
  const [error,setError]=useState('');
  const [uploading,setUploading]=useState(false);
  const [panelOpen,setPanelOpen]=useState(false);
  const player=usePlayer(song);
  const recording=useRecording(player,song);
  useEffect(()=>{
    let timer:ReturnType<typeof setTimeout>;
    const wake=()=>{setControlsHidden(false);clearTimeout(timer);timer=setTimeout(()=>setControlsHidden(true),3000);};
    wake();
    const events=['pointermove','pointerdown','wheel','keydown'] as const;
    events.forEach(event=>window.addEventListener(event,wake));
    return ()=>{clearTimeout(timer);events.forEach(event=>window.removeEventListener(event,wake));};
  },[]);
  useEffect(()=>{if(recording.status==='recording')setControlsHidden(true);},[recording.status]);
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
  return <main className={`experience ${controlsHidden?'controls-hidden':''}`}>
    <div className="stage"><Scene plannedNotes={plan.notes} song={song} time={player.time} playing={player.playing} reset={reset} view={view} onManualView={()=>setView(null)}/></div>
    <header className="identity"><h1><img src={`${process.env.NEXT_PUBLIC_BASE_PATH??''}/logo.png`} alt="" width="46" height="46"/>Robianist<span>.js</span></h1><p>A roboticist that happens to be a pianist, in your browser.</p></header>
    <div className="hardware-badge">Unitree G1 <span>×</span> Wuji Hand</div>
    {panelOpen&&<aside className="glass setup-panel score-panel" aria-label="Sheet music">
      <button className="icon-button sheet-close" aria-label="Close sheet music" onClick={()=>setPanelOpen(false)}><X size={19}/></button>
      <SheetMusic song={song} time={player.time}/>
      <button className="download-button" onClick={download}><Download size={15}/>Download this score</button>
      <p className="upload-help">Approximate visual fingering; physical reach and collisions are not simulated.</p>
    </aside>}
    <div className="bottom-controls">
    <div className="glass view-controls" role="group" aria-label="Camera views">
      {(Object.keys(cameraViews) as CameraView[]).map(id=>{const Icon=viewIcons[id];return <button key={id} className={`icon-button ${view===id?'active':''}`} disabled={recording.busy} aria-label={cameraViews[id]} title={cameraViews[id]} aria-pressed={view===id} onClick={()=>{setView(id);setReset(value=>value+1);}}><Icon size={18}/></button>;})}
    </div>
    <div className="glass recording-controls">
      <button disabled={uploading||!!plan.error||recording.status==='preparing'||recording.status==='saving'} onClick={()=>{if(recording.status==='recording')recording.stop();else {setControlsHidden(true);void recording.start();}}}>
        {recording.status==='recording'?<Square size={16}/>:<Video size={17}/>}{recording.status==='recording'?'Stop & save':recording.status==='preparing'?'Choose this tab…':recording.status==='saving'?'Saving…':'Export video'}
      </button>
      {recording.download&&<a href={recording.download.url} download={recording.download.name} aria-label="Download last video" title="Download last video"><Download size={15}/></a>}
      {recording.error&&<p className="score-error" role="alert">{recording.error}</p>}
    </div>
    <section className="glass transport" aria-label="Playback controls">
      <div className="track"><label htmlFor="song">Score</label><select id="song" value={song.id} disabled={uploading||recording.busy} onChange={e=>void chooseSong(e.target.value)}>{library.map(s=><option key={s.id} value={s.id}>{s.title}{s.difficulty?` — ${s.difficulty}`:''}</option>)}</select></div>
      <label className="upload-button icon-button" title="Upload MusicXML or MXL (up to 5 MB)"><Upload size={18}/><input aria-label="Upload MusicXML" type="file" accept=".musicxml,.xml,.mxl" disabled={uploading||recording.busy} onChange={e=>{const file=e.target.files?.[0];if(file)void upload(file);e.target.value='';}}/></label>
      <div className="play-actions"><button className="icon-button" disabled={recording.busy} aria-label="Restart" title="Restart" onClick={()=>player.seek(0)}><RotateCcw size={18}/></button><button className="play-button" disabled={uploading||recording.busy||!!plan.error} aria-label={player.playing?'Pause':'Play'} onClick={()=>player.playing?player.pause():void player.play()}>{player.playing?<Pause size={21} fill="currentColor"/>:<Play size={21} fill="currentColor"/>}</button></div>
      <div className="timeline"><span>{stamp(player.time)}</span><input disabled={recording.busy} aria-label="Playback position" type="range" min="0" max={song.duration} step="0.01" value={player.time} onChange={e=>player.seek(Number(e.target.value))} style={{'--progress':`${player.time/song.duration*100}%`} as React.CSSProperties}/><span>{stamp(song.duration)}</span></div>
      <div className="volume"><Volume2 size={18}/><input disabled={recording.busy} aria-label="Volume" type="range" min="0" max="1" step=".01" value={player.volume} onChange={e=>player.setVolume(Number(e.target.value))}/></div>
      <button className={`icon-button ${panelOpen?'active':''}`} aria-label="Show sheet music" title="Show sheet music" onClick={()=>setPanelOpen(!panelOpen)}><BookOpen size={20}/></button>
      {(error||plan.error)&&<p className="score-error transport-error" role="alert">{error||plan.error}</p>}
    </section>
    </div>
  </main>;
}
