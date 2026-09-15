import type { Note } from './music.ts';
export type FingerNote=Note & {finger:number};
// Keep held fingers occupied and assign ascending pitches without crossing fingers.
export function assignFingers(notes:Note[],count:number):FingerNote[] {
  const result:FingerNote[]=[];
  for(const hand of ['left','right'] as const) {
    const own=notes.filter(n=>n.hand===hand).sort((a,b)=>a.start-b.start||a.midi-b.midi);
    const last=Array.from({length:count},(_,i)=>hand==='right'?60+i*2:55-i*2);
    for(const start of [...new Set(own.map(n=>n.start))]) {
      const held=result.filter(n=>n.hand===hand&&n.start+n.duration>start+1e-6);
      const chord=own.filter(n=>n.start===start);
      const available=Array.from({length:count},(_,i)=>i).filter(i=>!held.some(n=>n.finger===i));
      if(chord.length>available.length)throw new Error(`Score exceeds ${count} simultaneous fingers on the ${hand} hand.`);
      let best:number[]=[];let cost=Infinity;
      function choose(chosen:number[],rest:number[]) {
        if(chosen.length===chord.length) {
          const all=[...held,...chord.map((n,i)=>({...n,finger:chosen[i]}))].sort((a,b)=>a.midi-b.midi);
          if(all.some((n,i)=>i>0&&(hand==='right'?n.finger<=all[i-1].finger:n.finger>=all[i-1].finger)))return;
          const score=chosen.reduce((sum,f,i)=>sum+Math.abs(chord[i].midi-last[f])+(f===0?12:0),0);
          if(score<cost){cost=score;best=chosen;}return;
        }
        for(const f of rest)choose([...chosen,f],rest.filter(x=>x!==f));
      }
      choose([],available);
      if(!best.length)throw new Error('Score requires a hand crossing or a finger substitution.');
      chord.forEach((n,i)=>{last[best[i]]=n.midi;result.push({...n,finger:best[i]});});
    }
  }
  return result.sort((a,b)=>a.start-b.start);
}
