import * as THREE from 'three';
import type { URDFRobot } from 'urdf-loader';
import type { FingerNote } from './fingering.ts';
import { keyContact } from './keyboard.ts';
import { armJoints,hand,seatedDepth,type Side } from './presets.ts';
import { createPoseIK } from './arm-ik.ts';
import { isBlack, type Song } from './music.ts';
import { beatAt } from './score.ts';
import { pedalAmount, pedalContact, footSupport } from './pedal.ts';

// The tip frame is inside the rounded fingertip, not on its contact surface.
export const fingertipRadius=.0075;
const idleTipHeight=keyContact(61,false)[1]+fingertipRadius+.012;
export function playingContact(midi:number,pressed:boolean,finger?:number) {
  const depth=finger===undefined?0:[0,-.009,-.016,-.011,0][finger]*(isBlack(midi)?.4:1);
  const goal=new THREE.Vector3(...keyContact(midi,pressed,depth));
  goal.y+=fingertipRadius+(pressed?0:.025);
  return goal;
}

export function createPlayingPose(model:URDFRobot) {
  model.rotation.set(-Math.PI/2,0,Math.PI/2);
  model.position.set(0,.59,seatedDepth);
  const rigs=(['left','right'] as Side[]).map(side=>{
    model.setJointValue(`${side}_hip_pitch_joint`,-Math.PI/2);
    model.setJointValue(`${side}_knee_joint`,Math.PI/2);
    const fingerNames=hand.tips(side).map((_,i)=>[1,2,3,4].map(j=>`${side}_finger${i+1}_joint${j}`));
    [...armJoints(side),...fingerNames.flat()].forEach(name=>model.setJointValue(name,0));
    model.updateWorldMatrix(true,true);
    const wrist=model.links[`${side}_wrist_yaw_link`];
    const points=hand.tips(side).map(name=>wrist.worldToLocal(model.links[name].getWorldPosition(new THREE.Vector3())));
    const palm=wrist.worldToLocal(model.links[`${side}_palm_link`].getWorldPosition(new THREE.Vector3()));
    const across=points[4].clone().sub(points[1]).normalize().multiplyScalar(side==='right'?1:-1);
    const back=palm.sub(points[2]);back.addScaledVector(across,-back.dot(across)).normalize();
    const up=new THREE.Vector3().crossVectors(back,across).normalize();
    const orientation=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(across,up,back)).invert();
    const rest=fingerNames.map((_,i)=>i===0?[.7,.5,.3,.3]:[.5,0,.6,.4]);
    const ready=fingerNames.map((_,i)=>i===0?[.55,.65,.15,.15]:[.25,0,.35,.2]);
    rest.forEach((angles,i)=>angles.forEach((angle,j)=>model.setJointValue(fingerNames[i][j],angle)));
    model.updateWorldMatrix(true,true);
    const offsets=hand.tips(side).map(name=>wrist.worldToLocal(model.links[name].getWorldPosition(new THREE.Vector3())).applyQuaternion(orientation));
    const mirror=side==='left'?1:-1;
    const armRest=[-.1,mirror*.35,0,-.6,mirror*1.2,0,-mirror*.6];
    armJoints(side).forEach((name,i)=>model.setJointValue(name,armRest[i]));
    return {side,orientation,offsets,rest,ready,fingerNames,armRest,target:new THREE.Vector3(),
      arm:createPoseIK(model,`${side}_wrist_yaw_link`,armJoints(side),armRest),
      contacts:createPoseIK(model,`${side}_wrist_yaw_link`,[...armJoints(side),...fingerNames.flat()],[...armRest,...rest.flat()]),
      fingers:hand.tips(side).map((tip,i)=>createPoseIK(model,tip,fingerNames[i],rest[i]))};
  });
  const legNames=['hip_pitch','hip_roll','hip_yaw','knee','ankle_pitch','ankle_roll'].map(n=>`right_${n}_joint`);
  const leg=createPoseIK(model,'right_ankle_roll_link',legNames,[-Math.PI/2,0,0,Math.PI/2,0,0]);
  let lastTime:number|undefined;
  return {update(notes:FingerNote[],time:number,playing:boolean,delta:number,song?:Song){
    const reset=lastTime===undefined||time<lastTime||Math.abs(time-lastTime)>.25;
    lastTime=time;
    const beat=song?beatAt(time,song.tempos):time*4/3;
    const nearby=notes.filter(n=>Math.abs(n.start-time)<1);
    const energy=nearby.reduce((sum,n)=>sum+(n.velocity??76)/127,0)/Math.max(1,nearby.length);
    const envelope=playing&&nearby.length?Math.min(1,time/.6)*(.6+.4*energy):0;
    model.setJointValue('waist_roll_joint',envelope*.025*Math.sin(beat*Math.PI/4));
    model.setJointValue('waist_pitch_joint',envelope*(.018+.018*Math.sin(beat*Math.PI/2)));
    model.setJointValue('waist_yaw_joint',envelope*.018*Math.sin(beat*Math.PI/8));
    {
      const amount=pedalAmount(song?.pedals??[],time);
      const contact=new THREE.Vector3(...pedalContact(amount));
      // Keep the heel on the platform while the forefoot follows the pedal.
      const pitch=Math.asin((contact.y-footSupport.top)/.15);
      const orientation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),pitch).multiply(model.quaternion);
      const ankle=contact.sub(new THREE.Vector3(.10,0,-.035).applyQuaternion(orientation));
      if(reset)legNames.forEach((name,i)=>model.setJointValue(name,[-Math.PI/2,0,0,Math.PI/2,0,0][i]));
      leg.update(ankle,orientation);
    }
    for(const rig of rigs) {
      const own=notes.filter(n=>n.hand===rig.side);
      const active=own.filter(n=>time>=n.start&&time<n.start+n.duration);
      const next=own.find(n=>n.start>time)??own.at(-1);
      const anchor=active.length?active:next?[next]:[];
      if(!anchor.length)continue;
      const goals=anchor.map(n=>playingContact(n.midi,playing&&active.length>0,n.finger));
      const span=Math.max(...goals.map(p=>p.x))-Math.min(...goals.map(p=>p.x));
      // Turn within the keyboard plane for wide chords, exposing the thumb's diagonal reach.
      const turn=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),(rig.side==='left'?1:-1)*THREE.MathUtils.clamp((span-.1)/.15,0,.65));
      const orientation=turn.clone().multiply(rig.orientation);
      const target=new THREE.Vector3();
      // Locate the wrist using the assigned fingers' relaxed offsets, not the middle fingertip.
      anchor.forEach((n,i)=>target.add(goals[i].clone().sub(rig.offsets[n.finger].clone().applyQuaternion(turn))));
      target.divideScalar(anchor.length);
      // Start moving the shared wrist toward the next attack while free fingers prepare.
      if(playing&&active.length&&next&&next.start>time&&next.start-time<.12){
        const upcoming=playingContact(next.midi,false,next.finger).sub(rig.offsets[next.finger].clone().applyQuaternion(turn));
        target.lerp(upcoming,Math.min(.3,.015/Math.max(.001,target.distanceTo(upcoming)))*(1-(next.start-time)/.12));
      }
      if(reset) {
        rig.target.copy(target);
        armJoints(rig.side).forEach((name,i)=>model.setJointValue(name,rig.armRest[i]));
      } else rig.target.lerp(target,1-Math.exp(-delta*28));
      rig.arm.update(rig.target,orientation);
      // A warm start can remain on the elbow-up branch after a wide bass chord.
      // Try the mirrored seated seed and retain it only if wrist accuracy is preserved.
      const wrist=model.links[`${rig.side}_wrist_yaw_link`],elbow=model.links[`${rig.side}_elbow_link`];
      const elbowHeight=()=>elbow.getWorldPosition(new THREE.Vector3()).y;
      const wristCost=()=>wrist.getWorldPosition(new THREE.Vector3()).distanceTo(rig.target)+.12*wrist.getWorldQuaternion(new THREE.Quaternion()).angleTo(orientation);
      if(elbowHeight()>rig.target.y+.02){
        const names=armJoints(rig.side),saved=names.map(name=>model.joints[name].angle),height=elbowHeight(),cost=wristCost();
        names.forEach((name,i)=>model.setJointValue(name,rig.armRest[i]));
        rig.arm.update(rig.target,orientation);
        if(elbowHeight()>height-.02||wristCost()>Math.max(.003,cost))names.forEach((name,i)=>model.setJointValue(name,saved[i]));
      }
      rig.fingers.forEach((solver,i)=>{
        const n=active.find(n=>n.finger===i);
        const pose=n?rig.rest[i]:rig.ready[i];
        pose.forEach((angle,j)=>model.setJointValue(rig.fingerNames[i][j],angle));
        if(n)solver.update(playingContact(n.midi,playing,n.finger));
      });
      const contacts=active.map(n=>({end:`${rig.side}_finger${n.finger+1}_tip_link`,goal:playingContact(n.midi,playing,n.finger)}));
      if(contacts.length>1||contacts.some(c=>model.links[c.end].getWorldPosition(new THREE.Vector3()).distanceTo(c.goal)>.002))rig.contacts.update(rig.target,orientation,contacts);
      // Raise idle fingers through a curved joint-space pose. Cartesian vertical IK
      // used to hyperextend middle joints and fold the distal joint on wide octaves.
      rig.fingers.forEach((_,i)=>{
        if(active.some(n=>n.finger===i))return;
        const tip=model.links[hand.tips(rig.side)[i]],raised=i===0?[.2,.4,.15,.15]:[model.joints[rig.fingerNames[i][0]].limit.lower,0,.15,.15];
        for(let step=0;step<=12;step++){
          const blend=step/12;
          rig.ready[i].forEach((angle,j)=>model.setJointValue(rig.fingerNames[i][j],THREE.MathUtils.lerp(angle,raised[j],blend)));
          if(tip.getWorldPosition(new THREE.Vector3()).y>=idleTipHeight)break;
        }
      });
    }
    model.updateWorldMatrix(true,true);
  }};
}
