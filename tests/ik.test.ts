import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { URDFRobot, URDFJoint, URDFLink } from 'urdf-loader/src/URDFClasses.js';
import { createArmIK } from '../lib/arm-ik.ts';

test('URDF to CCD adapter reaches a piano target while respecting joint limits',()=>{
  const robot=new URDFRobot();robot.joints={};robot.links={};let parent:THREE.Object3D=robot;
  const origins=[[0,0,.333,0],[0,0,0,-Math.PI/2],[0,-.316,0,Math.PI/2],[.0825,0,0,Math.PI/2],[-.0825,.384,0,-Math.PI/2],[0,0,0,Math.PI/2],[.088,0,0,Math.PI/2],[0,0,.107,0]];
  const ranges=[[-2.8973,2.8973],[-1.7628,1.7628],[-2.8973,2.8973],[-3.0718,-.0698],[-2.8973,2.8973],[-.0175,3.7525],[-2.8973,2.8973]];
  origins.forEach(([x,y,z,rx],i)=>{const joint=new URDFJoint();joint.jointType=i<7?'revolute':'fixed';joint.position.set(x,y,z);joint.rotation.x=rx;joint.axis.set(0,0,1);if(i<7){joint.limit.lower=ranges[i][0];joint.limit.upper=ranges[i][1];}parent.add(joint);const link=new URDFLink();joint.add(link);robot.joints[`panda_joint${i+1}`]=joint;robot.links[`panda_link${i+1}`]=link;parent=link;});
  const ik=createArmIK(robot);const target=new THREE.Vector3(.43,.08,.44);
  for(let i=0;i<80;i++)ik.update(target);
  robot.updateMatrixWorld(true);
  const error=robot.links.panda_link8.getWorldPosition(new THREE.Vector3()).distanceTo(target);
  assert.ok(error<.025,`end effector error ${error}`);
  for(let i=1;i<=7;i++){const joint=robot.joints[`panda_joint${i}`];assert.ok(joint.angle>=joint.limit.lower-1e-8&&joint.angle<=joint.limit.upper+1e-8);}
});

