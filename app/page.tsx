'use client';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { Pause, Play, RotateCcw, Focus, Volume2, SlidersHorizontal, X, Maximize2 } from 'lucide-react';
import { songs } from '@/lib/music';
import { robots, hands } from '@/lib/presets';
import { usePlayer } from '@/lib/player';
const Scene = dynamic(() => import('@/components/Scene'), { ssr:false, loading:()=><div className="scene-loading">Loading the stage…</div> });
const stamp = (s:number) => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
export default function Page() {
  const [robot,setRobot]=useState(robots[0]);
  const [hand,setHand]=useState(hands[0]);
  const [song,setSong]=useState(songs[0]);
  const [reset,setReset]=useState(0);
  const [closeup,setCloseup]=useState(false);
  const [lightweight,setLightweight]=useState(false);
  const [panelOpen,setPanelOpen]=useState(true);
  const player=usePlayer(song);
  return <main className="experience">
    <div className="stage"><Scene song={song} robot={robot} hand={hand} time={player.time} playing={player.playing} reset={reset} lightweight={lightweight} closeup={closeup}/></div>
    <header className="identity"><h1>Robianist<span>.</span></h1><p>A roboticist that happens to be a pianist.</p></header>
    <button className="glass icon-button settings-button" aria-label={panelOpen?'Hide settings':'Show settings'} title="Settings" onClick={()=>setPanelOpen(!panelOpen)}>{panelOpen?<X size={19}/>:<SlidersHorizontal size={19}/>}</button>
    {panelOpen&&<aside className="glass setup-panel" aria-label="Performance settings">
      <label htmlFor="robot">Arm</label><select id="robot" value={robot.id} onChange={e=>setRobot(robots.find(r=>r.id===e.target.value)!)}>{robots.map(r=><option key={r.id} value={r.id} disabled={r.available===false}>{r.name}{r.available===false?' — unavailable':''}</option>)}</select>
      <label htmlFor="hand">Hand</label><select id="hand" value={hand.id} onChange={e=>setHand(hands.find(h=>h.id===e.target.value)!)}>{hands.map(h=><option key={h.id} value={h.id}>{h.name}</option>)}</select>
      <label htmlFor="song">Score</label><select id="song" value={song.id} onChange={e=>setSong(songs.find(s=>s.id===e.target.value)!)}>{songs.map(s=><option key={s.id} value={s.id}>{s.title}</option>)}</select>
      <div className="panel-divider"/><label className="quality-toggle" htmlFor="quality"><span>Lightweight rendering</span><input id="quality" type="checkbox" checked={lightweight} onChange={e=>setLightweight(e.target.checked)}/></label>
    </aside>}
    <div className="glass view-controls"><button className="icon-button" aria-label="Reset view" title="Reset view" onClick={()=>{setCloseup(false);setReset(reset+1);}}><Maximize2 size={18}/></button><button className={`icon-button ${closeup?'active':''}`} aria-label={closeup?'Overview':'Hands close-up'} title={closeup?'Overview':'Hands close-up'} onClick={()=>setCloseup(!closeup)}><Focus size={19}/></button></div>
    <section className="glass transport" aria-label="Playback controls">
      <div className="track"><strong>{song.title}</strong><span>{song.bpm} BPM</span></div>
      <div className="play-actions"><button className="icon-button" aria-label="Restart" title="Restart" onClick={()=>player.seek(0)}><RotateCcw size={18}/></button><button className="play-button" aria-label={player.playing?'Pause':'Play'} onClick={()=>player.playing?player.pause():void player.play()}>{player.playing?<Pause size={21} fill="currentColor"/>:<Play size={21} fill="currentColor"/>}</button></div>
      <div className="timeline"><span>{stamp(player.time)}</span><input aria-label="Playback position" type="range" min="0" max={song.duration} step="0.01" value={player.time} onChange={e=>player.seek(Number(e.target.value))} style={{'--progress':`${player.time/song.duration*100}%`} as React.CSSProperties}/><span>{stamp(song.duration)}</span></div>
      <div className="volume"><Volume2 size={18}/><input aria-label="Volume" type="range" min="0" max="1" step=".01" value={player.volume} onChange={e=>player.setVolume(Number(e.target.value))}/></div>
    </section>
  </main>;
}
