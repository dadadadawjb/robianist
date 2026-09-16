import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fingerVelocity, optimizeFingers, skipTransition } from '../lib/pianoplayer.ts';
import { assignFingers } from '../lib/fingering.ts';
import type { Note } from '../lib/music.ts';

// Generated with unmodified Hand.optimize_seq / ave_velocity from upstream revision
// 6fb0e2114d7b21f75c0be5208172e1243a57323e, size M, autodepth=False,
// depth=len(notes), istart=0; x=keyX(midi)*100, mirrored for LH. IDs converted to 0..4.
const references=JSON.parse(readFileSync(new URL('./fixtures/pianoplayer.json',import.meta.url),'utf8')) as {notes:Note[];fingers:number[];velocity:number}[];
test('TypeScript motion cost and optimal attacks match Python reference windows',()=>{
  for(const {notes,fingers,velocity} of references) {
    const size=notes.filter(n=>n.start===notes[0].start).length;
    assert.deepEqual(optimizeFingers(notes,5,[]),fingers.slice(0,size));
    const actual=notes.slice(1).reduce((sum,n,i)=>sum+fingerVelocity(notes[i],fingers[i],n,fingers[i+1]),0)/(notes.length-1);
    assert.ok(Math.abs(actual-velocity)<1e-10,`${actual} != ${velocity}`);
  }
});
test('lookahead prepares the thumb crossing in an ascending scale',()=>{
  const notes:Note[]=[60,62,64,65,67,69,71,72].map((midi,i)=>({midi,start:i*.25,duration:.25,hand:'right'}));
  const fingers=assignFingers(notes,5).map(n=>n.finger);
  assert.ok(fingers.slice(1).some((f,i)=>f===0&&fingers[i]>0));
  assert.deepEqual(assignFingers(notes,5).map(n=>n.finger),fingers);
});
test('upstream crossing, repetition, black-key and chord stretch rules',()=>{
  const a={midi:60,start:0,duration:.5,hand:'right' as const,chord:false};
  assert.equal(skipTransition(a,1,{...a,midi:64,start:1},1),true);
  assert.equal(skipTransition(a,3,{...a,midi:64,start:1},2),true);
  assert.equal(skipTransition(a,2,{...a,midi:65,start:1},0),false);
  assert.equal(skipTransition(a,2,{...a,midi:66,start:1},0),true);
  assert.equal(skipTransition({...a,midi:61},0,{...a,midi:60,start:1},1),true);
  assert.equal(skipTransition({...a,chord:true},2,{...a,midi:72,chord:true},3),true);
});
test('short inputs and outsize spans retain valid contacts without changing audio',()=>{
  assert.deepEqual(assignFingers([],5),[]);
  assert.deepEqual(assignFingers([{midi:60,start:0,duration:1,hand:'right'}],5).map(n=>n.finger),[0]);
  for(const hand of ['left','right'] as const) {
    const notes=[21,48,72,96,108].map(midi=>({midi,start:0,duration:1,hand}));
    const original=structuredClone(notes);
    const planned=assignFingers(notes,5);
    assert.deepEqual(planned.map(n=>n.finger),hand==='right'?[0,1,2,3,4]:[4,3,2,1,0]);
    assert.deepEqual(notes,original);
  }
  for(const count of [0,6,1.5])assert.throws(()=>assignFingers([],count),/Finger count/);
});
