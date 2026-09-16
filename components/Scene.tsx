'use client';
import { Suspense, useLayoutEffect, useRef, type ComponentRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { cameraPose, type CameraView as View } from '@/lib/camera';
import { ContactShadows, Environment, Lightformer, Html, OrbitControls } from '@react-three/drei';
import type { Song } from '@/lib/music';
import type { FingerNote } from '@/lib/fingering';
import { seatedDepth } from '@/lib/presets';
import { Humanoid } from './RobotAsset';
import GrandPiano from './GrandPiano';
type Props={plannedNotes:FingerNote[];song:Song;time:number;playing:boolean;reset:number;view:View|null;onManualView:()=>void};
export default function Scene(props:Props) {
  return <Canvas shadows dpr={[1,1.75]} camera={{position:[5,4.4,6.3],fov:39}} gl={{antialias:true}}>
    <color attach="background" args={['#252527']}/><fog attach="fog" args={['#252527',18,40]}/>
    <ambientLight intensity={.9}/><hemisphereLight args={['#ffffff','#454545',1.2]}/>
    <directionalLight position={[1,8,4]} intensity={3.2} castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-7} shadow-camera-right={7} shadow-camera-top={7} shadow-camera-bottom={-7} shadow-bias={-.0003}/>
    <Environment resolution={128}><Lightformer position={[0,6,0]} rotation={[Math.PI/2,0,0]} scale={[10,10,1]} intensity={2}/><Lightformer position={[-5,3,0]} rotation={[0,Math.PI/2,0]} scale={[10,3,1]} intensity={3}/></Environment>
    <GrandPiano {...props}/>
    <Suspense fallback={<Html center><span className="asset-loading">Loading G1 + Wuji Hand…</span></Html>}><Humanoid notes={props.plannedNotes} time={props.time} playing={props.playing}/></Suspense>
    <group position={[0,0,seatedDepth+.04]}>
      <mesh position={[0,.412,0]} castShadow receiveShadow><boxGeometry args={[.62,.06,.34]}/><meshStandardMaterial color="#191919" roughness={.8}/></mesh>
      {[-.25,.25].flatMap(x=>[-.11,.11].map(z=><mesh key={`${x}-${z}`} position={[x,.191,z]} castShadow><boxGeometry args={[.045,.382,.045]}/><meshStandardMaterial color="#161616" metalness={.3} roughness={.3}/></mesh>))}
      <mesh position={[0,.114,-.415]} castShadow receiveShadow><boxGeometry args={[.4,.04,.24]}/><meshStandardMaterial color="#242424" roughness={.6}/></mesh>
      {[-.16,.16].map(x=><mesh key={x} position={[x,.047,-.415]} castShadow><boxGeometry args={[.035,.094,.2]}/><meshStandardMaterial color="#171717"/></mesh>)}
    </group>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.03,0]} receiveShadow><planeGeometry args={[200,200]}/><meshStandardMaterial color="#353537" roughness={.65}/></mesh>
    <ContactShadows position={[0,-.02,0]} opacity={.5} scale={16} blur={2.5} far={6} resolution={512}/>
    <CameraView reset={props.reset} view={props.view} time={props.time} onManualView={props.onManualView}/>
  </Canvas>;
}
function CameraView({reset,view,time,onManualView}:{reset:number;view:View|null;time:number;onManualView:()=>void}) {
  const {camera,size}=useThree();
  const controls=useRef<ComponentRef<typeof OrbitControls>>(null);
  const activePreset=useRef(view),interacting=useRef(false),songTime=useRef(time);
  songTime.current=time;
  const portrait=size.width<size.height;
  useLayoutEffect(()=>{
    activePreset.current=view;
    if(!view)return;
    const pose=cameraPose(view,songTime.current,portrait);
    camera.position.set(...pose.position);controls.current!.target.set(...pose.target);
    if(camera instanceof THREE.PerspectiveCamera){camera.fov=pose.fov;camera.near=.025;camera.updateProjectionMatrix();}
    controls.current!.update();
  },[camera,reset,view,portrait]);
  useFrame(()=>{
    if(activePreset.current==='motion'&&!interacting.current){
      const pose=cameraPose('motion',time,portrait);
      camera.position.set(...pose.position);controls.current!.target.set(...pose.target);controls.current!.update();
    }
  });
  return <OrbitControls ref={controls} makeDefault minDistance={.3} maxDistance={8} maxPolarAngle={Math.PI*.48} enableDamping={false}
    onStart={()=>{interacting.current=true;}}
    onChange={()=>{if(interacting.current&&activePreset.current){activePreset.current=null;onManualView();}}}
    onEnd={()=>{interacting.current=false;}}/>;
}
