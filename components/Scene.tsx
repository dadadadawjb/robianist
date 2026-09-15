'use client';
import { Suspense, useEffect, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer, Html, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { Song } from '@/lib/music';
import type { FingerNote } from '@/lib/fingering';
import type { RobotPreset,HandPreset,Side } from '@/lib/presets';
import { ImportedArm,ImportedHand } from './RobotAsset';
import GrandPiano from './GrandPiano';
type Props={plannedNotes:FingerNote[];song:Song;time:number;playing:boolean;robot:RobotPreset;hand:HandPreset;reset:number;closeup:boolean};
function Performer({side,...props}:Props & {side:Side}) {
  const wrist=useMemo(()=>new THREE.Vector3(side==='left'?-.8:.8,1.5,.4),[side]);
  const base=useMemo(()=>new THREE.Vector3(side==='left'?-1.55:1.55,.25,1.35),[side]);
  const rig=useMemo(()=>props.robot.rig(side),[props.robot,side]);
  const notes=useMemo(()=>props.plannedNotes.filter(n=>n.hand===side),[props.plannedNotes,side]);
  return <Suspense fallback={<Html center><span className="asset-loading">Loading instruments…</span></Html>}>
    <ImportedHand key={`${props.hand.id}-${side}`} preset={props.hand} side={side} wrist={wrist} notes={notes} time={props.time} playing={props.playing}/>
    <ImportedArm rig={rig} base={base} target={wrist} scale={props.robot.scale}/>
    <mesh position={[base.x,.14,base.z]} receiveShadow><cylinderGeometry args={[.33,.38,.25,32]}/><meshStandardMaterial color="#151515" metalness={.6} roughness={.3}/></mesh>
  </Suspense>;
}
export default function Scene(props:Props) {
  return <Canvas shadows dpr={[1,1.75]} camera={{position:[5,4.4,6.3],fov:39}} gl={{antialias:true}}>
    <color attach="background" args={['#252527']}/><fog attach="fog" args={['#252527',18,40]}/>
    <ambientLight intensity={.9}/><hemisphereLight args={['#ffffff','#454545',1.2]}/>
    <directionalLight position={[1,8,4]} intensity={3.2} castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-7} shadow-camera-right={7} shadow-camera-top={7} shadow-camera-bottom={-7} shadow-bias={-.0003}/>
    <Environment resolution={128}><Lightformer position={[0,6,0]} rotation={[Math.PI/2,0,0]} scale={[10,10,1]} intensity={2}/><Lightformer position={[-5,3,0]} rotation={[0,Math.PI/2,0]} scale={[10,3,1]} intensity={3}/></Environment>
    <GrandPiano {...props}/><Performer {...props} side="left"/><Performer {...props} side="right"/>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.03,0]} receiveShadow><planeGeometry args={[200,200]}/><meshStandardMaterial color="#353537" roughness={.65}/></mesh>
    <ContactShadows position={[0,-.02,0]} opacity={.5} scale={16} blur={2.5} far={6} resolution={512}/>
    <CameraView reset={props.reset} closeup={props.closeup}/>
  </Canvas>;
}
function CameraView({reset,closeup}:{reset:number;closeup:boolean}) {
  const {camera,size}=useThree();
  useEffect(()=>{const d=size.width/size.height<1?1.85:1;camera.position.set(...(closeup?[.4,4.3,3.8]:[6*d,5.7*d,7*d]) as [number,number,number]);camera.lookAt(0,1,closeup?-.3:-1.4);},[camera,reset,closeup,size.width,size.height]);
  return <OrbitControls key={`${reset}-${closeup}`} makeDefault target={[0,1,closeup?-.3:-1.4]} minDistance={2.3} maxDistance={18} maxPolarAngle={Math.PI*.48} enableDamping/>;
}

