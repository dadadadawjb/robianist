import { frequency, type Note, type PedalEvent } from './music.ts';
import { soundingEnd } from './pedal.ts';

// Queue only the next quarter-second, rather than thousands of future oscillators.
export function createNoteScheduler(ctx:AudioContext,output:AudioNode,notes:Note[],offset:number,origin:number,pedals:PedalEvent[]=[]) {
  let index=0;
  const voices=new Map<OscillatorNode,GainNode>();
  function pump() {
    const now=ctx.currentTime;
    const horizon=now+.25;
    while(index<notes.length&&origin+notes[index].start-offset<=horizon) {
      const note=notes[index++];
      if(note.velocity===0)continue;
      const release=soundingEnd(note,pedals);
      const end=origin+release-offset;
      const start=Math.max(now+.005,origin+Math.max(0,note.start-offset));
      if(end<=start)continue;
      [1,2,3,4,6].forEach((harmonic,i)=>{
        const oscillator=ctx.createOscillator(),gain=ctx.createGain();
        oscillator.frequency.value=frequency(note.midi)*harmonic;
        const velocity=(note.velocity??76)/76;
        const level=.19*[1,.38,.16,.08,.025][i]*velocity**1.6*Math.min(1.3,velocity**(i*.12));
        const decay=1.5+3*(108-note.midi)/87;
        const age=Math.max(0,start-(origin+note.start-offset));
        const amplitude=(t:number)=>Math.max(.00001,level*Math.exp(-t/decay));
        gain.gain.setValueAtTime(age>0?amplitude(age):0,start);
        gain.gain.linearRampToValueAtTime(amplitude(age),start+Math.min(.006,(end-start)/2));
        gain.gain.exponentialRampToValueAtTime(amplitude(release-note.start),end);
        gain.gain.exponentialRampToValueAtTime(Math.max(.000001,amplitude(release-note.start)*.001),end+.16);
        oscillator.connect(gain);gain.connect(output);
        oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();voices.delete(oscillator);};
        voices.set(oscillator,gain);
        oscillator.start(start);oscillator.stop(end+.2);
      });
    }
  }
  function stop() {
    for(const [oscillator,gain] of voices) {
      oscillator.onended=null;oscillator.stop();oscillator.disconnect();gain.disconnect();
    }
    voices.clear();
  }
  return {pump,stop};
}
