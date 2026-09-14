import { test } from 'node:test';
import assert from 'node:assert/strict';
import { songs, frequency, keyX, isBlack } from '../lib/music.ts';
test('concert pitch and semitone tuning',()=>{assert.equal(frequency(69),440);assert.equal(frequency(81),880);});
test('88-key keyboard maps all notes monotonically and distinguishes accidentals',()=>{for(let m=22;m<=108;m++)assert.ok(keyX(m)>keyX(m-1));assert.equal(isBlack(61),true);assert.equal(isBlack(60),false);assert.equal(keyX(60),-.25);});
test('scores are ordered, fit keyboard and have playable separate hand voices',()=>{for(const song of songs){assert.ok(song.notes.some(n=>n.hand==='left'));assert.ok(song.notes.some(n=>n.hand==='right'));for(let i=0;i<song.notes.length;i++){const n=song.notes[i];assert.ok(n.midi>=36&&n.midi<=84);assert.ok(n.duration>0&&n.start>=0&&n.start+n.duration<=song.duration);if(i)assert.ok(n.start>=song.notes[i-1].start);}for(const hand of ['left','right']){const notes=song.notes.filter(n=>n.hand===hand);for(let i=1;i<notes.length;i++)assert.ok(notes[i].start>=notes[i-1].start+notes[i-1].duration);}}});
