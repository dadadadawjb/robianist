import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pedalDown,pedalAmount,pedalContact,soundingEnd} from '../lib/pedal.ts';
const events=[{time:0,down:true},{time:2,down:false},{time:2,down:true},{time:4,down:false}];
test('pedal sustains key releases until damping, including an immediate repedal',()=>{
  const note={midi:60,start:0,duration:1,hand:'right' as const};
  assert.equal(soundingEnd(note,events),2);
  assert.equal(soundingEnd({...note,duration:2},events),2);
  assert.equal(soundingEnd({...note,duration:3},events),4);
  assert.equal(soundingEnd({...note,duration:5},events),5);
  assert.equal(soundingEnd(note,[]),1);
  assert.equal(pedalDown(events,3),true);
  assert.equal(pedalDown(events,4),false);
});
test('pedal and foot share deterministic press/release geometry after seeking',()=>{
  assert.equal(pedalAmount(events,1),1);
  assert.equal(pedalAmount(events,2),0);
  assert.equal(pedalAmount(events,2.1),1);
  assert.equal(pedalAmount(events,4.1),0);
  assert.ok(pedalAmount(events,.03)>0&&pedalAmount(events,.03)<1);
  assert.ok(pedalContact(1)[1]<pedalContact(0)[1]-.01);
});
