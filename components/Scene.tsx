'use client';
import { Suspense, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer, Html, OrbitControls } from '@react-three/drei';
import type { Song } from '@/lib/music';
import type { FingerNote } from '@/lib/fingering';
import { Humanoid } from './RobotAsset';
import GrandPiano from './GrandPiano';
type Props={plannedNotes:FingerNote[];song:Song;time:number;playing:boolean;reset:number;closeup:boolean};
export default function Scene(props:Props) {
  return <Canvas shadows dpr={[1,1.75]} camera={{position:[5,4.4,6.3],fov:39}} gl={{antialias:true}}>
    <color attach="background" args={['#252527']}/><fog attach="fog" args={['#252527',18,40]}/>
    <ambientLight intensity={.9}/><hemisphereLight args={['#ffffff','#454545',1.2]}/>
    <directionalLight position={[1,8,4]} intensity={3.2} castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-7} shadow-camera-right={7} shadow-camera-top={7} shadow-camera-bottom={-7} shadow-bias={-.0003}/>
    <Environment resolution={128}><Lightformer position={[0,6,0]} rotation={[Math.PI/2,0,0]} scale={[10,10,1]} intensity={2}/><Lightformer position={[-5,3,0]} rotation={[0,Math.PI/2,0]} scale={[10,3,1]} intensity={3}/></Environment>
    <GrandPiano {...props}/>
    <Suspense fallback={<Html center><span className="asset-loading">Loading G1 + Wuji Hand…</span></Html>}><Humanoid notes={props.plannedNotes} time={props.time} playing={props.playing}/></Suspense>
    <group position={[0,0,.5]}>
      <mesh position={[0,.412,0]} castShadow receiveShadow><boxGeometry args={[.62,.06,.34]}/><meshStandardMaterial color="#191919" roughness={.8}/></mesh>
      {[-.25,.25].flatMap(x=>[-.11,.11].map(z=><mesh key={`${x}-${z}`} position={[x,.191,z]} castShadow><boxGeometry args={[.045,.382,.045]}/><meshStandardMaterial color="#161616" metalness={.3} roughness={.3}/></mesh>))}
      <mesh position={[0,.114,-.415]} castShadow receiveShadow><boxGeometry args={[.4,.04,.24]}/><meshStandardMaterial color="#242424" roughness={.6}/></mesh>
      {[-.16,.16].map(x=><mesh key={x} position={[x,.047,-.415]} castShadow><boxGeometry args={[.035,.094,.2]}/><meshStandardMaterial color="#171717"/></mesh>)}
    </group>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.03,0]} receiveShadow><planeGeometry args={[200,200]}/><meshStandardMaterial color="#353537" roughness={.65}/></mesh>
    <ContactShadows position={[0,-.02,0]} opacity={.5} scale={16} blur={2.5} far={6} resolution={512}/>
    <CameraView reset={props.reset} closeup={props.closeup}/>
  </Canvas>;
}
function CameraView({reset,closeup}:{reset:number;closeup:boolean}) {
  const {camera,size}=useThree();
  useEffect(()=>{const d=size.width/size.height<1?1.85:1;camera.position.set(...(closeup?[.1,1.9,1.5]:[3*d,2.6*d,3.4*d]) as [number,number,number]);camera.lookAt(0,.65,closeup?0:-.75);},[camera,reset,closeup,size.width,size.height]);
  return <OrbitControls key={`${reset}-${closeup}`} makeDefault target={[0,.65,closeup?0:-.75]} minDistance={.7} maxDistance={8} maxPolarAngle={Math.PI*.48} enableDamping/>;
}

