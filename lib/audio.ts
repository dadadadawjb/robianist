import { frequency, type Note } from './music.ts';

// Queue only the next quarter-second, rather than thousands of future oscillators.
export function createNoteScheduler(ctx:AudioContext,output:AudioNode,notes:Note[],offset:number,origin:number) {
  let index=0;
  const voices=new Map<OscillatorNode,GainNode>();
  function pump() {
    const now=ctx.currentTime;
    const horizon=now+.25;
    while(index<notes.length&&origin+notes[index].start-offset<=horizon) {
      const note=notes[index++];
      const end=origin+note.start+note.duration-offset;
      const start=Math.max(now+.005,origin+Math.max(0,note.start-offset));
      if(end<=start)continue;
      [1,2,3,4,6].forEach((harmonic,i)=>{
        const oscillator=ctx.createOscillator(),gain=ctx.createGain();
        oscillator.frequency.value=frequency(note.midi)*harmonic;
        const level=.19*[1,.38,.16,.08,.025][i];
        gain.gain.setValueAtTime(0,start);
        gain.gain.linearRampToValueAtTime(level,start+Math.min(.006,(end-start)/2));
        gain.gain.exponentialRampToValueAtTime(level*.22,end);
        gain.gain.exponentialRampToValueAtTime(.0001,end+.16);
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
