'use client';
import { use, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import URDFLoader, { type URDFRobot } from 'urdf-loader';
import { createChainIK } from '@/lib/arm-ik';
import { assetUrl } from '@/lib/asset-url';
import { keyX } from '@/lib/music';
import { keyContact } from '@/lib/keyboard';
import type { FingerNote } from '@/lib/fingering';
import { armJoints, hand, robotUrl, type Side } from '@/lib/presets';
const cache=new Map<string,Promise<URDFRobot>>();
function load(url:string) {
  if(!cache.has(url))cache.set(url,new Promise((resolve,reject)=>{
    const manager=new THREE.LoadingManager(),loader=new URDFLoader(manager);loader.parseCollision=false;
    manager.setURLModifier(assetUrl);
    let model:URDFRobot;manager.onLoad=()=>resolve(model);manager.onError=p=>reject(new Error(`Model resource failed: ${p}`));
    manager.itemStart(url);
    fetch(assetUrl(url)).then(r=>{if(!r.ok)throw new Error(`Model ${r.status}: ${url}`);return r.text();}).then(xml=>{loader.workingPath=url.slice(0,url.lastIndexOf('/')+1);model=loader.parse(xml);manager.itemEnd(url);}).catch(reject);
  }));return cache.get(url)!;
}
function useModel(url:string) {
  const source=use(load(url));
  return useMemo(()=>{const model=source.clone() as URDFRobot;model.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=true;o.receiveShadow=true;}});return model;},[source]);
}
export function Humanoid({notes,time,playing}:{notes:FingerNote[];time:number;playing:boolean}) {
  const model=useModel(robotUrl);
  const rigs=useMemo(()=>{
    model.rotation.set(-Math.PI/2,0,Math.PI/2);
    model.position.set(0,.59,.46);
    for(const side of ['left','right'] as const){
      model.setJointValue(`${side}_hip_pitch_joint`,-Math.PI/2);
      model.setJointValue(`${side}_knee_joint`,Math.PI/2);
    }
    model.updateMatrixWorld(true);
    return (['left','right'] as Side[]).map(side=>{
      // Derive the playing orientation from this assembly's actual hand mounting.
      const wrist=model.links[`${side}_wrist_yaw_link`];
      const points=hand.tips(side).map(name=>wrist.worldToLocal(model.links[name].getWorldPosition(new THREE.Vector3())));
      const palm=wrist.worldToLocal(model.links[`${side}_palm_link`].getWorldPosition(new THREE.Vector3()));
      const across=points[4].clone().sub(points[1]).normalize().multiplyScalar(side==='right'?1:-1);
      const back=palm.sub(points[2]);back.addScaledVector(across,-back.dot(across)).normalize();
      const up=new THREE.Vector3().crossVectors(back,across).normalize();
      const orientation=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(across,up,back)).invert();
      return {orientation,
      side,
      target:new THREE.Vector3(side==='left'?-.16:.16,.76,-.06),
      arm:createChainIK(model,`${side}_finger3_tip_link`,armJoints(side).slice(0,4),[-.3,side==='left'?.15:-.15,0,.8]),
      fingers:hand.tips(side).map((tip,i)=>createChainIK(model,tip,[1,2,3,4].map(j=>`${side}_finger${i+1}_joint${j}`)))
    };});
  },[model]);
  useFrame((_,delta)=>{
    for(const rig of rigs){
      const own=notes.filter(n=>n.hand===rig.side);
      const active=own.filter(n=>time>=n.start&&time<n.start+n.duration);
      const anchor=active.length?active:[own.find(n=>n.start>time)??own.at(-1)].filter((n):n is FingerNote=>!!n);
      if(!anchor.length)continue;
      const x=anchor.reduce((sum,n)=>sum+keyX(n.midi),0)/anchor.length;
      rig.target.lerp(new THREE.Vector3(x,.755,-.07),1-Math.exp(-delta*12));
      // Keep the palms facing down while solving shoulder and elbow position.
      for(let pass=0;pass<3;pass++){
        const parent=model.joints[`${rig.side}_wrist_roll_joint`].parent!;
        model.updateWorldMatrix(true,true);
        const relative=parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(rig.orientation);
        const angles=new THREE.Euler().setFromQuaternion(relative,'XYZ');
        ['roll','pitch','yaw'].forEach((axis,i)=>model.setJointValue(`${rig.side}_wrist_${axis}_joint`,[angles.x,angles.y,angles.z][i]));
        rig.arm.update(rig.target);
      }
      model.updateWorldMatrix(true,true);
      rig.fingers.forEach((solver,i)=>{
        const n=active.find(n=>n.finger===i);
        if(n){const goal=new THREE.Vector3(...keyContact(n.midi,playing));if(!playing)goal.y+=.025;solver.update(goal);}
      });
    }
  });
  return <primitive object={model}/>;
}
