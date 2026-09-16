import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { robotFixture } from './robot-fixture.ts';
import { createPlayingPose,playingContact,fingertipRadius } from '../lib/playing-pose.ts';
import { keyContact } from '../lib/keyboard.ts';
import { createPoseIK } from '../lib/arm-ik.ts';
import { assignFingers } from '../lib/fingering.ts';
import { readScore } from '../lib/score.ts';
import { armJoints,hand } from '../lib/presets.ts';

const song=readScore(readFileSync(new URL('../public/scores/HumanLight.mxl',import.meta.url)),'HumanLight.mxl');
const notes=assignFingers(song.notes,5);
test('real G1 + Wuji reaches Human Light opening targets without overturning its wrists',()=>{
  const model=robotFixture(),pose=createPlayingPose(model);
  const orientations=new Map<string,THREE.Quaternion>();
  for(const time of [...new Set(notes.filter(n=>n.start<6).map(n=>n.start+.1))]) {
    for(let i=0;i<30;i++)pose.update(notes,time,true,1/60);
    for(const n of notes.filter(n=>n.start<=time&&time<n.start+n.duration)) {
      const tip=model.links[`${n.hand}_finger${n.finger+1}_tip_link`].getWorldPosition(new THREE.Vector3());
      assert.ok(tip.distanceTo(playingContact(n.midi,true))<.003,`${time}s ${n.hand} finger ${n.finger+1} misses key`);
    }
    for(const side of ['left','right'] as const) {
      const q=model.links[`${side}_wrist_yaw_link`].getWorldQuaternion(new THREE.Quaternion());
      if(!orientations.has(side))orientations.set(side,q.clone());
      assert.ok(q.angleTo(orientations.get(side)!)<.05,`${side} wrist overturned`);
      for(const name of armJoints(side)) {
        const joint=model.joints[name];
        assert.ok(joint.angle>joint.limit.lower+.01&&joint.angle<joint.limit.upper-.01,`${name} at limit`);
      }
    }
  }
});
test('released fingers return to a raised curved pose and seeking clears pose history',()=>{
  const model=robotFixture(),pose=createPlayingPose(model);
  for(const time of [0,.3,.6,1,2,3])for(let i=0;i<20;i++)pose.update(notes,time,true,1/60);
  for(let i=0;i<30;i++)pose.update(notes,0,true,1/60);
  const fresh=robotFixture(),freshPose=createPlayingPose(fresh);
  for(let i=0;i<30;i++)freshPose.update(notes,0,true,1/60);
  for(const side of ['left','right'] as const)for(const [i,name] of hand.tips(side).entries()) {
    const tip=model.links[name].getWorldPosition(new THREE.Vector3());
    assert.ok(tip.distanceTo(fresh.links[name].getWorldPosition(new THREE.Vector3()))<.001);
    if(side==='left'&&i===4)continue;
    assert.ok(tip.y>.735,`${name} should hover above the white keys`);
    assert.ok(model.joints[`${side}_finger${i+1}_joint3`].angle>.1,'Idle finger stays curved');
  }
});
test('pose IK reaches a known attainable wrist pose using actual joint axes and limits',()=>{
  const model=robotFixture(),names=armJoints('right');
  model.rotation.set(-Math.PI/2,0,Math.PI/2);model.position.set(.1,.59,.46);
  const desired=[-.5,-.4,.2,.8,-.7,.3,.2];
  names.forEach((n,i)=>model.setJointValue(n,desired[i]));
  model.updateMatrixWorld(true);
  const wrist=model.links.right_wrist_yaw_link,position=wrist.getWorldPosition(new THREE.Vector3()),orientation=wrist.getWorldQuaternion(new THREE.Quaternion());
  names.forEach((n,i)=>model.setJointValue(n,desired[i]+.15));
  const solver=createPoseIK(model,'right_wrist_yaw_link',names,desired);
  for(let i=0;i<10;i++)solver.update(position,orientation);
  assert.ok(wrist.getWorldPosition(new THREE.Vector3()).distanceTo(position)<.001);
  assert.ok(wrist.getWorldQuaternion(new THREE.Quaternion()).angleTo(orientation)<.01);
});

test('continuous opening playback settles onto keys after each attack',()=>{
  const model=robotFixture(),pose=createPlayingPose(model);
  for(let frame=0;frame<360;frame++) {
    const time=frame/60;pose.update(notes,time,true,1/60);
    for(const n of notes.filter(n=>n.start+.12<time&&time<n.start+n.duration)) {
      const tip=model.links[`${n.hand}_finger${n.finger+1}_tip_link`].getWorldPosition(new THREE.Vector3());
      assert.ok(tip.distanceTo(playingContact(n.midi,true))<.003,`${time}s ${n.hand} misses after transition`);
    }
  }
});

test('white and black chords and low bass octaves share a reachable wrist pose',()=>{
  for(const [file,times] of [['HumanLight.mxl',[58,62,78]],['IfOnly.mxl',[0,78]]] as const) {
    const score=readScore(readFileSync(new URL(`../public/scores/${file}`,import.meta.url)),file);
    const contacts=assignFingers(score.notes,5),model=robotFixture(),pose=createPlayingPose(model);
    for(const time of times) {
      for(let frame=0;frame<30;frame++)pose.update(contacts,time,true,1/60);
      for(const n of contacts.filter(n=>n.start<=time&&time<n.start+n.duration)) {
        const tip=model.links[`${n.hand}_finger${n.finger+1}_tip_link`].getWorldPosition(new THREE.Vector3());
        assert.ok(tip.distanceTo(playingContact(n.midi,true))<.005,`${file} ${time}s ${n.hand} finger ${n.finger+1}`);
      }
      for(const joint of Object.values(model.joints))if(joint.jointType==='revolute')assert.ok(joint.angle>=joint.limit.lower-1e-8&&joint.angle<=joint.limit.upper+1e-8);
    }
  }
});

test('idle fingertips stay above adjacent black keys after the playing hand settles',()=>{
  const model=robotFixture(),pose=createPlayingPose(model);
  for(const time of [0,.3,.6,1,2,3,5.5,58,62,78]) {
    for(let frame=0;frame<30;frame++)pose.update(notes,time,true,1/60);
    const active=notes.filter(n=>n.start<=time&&time<n.start+n.duration);
    for(const side of ['left','right'] as const)for(const [i,name] of hand.tips(side).entries()) {
      if(active.some(n=>n.hand===side&&n.finger===i))continue;
      const tip=model.links[name].getWorldPosition(new THREE.Vector3());
      assert.ok(tip.y-fingertipRadius>=keyContact(61,false)[1]+.01,`${time}s ${name} clearance too low: ${tip.y}`);
    }
  }
});
