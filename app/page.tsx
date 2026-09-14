'use client';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { AudioLines, ArrowUpRight, Check, ChevronDown, Music2, Pause, Play, RotateCcw, Scan, Volume2, Move3d, Piano, CircleHelp } from 'lucide-react';
import { songs, noteName } from '@/lib/music';
import { robots, hands } from '@/lib/presets';
import { usePlayer } from '@/lib/player';
const Scene = dynamic(() => import('@/components/Scene'), { ssr:false, loading:()=><div className="loading"><AudioLines size={32}/><span>正在布置舞台…</span></div> });
const stamp = (s:number) => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
export default function Page() {
  const [robot,setRobot] = useState(robots[0]); const [hand,setHand] = useState(hands[0]); const [song,setSong] = useState(songs[0]); const [reset,setReset] = useState(0); const [help,setHelp] = useState(false);
  const [lightweight,setLightweight] = useState(false);
  const [closeup,setCloseup] = useState(false);
  const player = usePlayer(song);
  const active = player.playing ? song.notes.filter(n=>player.time>=n.start && player.time<n.start+n.duration) : [];
  return <main>
    <header><a className="brand" href="/"><span className="brand-icon"><Piano size={23}/></span>robo<span className="brand-light">piano</span><span className="lab">PLAYGROUND</span></a><div className="header-right"><span className="experiment"><i/> 一个小小的机器人音乐实验</span><button className="icon-button" aria-label="使用说明" onClick={()=>setHelp(!help)}><CircleHelp size={20}/></button></div></header>
    {help && <div className="help">选择机械臂、灵巧手和曲目后点击播放。拖拽旋转视角，滚轮缩放，右键拖拽平移。声音由每个音符实时合成；当前为风格化模型与简化运动学演示。</div>}
    <section className="heading"><div><div className="eyebrow">LESS PRECISION. MORE MUSIC.</div><h1>给机器一点音乐感<span>。</span></h1><p>选一双手，挑一首歌。让机械，也有节奏。</p></div><div className="version"><span>INTERACTIVE 3D</span><b>实验室 · 01</b></div></section>
    <div className="workspace"><section className="stage">
      <div className="stage-top"><span className="scene-label"><i className={player.playing?'live':''}/>{player.playing?'正在演奏':'舞台就绪'}</span><span className="stage-number">SCENE / 001</span></div>
      <div className="canvas"><Scene song={song} robot={robot} hand={hand} time={player.time} playing={player.playing} reset={reset} lightweight={lightweight} closeup={closeup}/></div>
      <div className="stage-bottom"><div className="model-label"><span>DUAL ARM SETUP</span><strong>{robot.name} <b>×</b> {hand.name}</strong></div><div className="view-actions"><button className="view-button" onClick={()=>setCloseup(!closeup)}><Move3d size={16}/>{closeup?'全景':'手部特写'}</button><button className="view-button" onClick={()=>{setCloseup(false);setReset(reset+1);}}><Scan size={16}/>重置视角</button></div></div>
      <div className="orbit-hint"><Move3d size={14}/>拖拽旋转 · 滚轮缩放</div>
    </section>
    <aside><div className="panel-title"><h2>你的演奏组合</h2><span>01 — 03</span></div>
      <div className="control-group"><label><span className="step">01</span>机械臂<span className="label-detail">双臂配置</span></label><div className="robot-grid">{robots.map(r=><button key={r.id} className={`robot-option ${robot.id===r.id?'selected':''}`} onClick={()=>setRobot(r)}><svg viewBox="0 0 90 67" aria-hidden="true"><path d="M25 54 L29 36 L51 15 L65 37 L53 47" fill="none" stroke={r.joint} strokeWidth="12" strokeLinejoin="round"/><path d="M29 35 L50 16 M54 20 L64 36" stroke={r.color} strokeWidth="8" strokeLinecap="round"/><circle cx="51" cy="15" r="7" fill={r.joint}/><path d="M15 59h25" stroke="#838d88" strokeWidth="7"/><circle cx="65" cy="37" r="6" fill={r.joint}/></svg><span>{r.name}</span>{robot.id===r.id&&<Check className="selected-check" size={13}/>}</button>)}</div></div>
      <div className="control-group"><label htmlFor="hand"><span className="step">02</span>灵巧手<span className="label-detail">自由搭配</span></label><div className="select-wrap"><select id="hand" value={hand.id} onChange={e=>setHand(hands.find(h=>h.id===e.target.value)!)}>{hands.map(h=><option key={h.id} value={h.id}>{h.name}</option>)}</select><ChevronDown size={16}/></div><div className="compatibility"><span/>已配对 · 左右手同步配置</div></div>
      <div className="control-group songs"><label><span className="step">03</span>选择曲目<span className="label-detail">{songs.length} 首预设</span></label>{songs.map((s,i)=><button key={s.id} onClick={()=>setSong(s)} className={`song-option ${song.id===s.id?'chosen':''}`}><span className="song-icon"><Music2 size={19}/></span><span className="song-info"><strong>{s.title}</strong><small>{i===0?'入门':'简单'} · {s.bpm} BPM · {stamp(s.duration)}</small></span>{song.id===s.id?<AudioLines size={18}/>:<ArrowUpRight size={16}/>}</button>)}</div>
      <div className="panel-note"><label className="quality-toggle"><span>轻量渲染</span><input type="checkbox" checked={lightweight} onChange={e=>setLightweight(e.target.checked)}/></label><span>●</span> {lightweight?'简化模型 · 无阴影 · 标准分辨率':robot.id==='franka'&&hand.id==='leap'?'官方网格 · 简化动作规划':'包含风格化预设 · 自由组合'}</div>
    </aside></div>
    <section className="transport"><div className="track-art"><AudioLines size={26}/></div><div className="now-playing"><span>NOW {player.playing?'PLAYING':'READY'}</span><strong>{song.title}</strong><small>{song.subtitle}</small></div><div className="playback"><div className="play-buttons"><button className="icon-button" aria-label="从头播放" onClick={()=>player.seek(0)}><RotateCcw size={18}/></button><button className="play-button" aria-label={player.playing?'暂停':'播放'} onClick={()=>player.playing?player.pause():void player.play()}>{player.playing?<Pause size={18} fill="currentColor"/>:<Play size={18} fill="currentColor"/>}<span>{player.playing?'Pause':'Play'}</span></button><span className="tempo">{song.bpm} <small>BPM</small></span></div><div className="timeline"><span>{stamp(player.time)}</span><input aria-label="播放进度" type="range" min="0" max={song.duration} step="0.01" value={player.time} onChange={e=>player.seek(Number(e.target.value))} style={{'--progress':`${player.time/song.duration*100}%`} as React.CSSProperties}/><span>{stamp(song.duration)}</span></div></div><div className="volume"><Volume2 size={18}/><input aria-label="音量" type="range" min="0" max="1" step=".01" value={player.volume} onChange={e=>player.setVolume(Number(e.target.value))}/></div></section>
    <footer><span><i/>REAL-TIME NOTES <b>{active.length?active.map(n=>noteName(n.midi)).join(' + '):'—'}</b></span><span>每一次触键，都有回响。<span className="footer-dot">✳</span></span></footer>
  </main>;
}
