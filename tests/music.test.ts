import { test } from 'node:test';
import assert from 'node:assert/strict';
import { frequency, keyX, isBlack } from '../lib/music.ts';
import { readFileSync } from 'node:fs';
import { readScore } from '../lib/score.ts';
import { assignFingers } from '../lib/fingering.ts';
test('concert pitch and semitone tuning',()=>{assert.equal(frequency(69),440);assert.equal(frequency(81),880);});
test('88-key keyboard maps all notes monotonically',()=>{for(let m=22;m<=108;m++)assert.ok(keyX(m)>keyX(m-1));assert.equal(isBlack(61),true);assert.equal(keyX(60),-.25);});
test('Human Light fits four and five fingers without overlapping assignments',()=>{
  const song=readScore(readFileSync(new URL('../public/scores/HumanLight.mxl',import.meta.url)),'HumanLight.mxl');
  for(const count of [4,5]) {
    const planned=assignFingers(song.notes,count);
    assert.equal(planned.length,song.notes.length);
    for(const n of planned){assert.ok(n.midi>=21&&n.midi<=108);assert.ok(n.duration>0&&n.start>=0&&n.start+n.duration<=song.duration);for(const other of planned){if(n!==other&&n.hand===other.hand&&n.start<other.start+other.duration-1e-6&&other.start<n.start+n.duration-1e-6)assert.notEqual(n.finger,other.finger);}}
  }
});
test('too many simultaneous notes fail clearly',()=>{
  assert.throws(()=>assignFingers([60,62,64,65,67].map(midi=>({midi,start:0,duration:1,hand:'right'})),4),/exceeds 4/);
});
test('held notes retain fingers when a second voice enters',()=>{const notes=assignFingers([{midi:60,start:0,duration:2,hand:'right'},{midi:64,start:1,duration:.5,hand:'right'}],4);assert.notEqual(notes[0].finger,notes[1].finger);});

test('If Only plays with approximate contacts while preserving all audio notes',()=>{
  const song=readScore(readFileSync(new URL('../public/scores/IfOnly.mxl',import.meta.url)),'IfOnly.mxl');
  const original=structuredClone(song.notes);
  for(const count of [4,5]) {
    const planned=assignFingers(song.notes,count);
    for(const note of song.notes)assert.ok(planned.some(n=>n.hand===note.hand&&n.midi===note.midi&&n.start===note.start),'Every attack has a finger contact');
    for(const n of planned) {
      assert.ok(n.duration>0&&n.finger>=0&&n.finger<count);
      for(const other of planned)if(n!==other&&n.hand===other.hand&&n.start<other.start+other.duration-1e-6&&other.start<n.start+n.duration-1e-6)assert.notEqual(n.finger,other.finger);
    }
  }
  assert.deepEqual(song.notes,original);
});
test('substitution splits visual contact without retriggering the audio note',()=>{
  const notes=[{midi:60,start:0,duration:2,hand:'right' as const},{midi:62,start:1,duration:.5,hand:'right' as const}];
  const planned=assignFingers(notes,2);
  assert.ok(planned.some(n=>n.midi===60&&n.start===1));
  assert.equal(planned.filter(n=>n.midi===60).reduce((sum,n)=>sum+n.duration,0),2);
  assert.equal(notes[0].duration,2);
});
test('sustained releases free fingers without deleting new attacks',()=>{
  const notes=[60,64,67,72].map(midi=>({midi,start:0,duration:2,hand:'right' as const}));
  notes.push({midi:74,start:1,duration:1,hand:'right'});
  const planned=assignFingers(notes,4);
  assert.equal(planned.filter(n=>n.start<=1&&n.start+n.duration>1).length,4);
  assert.ok(planned.some(n=>n.midi===74&&n.start===1));
  assert.ok(notes.every(n=>n.duration===(n.midi===74?1:2)));
});
