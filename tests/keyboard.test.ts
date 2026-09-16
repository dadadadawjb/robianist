import {test} from 'node:test';
import assert from 'node:assert/strict';
import {keyboard,keyGeometry,keyContact} from '../lib/keyboard.ts';
import {isBlack,keyPitch} from '../lib/music.ts';

test('visible keys have metre-scale dimensions independent of piano shell scaling',()=>{
  assert.equal(keyGeometry(60,false).length,.18);
  assert.equal(keyGeometry(61,false).length,.11);
  assert.ok(keyboard.whiteWidth<keyPitch);
  assert.ok(keyboard.blackWidth<keyboard.whiteWidth);
});
test('fingertip targets lie on the rotated key top throughout a press',()=>{
  for(const midi of [60,61])for(const pressed of [false,true]){
    const key=keyGeometry(midi,pressed),[,y,z]=keyContact(midi,pressed);
    const dy=y-keyboard.pivotY,dz=z-keyboard.rearZ;
    const localY=dy*Math.cos(key.angle)+dz*Math.sin(key.angle);
    const localZ=-dy*Math.sin(key.angle)+dz*Math.cos(key.angle);
    assert.ok(Math.abs(localY-key.offsetY-key.height/2)<1e-12);
    assert.ok(localZ>0&&localZ<key.length);
    if(pressed){assert.ok(y<keyContact(midi,false)[1]);assert.ok(Math.abs(key.length*Math.sin(key.angle)-(isBlack(midi)?.009:.01))<1e-12);}
  }
});
