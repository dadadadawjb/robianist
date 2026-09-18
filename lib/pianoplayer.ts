// Adapted from Marco Musy's pianoplayer/hand.py (MIT).
// Source revision and full license: public/licenses/pianoplayer.txt.
import { isBlack, keyX, type Note } from './music.ts';

const handFactor = 0.82;
const rest = [-7, -2.8, 0, 2.8, 5.6].map((x) => x * handFactor);
const weights = [1.1, 1, 1.1, 0.9, 0.8];
const blackBias = [0.3, 1, 1.1, 0.8, 0.7];
const stretch: Record<string, number> = {
  '2,3': 5,
  '3,4': 5,
  '1,2': 6,
  '1,3': 7,
  '2,4': 8,
  '1,4': 11,
  '0,1': 12,
  '0,2': 14,
  '0,3': 16,
};
export type Contact = Note & { finger: number };
export type MotionNote = Note & { chord: boolean };
const x = (n: Note) => keyX(n.midi) * 100 * (n.hand === 'left' ? -1 : 1);

// Upstream's default relaxed posture makes velocity depend only on the last contact.
export function fingerVelocity(a: Note, fa: number, b: Note, fb: number): number {
  const position = x(a) + (rest[fb] - rest[fa]);
  return (
    Math.abs(x(b) - position) /
    (Math.abs(b.start - a.start) + 0.1) /
    weights[fb] /
    (isBlack(b.midi) ? blackBias[fb] : 1)
  );
}

export function skipTransition(a: MotionNote, fa: number, b: MotionNote, fb: number): boolean {
  const dx = x(b) - x(a);
  if (!a.chord && !b.chord) {
    if (fa === fb && dx !== 0 && a.duration < 4) return true;
    if (fa > 0) {
      if (fb > 0 && (fb - fa) * dx < 0) return true;
      if (fb === 0 && isBlack(b.midi) && dx > 0) return true;
    } else if (isBlack(a.midi) && dx < 0 && fb > 0 && a.duration < 2) return true;
  } else if (a.chord && b.chord && a.start === b.start) {
    if (fa === fb || (a.hand === 'left' ? fa < fb : fa > fb)) return true;
    const limit = stretch[[Math.min(fa, fb), Math.max(fa, fb)].join(',')];
    if (limit !== undefined && (Math.abs(dx) * handFactor) / 0.8 > limit) return true;
  }
  return false;
}

// Exact memoized search of the relaxed-posture objective; no exponential enumeration.
// Notes are one hand, ordered by onset then pitch. Return only the current attack group.
export function optimizeFingers(
  notes: Note[],
  count: number,
  held: Contact[],
  previous?: MotionNote & { finger: number },
): number[] {
  if (!notes.length) return [];
  const firstSize = notes.findIndex((n) => n.start !== notes[0].start);
  const attacks = firstSize < 0 ? notes.length : firstSize;
  let depth = Math.min(9, notes.length);
  for (let i = 3; i < depth; i++)
    if (notes[i].start - notes[0].start > 3.5) {
      depth = i + 1;
      break;
    }
  // Do not optimize a partial chord at the end of the window.
  while (depth > attacks && depth < notes.length && notes[depth - 1].start === notes[depth].start)
    depth--;
  const window = notes.slice(0, depth).map((n, i) => ({
    ...n,
    chord: notes[i - 1]?.start === n.start || notes[i + 1]?.start === n.start,
  }));
  type Solution = { cost: number; fingers: number[] };
  function solve(relax: boolean): Solution {
    const memo = new Map<string, Solution>();
    function visit(i: number, fa: number): Solution {
      if (i === window.length) return { cost: 0, fingers: [] };
      const key = `${i},${fa}`;
      const cached = memo.get(key);
      if (cached) return cached;
      const b = window[i],
        a = i ? window[i - 1] : previous;
      let best: Solution = { cost: Infinity, fingers: [] };
      for (let fb = 0; fb < count; fb++) {
        if (
          i < attacks &&
          held.some(
            (n) =>
              n.finger === fb ||
              (b.midi - n.midi) * (fb - n.finger) * (b.hand === 'right' ? 1 : -1) <= 0,
          )
        )
          continue;
        // Simultaneous contacts always keep unique, pitch-ordered fingers, even in approximation mode.
        if (i > 0 && a!.start === b.start && (b.hand === 'right' ? fb <= fa : fb >= fa)) continue;
        const skipped = a ? skipTransition(a, fa, b, fb) : false;
        if (skipped && !relax) continue;
        const next = visit(i + 1, fb);
        const cost = next.cost + (a ? fingerVelocity(a, fa, b, fb) : 0) + (skipped ? 1e6 : 0);
        if (cost < best.cost) best = { cost, fingers: [fb, ...next.fingers] };
      }
      memo.set(key, best);
      return best;
    }
    return visit(0, previous?.finger ?? 0);
  }
  let best = solve(false);
  // Preserve the demo's approximate playing for spans/transitions outside human heuristics.
  // Unlike upstream's repeated-finger fallback, this never relaxes contact uniqueness.
  if (!Number.isFinite(best.cost)) best = solve(true);
  return best.fingers.slice(0, attacks);
}
