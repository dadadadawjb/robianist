'use client';
import { useEffect, useRef, useState } from 'react';
import { SplendidGrandPiano } from 'smplr';
import type { Song } from './music';
import { createNoteScheduler } from './audio';
export function usePlayer(song: Song, stageReady = false) {
  const context = useRef<AudioContext | null>(null);
  const piano = useRef<ReturnType<typeof SplendidGrandPiano> | null>(null);
  const request = useRef(0);
  const audioReady = useRef(false);
  const [loading, setLoading] = useState(false);
  const [audioError, setAudioError] = useState('');
  const scheduler = useRef<ReturnType<typeof createNoteScheduler> | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const clock = useRef({ playing: false, offset: 0, origin: 0 });
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const speedRef = useRef(1);
  const [speed, setSpeedState] = useState(1);
  const [volume, setVolume] = useState(0.65);
  const master = useRef<GainNode | null>(null);
  function stopVoices() {
    if (timer.current !== null) clearInterval(timer.current);
    timer.current = null;
    scheduler.current?.stop();
    scheduler.current = null;
  }
  function schedule(offset: number) {
    const ctx = context.current!;
    const origin = ctx.currentTime + 0.1;
    clock.current = { playing: true, offset, origin };
    const next = createNoteScheduler(
      ctx,
      piano.current!,
      song.notes,
      offset,
      origin,
      song.pedals,
      speedRef.current,
    );
    scheduler.current = next;
    next.pump();
    timer.current = setInterval(next.pump, 25);
    setPlaying(true);
  }
  async function prepareAudio() {
    if (!context.current) {
      context.current = new AudioContext();
      master.current = context.current.createGain();
      master.current.gain.value = volume;
      master.current.connect(context.current.destination);
    }
    if (!piano.current)
      piano.current = SplendidGrandPiano(context.current, {
        destination: master.current!,
        volume: 100,
      });
    const instrument = piano.current;
    try {
      await instrument.ready;
      if (piano.current === instrument) audioReady.current = true;
    } catch (error) {
      if (piano.current === instrument) {
        instrument.dispose();
        piano.current = null;
        audioReady.current = false;
      }
      throw error;
    }
  }
  async function play() {
    const id = ++request.current;
    setLoading(!audioReady.current);
    setAudioError('');
    try {
      const prepared = prepareAudio();
      await Promise.all([context.current?.resume(), prepared]);
      if (id !== request.current) return;
      stopVoices();
      schedule(clock.current.offset >= song.duration ? 0 : clock.current.offset);
    } catch {
      if (id !== request.current) return;
      setAudioError('Could not load piano audio. Check your connection and press Play to retry.');
    } finally {
      if (id === request.current) setLoading(false);
    }
  }
  useEffect(() => {
    if (!stageReady) return;
    // Let the completed stage paint before fetching and decoding the piano samples.
    const timer = setTimeout(() => {
      void prepareAudio().catch(() => {});
    }, 0);
    return () => clearTimeout(timer);
  }, [stageReady]);
  function pause() {
    request.current++;
    setLoading(false);
    const c = clock.current;
    if (c.playing)
      c.offset = Math.min(
        song.duration,
        c.offset + Math.max(0, context.current!.currentTime - c.origin) * speedRef.current,
      );
    c.playing = false;
    stopVoices();
    setPlaying(false);
    setTime(c.offset);
  }
  function setSpeed(value: number) {
    const c = clock.current;
    const offset = c.playing
      ? Math.min(
          song.duration,
          c.offset + Math.max(0, context.current!.currentTime - c.origin) * speedRef.current,
        )
      : c.offset;
    speedRef.current = value;
    setSpeedState(value);
    seek(offset);
  }
  function seek(value: number) {
    const active = clock.current.playing;
    stopVoices();
    clock.current.offset = value;
    setTime(value);
    if (active) schedule(value);
  }
  useEffect(() => {
    if (master.current)
      master.current.gain.setTargetAtTime(volume, context.current!.currentTime, 0.02);
  }, [volume]);
  useEffect(() => {
    request.current++;
    setLoading(false);
    stopVoices();
    clock.current = { playing: false, offset: 0, origin: 0 };
    setTime(0);
    setPlaying(false);
  }, [song]);
  useEffect(() => {
    let frame: number;
    const tick = () => {
      const c = clock.current;
      if (c.playing && context.current) {
        const t = Math.min(
          song.duration,
          c.offset + Math.max(0, context.current.currentTime - c.origin) * speedRef.current,
        );
        setTime(t);
        if (t >= song.duration) {
          c.playing = false;
          c.offset = t;
          setPlaying(false);
          stopVoices();
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [song]);
  useEffect(() => {
    const hide = () => {
      if (document.hidden) pause();
    };
    document.addEventListener('visibilitychange', hide);
    return () => document.removeEventListener('visibilitychange', hide);
  }, [song]);
  useEffect(
    () => () => {
      request.current++;
      stopVoices();
      piano.current?.dispose();
      piano.current = null;
      audioReady.current = false;
      void context.current?.close();
      context.current = null;
    },
    [],
  );
  return {
    time,
    playing,
    play,
    pause,
    seek,
    volume,
    setVolume,
    speed,
    setSpeed,
    loading,
    audioError,
  };
}
