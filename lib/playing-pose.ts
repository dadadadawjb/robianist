import * as THREE from 'three';
import type { URDFRobot } from 'urdf-loader';
import type { FingerNote } from './fingering.ts';
import { keyContact } from './keyboard.ts';
import { armJoints,hand,seatedDepth,type Side } from './presets.ts';
import { createPoseIK } from './arm-ik.ts';

// The tip frame is inside the rounded fingertip, not on its contact surface.
export const fingertipRadius=.0075;
const idleTipHeight=keyContact(61,false)[1]+fingertipRadius+.012;
export function playingContact(midi:number,pressed:boolean) {
  const goal=new THREE.Vector3(...keyContact(midi,pressed));
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
    const armRest=[-.3,side==='left'?.15:-.15,0,1,0,0,0];
    armJoints(side).forEach((name,i)=>model.setJointValue(name,armRest[i]));
    return {side,orientation,offsets,rest,ready,fingerNames,armRest,target:new THREE.Vector3(),
      arm:createPoseIK(model,`${side}_wrist_yaw_link`,armJoints(side),armRest),
      contacts:createPoseIK(model,`${side}_wrist_yaw_link`,[...armJoints(side),...fingerNames.flat()],[...armRest,...rest.flat()]),
      fingers:hand.tips(side).map((tip,i)=>createPoseIK(model,tip,fingerNames[i],rest[i]))};
  });
  let lastTime:number|undefined;
  return {update(notes:FingerNote[],time:number,playing:boolean,delta:number){
    const reset=lastTime===undefined||time<lastTime||Math.abs(time-lastTime)>.25;
    lastTime=time;
    for(const rig of rigs) {
      const own=notes.filter(n=>n.hand===rig.side);
      const active=own.filter(n=>time>=n.start&&time<n.start+n.duration);
      const next=own.find(n=>n.start>time)??own.at(-1);
      const anchor=active.length?active:next?[next]:[];
      if(!anchor.length)continue;
      const goals=anchor.map(n=>playingContact(n.midi,playing&&active.length>0));
      const span=Math.max(...goals.map(p=>p.x))-Math.min(...goals.map(p=>p.x));
      // Turn within the keyboard plane for wide chords, exposing the thumb's diagonal reach.
      const turn=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),(rig.side==='left'?1:-1)*THREE.MathUtils.clamp((span-.1)/.15,0,.5));
      const orientation=turn.clone().multiply(rig.orientation);
      const target=new THREE.Vector3();
      // Locate the wrist using the assigned fingers' relaxed offsets, not the middle fingertip.
      anchor.forEach((n,i)=>target.add(goals[i].clone().sub(rig.offsets[n.finger].clone().applyQuaternion(turn))));
      target.divideScalar(anchor.length);
      if(reset) {
        rig.target.copy(target);
        armJoints(rig.side).forEach((name,i)=>model.setJointValue(name,rig.armRest[i]));
      } else rig.target.lerp(target,1-Math.exp(-delta*28));
      rig.arm.update(rig.target,orientation);
      rig.fingers.forEach((solver,i)=>{
        const n=active.find(n=>n.finger===i);
        const pose=n?rig.rest[i]:rig.ready[i];
        pose.forEach((angle,j)=>model.setJointValue(rig.fingerNames[i][j],angle));
        if(n)solver.update(playingContact(n.midi,playing));
      });
      if(active.length>1)rig.contacts.update(rig.target,orientation,active.map(n=>({end:`${rig.side}_finger${n.finger+1}_tip_link`,goal:playingContact(n.midi,playing)})));
      // Shared-arm solving can lower idle fingers too. Lift them after the final wrist pose.
      rig.fingers.forEach((solver,i)=>{
        if(active.some(n=>n.finger===i))return;
        const goal=model.links[hand.tips(rig.side)[i]].getWorldPosition(new THREE.Vector3());
        if(goal.y<idleTipHeight){goal.y=idleTipHeight;solver.update(goal);}
      });
    }
    model.updateWorldMatrix(true,true);
  }};
}
