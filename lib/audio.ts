import type { Smplr } from 'smplr';
import type { Note, PedalEvent } from './music.ts';
import { soundingEnd } from './pedal.ts';

// Queue only the next quarter-second, rather than the whole score.
export function createNoteScheduler(
  ctx: AudioContext,
  piano: Pick<Smplr, 'start' | 'stop' | 'scheduler'>,
  notes: Note[],
  offset: number,
  origin: number,
  pedals: PedalEvent[] = [],
  speed = 1,
) {
  let index = 0,
    stopped = false;
  const releases = new Map<number, number>();
  function pump() {
    if (stopped) return;
    const now = ctx.currentTime;
    const horizon = now + 0.25;
    while (index < notes.length && origin + (notes[index].start - offset) / speed <= horizon) {
      const note = notes[index++];
      if (note.velocity === 0) continue;
      const end = origin + (soundingEnd(note, pedals) - offset) / speed;
      const start = Math.max(now + 0.005, origin + Math.max(0, note.start - offset) / speed);
      if (end <= start) continue;
      const age = Math.max(0, start - (origin + (note.start - offset) / speed));
      // smplr has no per-note sample offset; approximate resumed tails with a softer attack.
      const decay = 1.5 + (3 * (108 - note.midi)) / 87;
      const velocity = Math.max(1, Math.round((note.velocity ?? 76) * Math.exp(-age / decay)));
      const stopId = index;
      piano.start({
        note: note.midi,
        velocity,
        time: start,
        stopId,
        ampRelease: 0.16,
        onEnded: () => releases.delete(stopId),
      });
      releases.set(stopId, end);
    }
    // smplr 1.0 cannot override a scheduled release: only arm releases one tick ahead.
    for (const [stopId, end] of releases)
      if (end <= now + 0.025) {
        piano.stop({ stopId, time: Math.max(now, end) });
        releases.delete(stopId);
      }
  }
  function stop() {
    stopped = true;
    piano.scheduler.stop(); // Cancel notes that smplr has not dispatched yet.
    piano.stop();
    releases.clear();
  }
  return { pump, stop };
}
