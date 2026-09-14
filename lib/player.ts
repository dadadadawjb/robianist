'use client';
import { useEffect, useRef, useState } from 'react';
import { frequency, type Song } from './music';
export function usePlayer(song: Song) {
  const context = useRef<AudioContext | null>(null);
  const voices = useRef<OscillatorNode[]>([]);
  const clock = useRef({ playing: false, offset: 0, origin: 0 });
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [volume, setVolume] = useState(.65);
  const master = useRef<GainNode | null>(null);
  function stopVoices() { voices.current.forEach(v => { v.stop(); v.disconnect(); }); voices.current = []; }
  function schedule(offset: number) {
    const ctx = context.current!; const origin = ctx.currentTime + .06;
    clock.current = { playing: true, offset, origin };
    for (const note of song.notes) {
      if (note.start + note.duration <= offset) continue;
      const start = origin + Math.max(0, note.start - offset);
      const duration = note.duration - Math.max(0, offset - note.start);
      // Decaying harmonics: each pressed key produces its own voice.
      [1, 2, 3, 4, 6].forEach((harmonic, i) => {
        const oscillator = ctx.createOscillator(); const gain = ctx.createGain();
        oscillator.frequency.value = frequency(note.midi) * harmonic;
        const level = .19 * [1, .38, .16, .08, .025][i];
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(level, start + .006);
        gain.gain.exponentialRampToValueAtTime(level * .22, start + duration);
        gain.gain.exponentialRampToValueAtTime(.0001, start + duration + .16);
        oscillator.connect(gain); gain.connect(master.current!);
        oscillator.start(start); oscillator.stop(start + duration + .2);
        voices.current.push(oscillator);
      });
    }
    setPlaying(true);
  }
  async function play() {
    if (!context.current) { context.current = new AudioContext(); master.current = context.current.createGain(); master.current.gain.value = volume; master.current.connect(context.current.destination); }
    await context.current.resume(); stopVoices(); schedule(clock.current.offset >= song.duration ? 0 : clock.current.offset);
  }
  function pause() { const c = clock.current; if (c.playing) c.offset = Math.min(song.duration, c.offset + Math.max(0, context.current!.currentTime - c.origin)); c.playing = false; stopVoices(); setPlaying(false); setTime(c.offset); }
  function seek(value: number) { const active = clock.current.playing; stopVoices(); clock.current.offset = value; setTime(value); if (active) schedule(value); }
  useEffect(() => { if (master.current) master.current.gain.setTargetAtTime(volume, context.current!.currentTime, .02); }, [volume]);
  useEffect(() => { stopVoices(); clock.current = { playing:false, offset:0, origin:0 }; setTime(0); setPlaying(false); }, [song]);
  useEffect(() => { let frame: number; const tick = () => { const c = clock.current; if(c.playing && context.current) { const t = Math.min(song.duration, c.offset + Math.max(0, context.current.currentTime - c.origin)); setTime(t); if(t >= song.duration) { c.playing = false; c.offset = t; setPlaying(false); stopVoices(); } } frame = requestAnimationFrame(tick); }; frame = requestAnimationFrame(tick); return () => cancelAnimationFrame(frame); }, [song]);
  useEffect(() => { const hide = () => { if(document.hidden) pause(); }; document.addEventListener('visibilitychange', hide); return () => document.removeEventListener('visibilitychange', hide); }, [song]);
  useEffect(() => () => { void context.current?.close(); }, []);
  return { time, playing, play, pause, seek, volume, setVolume };
}
