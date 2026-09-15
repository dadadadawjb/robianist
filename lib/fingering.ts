import type { Note } from './music.ts';
export type FingerNote=Note & {finger:number};
// Preserve held fingers where possible; otherwise approximate a substitution at an attack.
export function assignFingers(notes:Note[],count:number):FingerNote[] {
  const result:FingerNote[]=[];
  for(const hand of ['left','right'] as const) {
    const own=notes.filter(n=>n.hand===hand).sort((a,b)=>a.start-b.start||a.midi-b.midi);
    const last=Array.from({length:count},(_,i)=>hand==='right'?60+i*2:55-i*2);
    for(const start of [...new Set(own.map(n=>n.start))]) {
      let held=result.filter(n=>n.hand===hand&&n.start+n.duration>start+1e-6);
      const chord=own.filter(n=>n.start===start);
      if(chord.length>count)throw new Error(`Score exceeds ${count} simultaneous fingers on the ${hand} hand at ${start.toFixed(2)}s.`);
      if(chord.length+held.length>count) {
        // Approximate pedal sustain: release the oldest contacts before new attacks.
        const release=held.slice().sort((a,b)=>a.start-b.start||a.midi-b.midi).slice(0,chord.length+held.length-count);
        release.forEach(n=>{n.duration=start-n.start;});
        held=held.filter(n=>!release.includes(n));
      }
      function assign(attacks:Note[],fixed:FingerNote[]) {
        let best:number[]=[];let cost=Infinity;
        function choose(chosen:number[],rest:number[]) {
          if(chosen.length===attacks.length) {
            const all=[...fixed,...attacks.map((n,i)=>({...n,finger:chosen[i]}))].sort((a,b)=>a.midi-b.midi);
            if(all.some((n,i)=>i>0&&(hand==='right'?n.finger<=all[i-1].finger:n.finger>=all[i-1].finger)))return;
            const score=chosen.reduce((sum,f,i)=>sum+Math.abs(attacks[i].midi-last[f])+(f===0?12:0),0);
            if(score<cost){cost=score;best=chosen;}return;
          }
          for(const f of rest)choose([...chosen,f],rest.filter(x=>x!==f));
        }
        choose([],Array.from({length:count},(_,i)=>i).filter(i=>!fixed.some(n=>n.finger===i)));
        return best;
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
      attacks.forEach((n,i)=>{last[fingers[i]]=n.midi;result.push({...n,finger:fingers[i]});});
    }
  }
  return result.sort((a,b)=>a.start-b.start||a.midi-b.midi);
}
