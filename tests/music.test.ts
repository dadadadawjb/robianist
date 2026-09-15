import { test } from 'node:test';
import assert from 'node:assert/strict';
import { songs, frequency, keyX, isBlack } from '../lib/music.ts';
import { assignFingers } from '../lib/fingering.ts';
test('concert pitch and semitone tuning',()=>{assert.equal(frequency(69),440);assert.equal(frequency(81),880);});
test('88-key keyboard maps all notes monotonically',()=>{for(let m=22;m<=108;m++)assert.ok(keyX(m)>keyX(m-1));assert.equal(isBlack(61),true);assert.equal(keyX(60),-.25);});
test('scores fit the keyboard and assign distinct fingers to overlapping notes',()=>{for(const song of songs)for(const count of [4,5]){
  const planned=assignFingers(song.notes,count);
  assert.equal(planned.length,song.notes.length);
  for(const n of planned){assert.ok(n.midi>=21&&n.midi<=108);assert.ok(n.duration>0&&n.start>=0&&n.start+n.duration<=song.duration);for(const other of planned){if(n!==other&&n.hand===other.hand&&n.start<other.start+other.duration&&other.start<n.start+n.duration)assert.notEqual(n.finger,other.finger);}}
}});
test('chord study plays six simultaneous notes',()=>{assert.equal(songs.find(s=>s.id==='chords')!.notes.filter(n=>n.start===0).length,6);});
test('held notes retain fingers when a second voice enters',()=>{const notes=assignFingers([{midi:60,start:0,duration:2,hand:'right'},{midi:64,start:1,duration:.5,hand:'right'}],4);assert.notEqual(notes[0].finger,notes[1].finger);});
