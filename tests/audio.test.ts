import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createNoteScheduler} from '../lib/audio.ts';
import {readScore} from '../lib/score.ts';
function audio() {
  const oscillators:any[]=[];const gains:any[]=[];
  const ctx={currentTime:0,createOscillator(){
    const oscillator={frequency:{value:0},startTime:-1,stopTime:-1,disconnected:false,onended:null as null|(()=>void),connect(){},disconnect(){this.disconnected=true;},start(t:number){this.startTime=t;},stop(t=ctx.currentTime){this.stopTime=t;}};
    oscillators.push(oscillator);return oscillator;
  },createGain(){
    const gain={disconnected:false,gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){this.disconnected=true;}};
    gains.push(gain);return gain;
  }};
  return {ctx:ctx as unknown as AudioContext,oscillators,gains};
}
test('both full scores schedule their opening notes without allocating the whole song',()=>{
  for(const name of ['HumanLight','IfOnly']) {
    const song=readScore(readFileSync(new URL(`../public/scores/${name}.mxl`,import.meta.url)),name+'.mxl');
    const {ctx,oscillators}=audio();
    const queue=createNoteScheduler(ctx,{} as AudioNode,song.notes,0,.1);
    queue.pump();
    assert.ok(oscillators.length>0&&oscillators.length<40);
    assert.equal(oscillators.length,song.notes.filter(n=>n.start<=.15).length*5);
    assert.ok(oscillators.every(o=>o.startTime>=.1));
    const opening=oscillators.length;queue.pump();assert.equal(oscillators.length,opening);
    Object.assign(ctx,{currentTime:1});queue.pump();assert.ok(oscillators.length>opening);
    queue.stop();
  }
});
test('seeking resumes a held note and queues later notes exactly once',()=>{
  const {ctx,oscillators}=audio();
  const notes=[{midi:60,start:0,duration:2,hand:'right' as const},{midi:64,start:1.4,duration:1,hand:'right' as const}];
  const queue=createNoteScheduler(ctx,{} as AudioNode,notes,1,.1);
  queue.pump();assert.equal(oscillators.length,5);
  assert.equal(oscillators[0].startTime,.1);
  assert.ok(Math.abs(oscillators[0].stopTime-1.3)<1e-8);
  Object.assign(ctx,{currentTime:.3});queue.pump();assert.equal(oscillators.length,10);
  queue.pump();assert.equal(oscillators.length,10);
});
test('ended voices and paused queues disconnect both oscillators and gains',()=>{
  const {ctx,oscillators,gains}=audio();
  const queue=createNoteScheduler(ctx,{} as AudioNode,[{midi:60,start:0,duration:1,hand:'right'}],0,.1);
  queue.pump();oscillators[0].onended();
  assert.ok(oscillators[0].disconnected&&gains[0].disconnected);
  queue.stop();assert.ok(oscillators.every(o=>o.disconnected));assert.ok(gains.every(g=>g.disconnected));
});
