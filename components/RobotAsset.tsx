'use client';
import { use, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import URDFLoader, { type URDFRobot } from 'urdf-loader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { createChainIK } from '@/lib/arm-ik';
import { isBlack,keyX } from '@/lib/music';
import type { FingerNote } from '@/lib/fingering';
import type { ArmRig,HandPreset,Side } from '@/lib/presets';
const cache=new Map<string,Promise<URDFRobot>>();
function load(url:string) {
  if(!cache.has(url))cache.set(url,new Promise((resolve,reject)=>{
    const manager=new THREE.LoadingManager(),loader=new URDFLoader(manager);loader.parseCollision=false;
    const original=loader.defaultMeshLoader.bind(loader);
    loader.loadMeshCb=(path,mgr,material,done)=>{
      if(/\.glb$/i.test(path))new GLTFLoader(mgr).load(path,g=>done(g.scene),undefined,reject);
      else if(/\.obj$/i.test(path))new MTLLoader(mgr).load(path.replace(/\.obj$/i,'.mtl'),materials=>{materials.preload();new OBJLoader(mgr).setMaterials(materials).load(path,obj=>done(obj),undefined,reject);},undefined,reject);
      else original(path,mgr,material,done);
    };
    let model:URDFRobot;manager.onLoad=()=>resolve(model);manager.onError=p=>reject(new Error(`Model resource failed: ${p}`));
    manager.itemStart(url);
    fetch(url).then(r=>{if(!r.ok)throw new Error(`Model ${r.status}: ${url}`);return r.text();}).then(xml=>{loader.workingPath=url.includes('/vendor/')?'':url.slice(0,url.lastIndexOf('/')+1);model=loader.parse(xml);manager.itemEnd(url);}).catch(reject);
  }));return cache.get(url)!;
}
function useModel(url:string) {
  const source=use(load(url));
  return useMemo(()=>{const model=source.clone() as URDFRobot;model.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=true;o.receiveShadow=true;}});return model;},[source]);
}
export function ImportedArm({rig,base,target,scale}:{rig:ArmRig;base:THREE.Vector3;target:THREE.Vector3;scale:number}) {
  const model=useModel(rig.url),ik=useMemo(()=>createChainIK(model,rig.tip,rig.joints,rig.seed),[model,rig]);
  useFrame(()=>ik.update(target),-1);
  return <group position={[base.x,.25,base.z]} rotation={[0,Math.PI/2,0]}><primitive object={model} rotation={[-Math.PI/2,0,0]} scale={scale}/></group>;
}
export function ImportedHand({preset,side,wrist,notes,time,playing}:{preset:HandPreset;side:Side;wrist:THREE.Vector3;notes:FingerNote[];time:number;playing:boolean}) {
  const model=useModel(preset.url(side));
  const data=useMemo(()=>{
    model.position.set(0,0,0);model.quaternion.identity();model.scale.setScalar(1);
    Object.values(model.joints).forEach(j=>j.setJointValue(0));
    const tips=preset.tips(side).map(n=>model.links[n]);
    const palm=model.links[preset.palm(side)];
    if(!palm||tips.some(t=>!t))throw new Error(`Invalid hand rig: ${preset.name}`);
    model.updateMatrixWorld(true);
    const points=tips.map(t=>t.getWorldPosition(new THREE.Vector3()));
    const center=points.slice(1).reduce((a,b)=>a.add(b),new THREE.Vector3()).divideScalar(points.length-1);
    const x=points.at(-1)!.clone().sub(points[1]).normalize().multiplyScalar(side==='right'?1:-1);
    const z=center.clone().sub(palm.getWorldPosition(new THREE.Vector3())).negate();z.addScaledVector(x,-z.dot(x)).normalize();
    const y=new THREE.Vector3().crossVectors(z,x).normalize();
    const rotation=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z)).invert();
    model.quaternion.copy(rotation);model.scale.setScalar(preset.scale);model.updateMatrixWorld(true);
    const offsets=tips.map(t=>t.getWorldPosition(new THREE.Vector3()));
    const solvers=tips.map(t=>{
      const names:string[]=[];
      for(let n:THREE.Object3D|null=t;n&&n!==palm;n=n.parent){const name=Object.keys(model.joints).find(k=>model.joints[k]===n);if(name&&model.joints[name].jointType!=='fixed')names.unshift(name);}
      return createChainIK(model,t.name,names);
    });
    return {tips,offsets,solvers,palm};
  },[model,preset,side]);
  useFrame((_,delta)=>{
    const active=notes.filter(n=>time>=n.start&&time<n.start+n.duration);
    const next=notes.find(n=>n.start>time),last=notes.filter(n=>n.start<=time).at(-1);
    const anchors=active.length?active:[next??last??notes[0]].filter(Boolean);
    if(!anchors.length)return;
    const x=anchors.reduce((sum,n)=>sum+keyX(n.midi)-data.offsets[n.finger].x,0)/anchors.length;
    const offsetY=data.offsets.slice(1).reduce((sum,p)=>sum+p.y,0)/(data.offsets.length-1);
    const offsetZ=data.offsets.slice(1).reduce((sum,p)=>sum+p.z,0)/(data.offsets.length-1);
    const desired=new THREE.Vector3(x,1.36-offsetY,-.26-offsetZ);
    model.position.lerp(desired,1-Math.exp(-delta*22));model.updateWorldMatrix(true,true);
    data.solvers.forEach((solver,i)=>{
      const n=active.find(n=>n.finger===i);
      const goal=n?new THREE.Vector3(keyX(n.midi),playing?(isBlack(n.midi)?1.34:1.235):1.40,isBlack(n.midi)?-.4:-.16):data.offsets[i].clone().add(model.position).add(new THREE.Vector3(0,.045,0));
      solver.update(goal);
    });
    model.updateWorldMatrix(true,true);data.palm.getWorldPosition(wrist);
  },-2);
  return <primitive object={model}/>;
}
