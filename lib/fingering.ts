import type { Note } from './music.ts';
import { optimizeFingers, type MotionNote } from './pianoplayer.ts';
export type FingerNote=Note & {finger:number};
// Preserve held fingers where possible; otherwise approximate a substitution at an attack.
export function assignFingers(notes:Note[],count:number):FingerNote[] {
  if(!Number.isInteger(count)||count<1||count>5)throw new Error('Finger count must be between 1 and 5.');
  const result:FingerNote[]=[];
  for(const hand of ['left','right'] as const) {
    const own=notes.filter(n=>n.hand===hand).sort((a,b)=>a.start-b.start||a.midi-b.midi);
    let previous:(MotionNote & {finger:number})|undefined;
    for(const start of new Set(own.map(n=>n.start)))if(own.filter(n=>n.start===start).length>count)throw new Error(`Score exceeds ${count} simultaneous fingers on the ${hand} hand at ${start.toFixed(2)}s.`);
    for(const start of [...new Set(own.map(n=>n.start))]) {
      let held=result.filter(n=>n.hand===hand&&n.start+n.duration>start+1e-6);
      const chord=own.filter(n=>n.start===start);
      if(chord.length+held.length>count) {
        // Approximate pedal sustain: release the oldest contacts before new attacks.
        const release=held.slice().sort((a,b)=>a.start-b.start||a.midi-b.midi).slice(0,chord.length+held.length-count);
        release.forEach(n=>{n.duration=start-n.start;});
        held=held.filter(n=>!release.includes(n));
      }
      function assign(attacks:Note[],fixed:FingerNote[]) {
        return optimizeFingers([...attacks,...own.filter(n=>n.start>start).slice(0,14)],count,fixed,previous);
      }
      let attacks:Note[]=chord;
      let fingers=assign(attacks,held);
      if(!fingers.length) {
        attacks=[...held.map(n=>({...n,start,duration:n.start+n.duration-start})),...chord].sort((a,b)=>a.midi-b.midi);
        fingers=assign(attacks,[]);
        if(!fingers.length)throw new Error('The finger planner cannot assign this chord.');
        // Split visual contacts only. The original audio notes remain sustained.
        for(const n of held)n.duration=start-n.start;
      }
      attacks.forEach((n,i)=>{result.push({...n,finger:fingers[i]});});
      previous={...attacks[attacks.length-1],finger:fingers[fingers.length-1],chord:attacks.length>1};
    }
  }
  result.sort((a,b)=>a.start-b.start||a.midi-b.midi);
  // Leave time to lift before reusing a finger or striking the same key again.
  for(const n of result) {
    const next=result.find(m=>m.hand===n.hand&&m.start>n.start&&(m.finger===n.finger||m.midi===n.midi));
    if(!next||next.start>n.start+n.duration+.08)continue;
    if(next.midi===n.midi&&!notes.some(m=>m.hand===next.hand&&m.midi===next.midi&&m.start===next.start))continue;
    const gap=Math.min(.08,(next.start-n.start)*.25);
    n.duration=Math.min(n.duration,next.start-n.start-gap);
  }
  return result;
}
