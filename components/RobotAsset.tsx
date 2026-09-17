'use client';
import { use, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import URDFLoader, { type URDFRobot } from 'urdf-loader';
import { createPlayingPose } from '@/lib/playing-pose';
import { assetUrl } from '@/lib/asset-url';
import type { FingerNote } from '@/lib/fingering';
import { robotUrl } from '@/lib/presets';
import type { Song } from '@/lib/music';
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
export function Humanoid({notes,time,playing,song}:{notes:FingerNote[];time:number;playing:boolean;song:Song}) {
  const model=useModel(robotUrl);
  const pose=useMemo(()=>createPlayingPose(model),[model]);
  useFrame((_,delta)=>pose.update(notes,time,playing,delta,song));
  return <primitive object={model}/>;
}
