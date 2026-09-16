import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { URDFRobot, URDFJoint, URDFLink } from 'urdf-loader/src/URDFClasses.js';
import { createChainIK } from '../lib/arm-ik.ts';

test('URDF to CCD adapter reaches a piano target while respecting joint limits',()=>{
  const robot=new URDFRobot();robot.joints={};robot.links={};let parent:THREE.Object3D=robot;
  const origins=[[0,0,.333,0],[0,0,0,-Math.PI/2],[0,-.316,0,Math.PI/2],[.0825,0,0,Math.PI/2],[-.0825,.384,0,-Math.PI/2],[0,0,0,Math.PI/2],[.088,0,0,Math.PI/2],[0,0,.107,0]];
  const ranges=[[-2.8973,2.8973],[-1.7628,1.7628],[-2.8973,2.8973],[-3.0718,-.0698],[-2.8973,2.8973],[-.0175,3.7525],[-2.8973,2.8973]];
  origins.forEach(([x,y,z,rx],i)=>{const joint=new URDFJoint();joint.jointType=i<7?'revolute':'fixed';joint.position.set(x,y,z);joint.rotation.x=rx;joint.axis.set(0,0,1);if(i<7){joint.limit.lower=ranges[i][0];joint.limit.upper=ranges[i][1];}parent.add(joint);const link=new URDFLink();joint.add(link);robot.joints[`panda_joint${i+1}`]=joint;robot.links[`panda_link${i+1}`]=link;parent=link;});
  const ik=createChainIK(robot,'panda_link8',Array.from({length:7},(_,i)=>`panda_joint${i+1}`),[0,-.45,0,-1.9,0,1.5,.7]);const target=new THREE.Vector3(.43,.08,.44);
  for(let i=0;i<80;i++)ik.update(target);
  robot.updateMatrixWorld(true);
  const error=robot.links.panda_link8.getWorldPosition(new THREE.Vector3()).distanceTo(target);
  assert.ok(error<.025,`end effector error ${error}`);
  for(let i=1;i<=7;i++){const joint=robot.joints[`panda_joint${i}`];assert.ok(joint.angle>=joint.limit.lower-1e-8&&joint.angle<=joint.limit.upper+1e-8);}
});


test('arbitrary local joint axes reach a target',()=>{
  const robot=new URDFRobot();robot.joints={};robot.links={};let parent:THREE.Object3D=robot;
  for(let i=0;i<2;i++){const j=new URDFJoint();j.jointType='revolute';j.axis.set(0,1,0);j.position.z=i*.3;j.limit.lower=-2;j.limit.upper=2;parent.add(j);const link=new URDFLink();j.add(link);robot.joints['j'+i]=j;robot.links['link'+i]=link;parent=link;}
  const tip=new URDFLink();tip.position.z=.3;parent.add(tip);robot.links.tip=tip;
  const ik=createChainIK(robot,'tip',['j0','j1'],[.2,.6]);const target=new THREE.Vector3(.3,0,.45);
  for(let i=0;i<50;i++)ik.update(target);robot.updateMatrixWorld(true);
  assert.ok(tip.getWorldPosition(new THREE.Vector3()).distanceTo(target)<.015);
});

test('finger IK follows moving ancestor joints without moving the arm',()=>{
  const robot=new URDFRobot();robot.joints={};robot.links={};
  const arm=new URDFJoint();arm.jointType='revolute';arm.axis.set(0,0,1);arm.limit.lower=-2;arm.limit.upper=2;robot.add(arm);robot.joints.arm=arm;
  const finger=new URDFJoint();finger.jointType='revolute';finger.axis.set(0,0,1);finger.position.x=.3;finger.limit.lower=-2;finger.limit.upper=2;arm.add(finger);robot.joints.finger=finger;
  const tip=new URDFLink();tip.position.x=.1;finger.add(tip);robot.links.tip=tip;
  const ik=createChainIK(robot,'tip',['finger']);
  arm.setJointValue(Math.PI/2);
  const goal=new THREE.Vector3(-.05,.3+Math.sqrt(.0075),0);
  for(let i=0;i<30;i++)ik.update(goal);
  robot.updateMatrixWorld(true);
  assert.ok(tip.getWorldPosition(new THREE.Vector3()).distanceTo(goal)<.001);
  assert.equal(arm.angle,Math.PI/2);
});
