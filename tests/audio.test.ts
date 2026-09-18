import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createNoteScheduler } from '../lib/audio.ts';
import { readScore } from '../lib/score.ts';
function audio() {
  const notes: { note: number; velocity: number; time: number; stopId: number }[] = [];
  const ctx = { currentTime: 0 } as AudioContext;
  const piano = {
    start(event: any) {
      notes.push(event);
      return () => {};
    },
    stop(target?: any) {
      this.stops++;
      this.releases.push(target);
    },
    stops: 0,
    releases: [] as any[],
    scheduler: {
      stop(target?: any) {
        this.stops++;
        this.releases.push(target);
      },
      stops: 0,
      releases: [] as any[],
    },
  };
  return {
    ctx,
    notes,
    piano: piano as unknown as Parameters<typeof createNoteScheduler>[1],
    state: piano,
  };
}
test('both full scores schedule opening samples without allocating the whole song', () => {
  for (const name of ['HumanLight', 'IfOnly']) {
    const song = readScore(
      readFileSync(new URL(`../public/scores/${name}.mxl`, import.meta.url)),
      name + '.mxl',
    );
    const { ctx, notes, piano } = audio();
    const queue = createNoteScheduler(ctx, piano, song.notes, 0, 0.1);
    queue.pump();
    assert.ok(notes.length > 0 && notes.length < 40);
    assert.equal(notes.length, song.notes.filter((n) => n.start <= 0.15).length);
    assert.ok(notes.every((n) => n.time >= 0.1));
    const opening = notes.length;
    queue.pump();
    assert.equal(notes.length, opening);
    Object.assign(ctx, { currentTime: 1 });
    queue.pump();
    assert.ok(notes.length > opening);
    queue.stop();
  }
});
test('seeking resumes held notes for their remaining duration and queues later notes once', () => {
  const { ctx, notes, piano, state } = audio();
  const queue = createNoteScheduler(
    ctx,
    piano,
    [
      { midi: 60, start: 0, duration: 2, hand: 'right' },
      { midi: 64, start: 1.4, duration: 1, hand: 'right' },
    ],
    1,
    0.1,
  );
  queue.pump();
  assert.equal(notes.length, 1);
  assert.equal(notes[0].time, 0.1);
  assert.equal(state.releases.length, 0);
  assert.ok(notes[0].velocity < 76);
  Object.assign(ctx, { currentTime: 0.3 });
  queue.pump();
  assert.equal(notes.length, 2);
  queue.pump();
  assert.equal(notes.length, 2);
  Object.assign(ctx, { currentTime: 1.09 });
  queue.pump();
  assert.deepEqual(state.releases, [{ stopId: notes[0].stopId, time: 1.1 }]);
});
test('pause cancels undispatched samples as well as active voices and disables the queue', () => {
  const { ctx, notes, piano, state } = audio();
  const queue = createNoteScheduler(
    ctx,
    piano,
    [
      { midi: 60, start: 0, duration: 1, hand: 'right' },
      { midi: 64, start: 1, duration: 1, hand: 'right' },
    ],
    0,
    0.1,
  );
  queue.pump();
  queue.stop();
  assert.equal(state.stops, 1);
  assert.equal(state.scheduler.stops, 1);
  Object.assign(ctx, { currentTime: 1 });
  queue.pump();
  assert.equal(notes.length, 1);
});
test('pedal holds released samples, repeated keys reattack, and seeks soften older tails', () => {
  const score = [
    { midi: 60, start: 0, duration: 0.5, hand: 'right' as const },
    { midi: 60, start: 1, duration: 0.5, hand: 'right' as const },
  ];
  const pedals = [
    { time: 0, down: true },
    { time: 2, down: false },
  ];
  const { ctx, notes, piano, state } = audio();
  const queue = createNoteScheduler(ctx, piano, score, 1.2, 0.1, pedals);
  queue.pump();
  assert.equal(notes.length, 2);
  assert.notEqual(notes[0].stopId, notes[1].stopId);
  Object.assign(ctx, { currentTime: 0.89 });
  queue.pump();
  assert.equal(state.releases.length, 2);
  assert.ok(state.releases.every((r) => Math.abs(r.time - 0.9) < 1e-9));
  assert.ok(notes[0].velocity > 0 && notes[0].velocity < notes[1].velocity);
});
test('sample velocity preserves dynamics and timing while silent and expired notes are skipped', () => {
  const { ctx, notes, piano } = audio();
  const queue = createNoteScheduler(
    ctx,
    piano,
    [0, 38, 92].map((velocity, i) => ({
      midi: 60 + i,
      start: 0,
      duration: 1,
      hand: 'right',
      velocity,
    })),
    0,
    0.1,
  );
  queue.pump();
  assert.deepEqual(
    notes.map((n) => n.velocity),
    [38, 92],
  );
  assert.equal(notes[0].time, notes[1].time);
  assert.ok(notes.every((n) => !('duration' in n)));
  const expired = createNoteScheduler(
    ctx,
    piano,
    [{ midi: 60, start: 0, duration: 1, hand: 'right' }],
    2,
    0.1,
  );
  expired.pump();
  assert.equal(notes.length, 2);
});

test('playback speeds scale note and pedal timing without changing pitch or attack velocity', () => {
  for (const speed of [0.5, 0.75, 1, 1.25, 1.5, 2]) {
    const { ctx, piano, notes, state } = audio();
    const queue = createNoteScheduler(
      ctx,
      piano,
      [{ midi: 60, start: 1, duration: 1, velocity: 92, hand: 'right' }],
      0,
      0.1,
      [
        { time: 0, down: true },
        { time: 3, down: false },
      ],
      speed,
    );
    queue.pump();
    assert.equal(notes.length, 0);
    Object.assign(ctx, { currentTime: 0.1 + 1 / speed - 0.1 });
    queue.pump();
    assert.equal(notes.length, 1);
    assert.equal(notes[0].note, 60);
    assert.equal(notes[0].velocity, 92);
    assert.ok(Math.abs(notes[0].time - (0.1 + 1 / speed)) < 1e-9);
    Object.assign(ctx, { currentTime: 0.1 + 3 / speed - 0.01 });
    queue.pump();
    assert.equal(state.releases.length, 1);
    assert.ok(Math.abs(state.releases[0].time - (0.1 + 3 / speed)) < 1e-9);
    queue.stop();
  }
});
test('speed changes cancel the old queue and resume from the same score position', () => {
  const { ctx, piano, notes, state } = audio();
  const score = [
    { midi: 60, start: 0, duration: 4, hand: 'right' as const },
    { midi: 64, start: 3, duration: 1, hand: 'right' as const },
  ];
  const old = createNoteScheduler(ctx, piano, score, 0, 0.1, [], 1);
  old.pump();
  Object.assign(ctx, { currentTime: 2.1 });
  old.stop();
  const next = createNoteScheduler(ctx, piano, score, 2, 2.2, [], 2);
  next.pump();
  assert.equal(notes.length, 2);
  assert.equal(notes[1].time, 2.2);
  Object.assign(ctx, { currentTime: 2.5 });
  old.pump();
  next.pump();
  assert.equal(notes.length, 3);
  assert.equal(notes[2].time, 2.7);
  Object.assign(ctx, { currentTime: 3.19 });
  next.pump();
  assert.ok(state.releases.filter(Boolean).every((r) => Math.abs(r.time - 3.2) < 1e-9));
  next.stop();
});
