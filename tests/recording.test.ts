import {test} from 'node:test';
import assert from 'node:assert/strict';
import {recordingMime} from '../lib/recording.ts';

test('recording chooses MP4 only with codec support and otherwise a supported WebM',()=>{
  assert.ok(recordingMime(()=>true).startsWith('video/mp4;'));
  assert.equal(recordingMime(mime=>mime==='video/webm;codecs=vp8,opus'),'video/webm;codecs=vp8,opus');
  assert.throws(()=>recordingMime(()=>false),/no supported video recording format/);
});
