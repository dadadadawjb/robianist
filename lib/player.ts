'use client';
import { useEffect, useRef, useState } from 'react';
import type { Song } from './music';
import { createNoteScheduler } from './audio';
export function usePlayer(song: Song) {
  const context = useRef<AudioContext | null>(null);
  const scheduler = useRef<ReturnType<typeof createNoteScheduler>|null>(null);
  const timer = useRef<ReturnType<typeof setInterval>|null>(null);
  const clock = useRef({ playing: false, offset: 0, origin: 0 });
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [volume, setVolume] = useState(.65);
  const master = useRef<GainNode | null>(null);
  function stopVoices() {
    if(timer.current!==null)clearInterval(timer.current);
    timer.current=null;scheduler.current?.stop();scheduler.current=null;
  }
  function schedule(offset: number) {
    const ctx = context.current!; const origin = ctx.currentTime + .1;
    clock.current = { playing: true, offset, origin };
    const next=createNoteScheduler(ctx,master.current!,song.notes,offset,origin);
    scheduler.current=next;next.pump();timer.current=setInterval(next.pump,25);
    setPlaying(true);
  }
  async function prepareAudio() {
    if (!context.current) { context.current = new AudioContext(); master.current = context.current.createGain(); master.current.gain.value = volume; master.current.connect(context.current.destination); }
    await context.current.resume();
  }
  async function recordingAudio() {
    await prepareAudio();
    const output=context.current!.createMediaStreamDestination();master.current!.connect(output);
    return {stream:output.stream,disconnect:()=>{master.current?.disconnect(output);output.stream.getTracks().forEach(track=>track.stop());}};
  }
  async function play() {
    await prepareAudio(); stopVoices(); schedule(clock.current.offset >= song.duration ? 0 : clock.current.offset);
  }
  function pause() { const c = clock.current; if (c.playing) c.offset = Math.min(song.duration, c.offset + Math.max(0, context.current!.currentTime - c.origin)); c.playing = false; stopVoices(); setPlaying(false); setTime(c.offset); }
  function seek(value: number) { const active = clock.current.playing; stopVoices(); clock.current.offset = value; setTime(value); if (active) schedule(value); }
  useEffect(() => { if (master.current) master.current.gain.setTargetAtTime(volume, context.current!.currentTime, .02); }, [volume]);
  useEffect(() => { stopVoices(); clock.current = { playing:false, offset:0, origin:0 }; setTime(0); setPlaying(false); }, [song]);
  useEffect(() => { let frame: number; const tick = () => { const c = clock.current; if(c.playing && context.current) { const t = Math.min(song.duration, c.offset + Math.max(0, context.current.currentTime - c.origin)); setTime(t); if(t >= song.duration) { c.playing = false; c.offset = t; setPlaying(false); stopVoices(); } } frame = requestAnimationFrame(tick); }; frame = requestAnimationFrame(tick); return () => cancelAnimationFrame(frame); }, [song]);
  useEffect(() => { const hide = () => { if(document.hidden) pause(); }; document.addEventListener('visibilitychange', hide); return () => document.removeEventListener('visibilitychange', hide); }, [song]);
  useEffect(() => () => { stopVoices();void context.current?.close();context.current=null; }, []);
  return { time, playing, play, pause, seek, volume, setVolume, recordingAudio };
}
