'use client';
import { use, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import URDFLoader, { type URDFRobot } from 'urdf-loader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createArmIK } from '@/lib/arm-ik';
const cache = new Map<string, Promise<URDFRobot>>();
function load(url: string) {
  if(!cache.has(url)) cache.set(url, new Promise((resolve,reject) => {
    const manager = new THREE.LoadingManager(); const loader = new URDFLoader(manager);
    loader.parseCollision = false;
    const original = loader.defaultMeshLoader.bind(loader);
    loader.loadMeshCb = (path,mgr,material,done) => {
      if(/\.glb$/i.test(path)) new GLTFLoader(mgr).load(path,g=>done(g.scene),undefined,e=>reject(e));
      else original(path,mgr,material,done);
    };
    let model: URDFRobot;
    manager.onLoad = () => resolve(model);
    manager.onError = path => reject(new Error(`模型资源加载失败: ${path}`));
    loader.load(url, value => { model=value; },undefined,reject);
  }));
  return cache.get(url)!;
}
function useModel(url:string) {
  const source = use(load(url));
  return useMemo(() => {const model=source.clone() as URDFRobot; model.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=true;o.receiveShadow=true;}});return model;},[source]);
}
export function ImportedArm({url,base,target,scale}:{url:string;base:THREE.Vector3;target:THREE.Vector3;scale:number}) {
  const model=useModel(url);
  const ik=useMemo(()=>createArmIK(model),[model]);
  useFrame(()=>ik.update(target),-1);
  return <group position={[base.x,.25,base.z]} rotation={[0,Math.PI/2,0]}><primitive object={model} rotation={[-Math.PI/2,0,0]} scale={scale}/></group>;
}
export function ImportedHand({url,position,pressed,finger,noteX,scale}:{url:string;position:THREE.Vector3;pressed:boolean;finger:number;noteX:number;scale:number}) {
  const model=useModel(url);
  useMemo(()=>{model.traverse(o=>{if(o instanceof THREE.Mesh)o.material=new THREE.MeshStandardMaterial({color:'#aab1b3',metalness:.35,roughness:.4});});},[model]);
  useFrame((_,delta)=>{
    for(let f=0;f<3;f++) for(let joint=0;joint<4;joint++) {
      const j=model.joints[String(f*4+joint)];
      const value=joint===0?0:joint===1?(pressed && f===finger%3 ? .35 : 0):.25;
      j.setJointValue(THREE.MathUtils.damp(j.angle,value,24,delta));
    }
    model.setJointValues({'12':.2,'13':.3,'14':.15,'15':.2});
    model.position.set(0,0,0);model.updateWorldMatrix(true,true);
    const tip=model.links[['fingertip','fingertip_2','fingertip_3'][finger%3]].localToWorld(new THREE.Vector3(-.0105,-.0449,.01466));
    model.position.set(noteX,pressed?1.235:1.43,-.16).sub(tip);
    position.copy(model.position).add(new THREE.Vector3(.05,-.025,.15));
  },-2);
  return <primitive object={model} rotation={[-Math.PI/2,0,Math.PI/2]} scale={scale}/>;
}
