'use client';
import { Suspense, useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Html, OrbitControls, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { keyX, type Song } from '@/lib/music';
import type { RobotPreset, HandPreset } from '@/lib/presets';
import { ImportedArm, ImportedHand } from './RobotAsset';
import GrandPiano from './GrandPiano';
type Props = { song: Song; time: number; playing: boolean; robot: RobotPreset; hand: HandPreset; reset: number; lightweight: boolean; closeup:boolean };
function Box({ position, size, color, radius = .04 }: {position: [number,number,number]; size:[number,number,number]; color:string; radius?:number}) { return <RoundedBox position={position} args={size} radius={radius} smoothness={3} castShadow receiveShadow><meshStandardMaterial color={color} roughness={.36} metalness={.25}/></RoundedBox>; }
function Link({ from, to, color, width=.14, lightweight }: {from:THREE.Vector3;to:THREE.Vector3;color:string;width?:number;lightweight:boolean}) { const mesh=useRef<THREE.Mesh>(null);useFrame(()=>{if(!mesh.current)return;mesh.current.position.copy(from).add(to).multiplyScalar(.5);mesh.current.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),to.clone().sub(from).normalize());mesh.current.scale.y=from.distanceTo(to);});return <mesh ref={mesh} castShadow><cylinderGeometry args={[width*.85,width,1,lightweight?10:24]}/><meshStandardMaterial color={color} metalness={.3} roughness={.3}/></mesh>; }
function Joint({position,radius,color,lightweight}:{position:THREE.Vector3;radius:number;color:string;lightweight:boolean}) {const mesh=useRef<THREE.Mesh>(null);useFrame(()=>mesh.current?.position.copy(position));return <mesh ref={mesh} castShadow><sphereGeometry args={[radius,lightweight?12:24,lightweight?8:20]}/><meshStandardMaterial color={color} metalness={.5} roughness={.28}/></mesh>;}
function Arm({ side, ...props }: Props & {side:'left'|'right'}) {
  const {song,time,playing,robot,hand,lightweight} = props;
  const own = song.notes.filter(n => n.hand === side);
  const current = own.find(n => time >= n.start && time < n.start+n.duration);
  const previous = [...own].reverse().find(n => n.start <= time);
  const next = own.find(n => n.start > time);
  const target = current ?? next ?? previous ?? own[0];
  let x = keyX(target.midi);
  if(!current && previous && next) { const t = THREE.MathUtils.clamp((time-previous.start-previous.duration) / Math.max(.001,next.start-previous.start-previous.duration),0,1); const smooth = t*t*(3-2*t); x = THREE.MathUtils.lerp(keyX(previous.midi),keyX(next.midi),smooth); }
  const pressed = !!current && playing;
  const finger = target.midi % hand.fingers;
  const fingerOffset = (finger-(hand.fingers-1)/2)*.105;
  const wrist = new THREE.Vector3(x-fingerOffset,pressed ? 1.46 : 1.57,.42);
  const base = new THREE.Vector3(side==='left' ? -1.55 : 1.55,.43,1.35);
  const shoulder = base.clone().add(new THREE.Vector3(0,.42,0));
  const direction = wrist.clone().sub(shoulder); const distance=direction.length(); const axis=direction.clone().normalize();
  const along=(robot.upper**2-robot.lower**2+distance**2)/(2*distance);
  const height=Math.sqrt(Math.max(0,robot.upper**2-along**2));
  const bend=new THREE.Vector3(0,1,0).addScaledVector(axis,-axis.y).normalize();
  const elbow=shoulder.clone().addScaledVector(axis,along).addScaledVector(bend,height);
  return <group>
    <Box position={[base.x,.26,base.z]} size={[.66,.18,.62]} color="#303638"/>
    {!lightweight && robot.asset.format==='urdf' ? <Suspense fallback={<Html center><span className="asset-loading">Franka 加载中…</span></Html>}><ImportedArm url={robot.asset.url} base={base} target={wrist} scale={robot.asset.scale}/></Suspense> : <>
    <Link from={base} to={shoulder} color={robot.color} width={.24} lightweight={lightweight}/>
    <Link from={shoulder} to={elbow} color={robot.color} width={.18} lightweight={lightweight}/>
    <Link from={elbow} to={wrist} color={robot.color} width={.145} lightweight={lightweight}/>
    {[shoulder,elbow,wrist].map((p,i) => <Joint key={i} position={p} radius={i===2?.15:.215} color={robot.joint} lightweight={lightweight}/>)}
    </>}
    {!lightweight && hand.asset.format==='urdf' ? <Suspense fallback={<Html center><span className="asset-loading">LEAP 加载中…</span></Html>}><ImportedHand url={hand.asset.url} position={wrist} pressed={pressed} finger={finger} noteX={x} scale={hand.asset.scale}/></Suspense> :
    <group position={wrist}>
      <Box position={[0,-.03,-.16]} size={[hand.fingers*.115,.15,.3]} color={hand.color}/>
      {Array.from({length:hand.fingers},(_,i) => <group key={i} position={[(i-(hand.fingers-1)/2)*.105,-.05,-.29]} rotation={[pressed && i===finger ? -.2 : .15,0,0]}>
        <Box position={[0,-.005,-.075]} size={[.075,.075,.17]} color={hand.color} radius={.018}/>
        <mesh position={[0,-.005,-.15]}><sphereGeometry args={[.042,12,12]}/><meshStandardMaterial color="#40474a"/></mesh>
        <group position={[0,0,-.15]} rotation={[-.55,0,0]}><Box position={[0,-.01,-.07]} size={[.067,.07,.15]} color={hand.color} radius={.016}/><Box position={[0,-.018,-.14]} size={[.062,.05,.07]} color="#343a3d" radius={.014}/></group>
      </group>)}
      <mesh position={[0,.054,-.14]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[.13,.08]}/><meshBasicMaterial color="#d5f891"/></mesh>
    </group>}
  </group>;
}
export default function Scene(props: Props) {
  return <Canvas shadows={!props.lightweight} dpr={props.lightweight?1:[1,1.75]} camera={{position:[5,4.4,6.3],fov:39}} gl={{antialias:true}}>
    <color attach="background" args={['#e9ece6']}/><fog attach="fog" args={['#e9ece6',16,30]}/>
    <ambientLight intensity={1.6}/><hemisphereLight args={['#ffffff','#bcc3ac',1.5]}/>
    <directionalLight position={[1,8,4]} intensity={3.2} castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={6} shadow-camera-bottom={-6} shadow-bias={-.0003}/>
    <group><GrandPiano {...props}/><Arm {...props} side="left"/><Arm {...props} side="right"/></group>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.03,0]} receiveShadow><planeGeometry args={[200,200]}/><meshStandardMaterial color="#e9ece6" roughness={1}/></mesh>
    <gridHelper args={[30,60,'#cdd3c8','#dde1d8']} position={[0,-.025,0]}/>
    {!props.lightweight && <ContactShadows position={[0,-.02,0]} opacity={.3} scale={14} blur={2.5} far={5} resolution={512}/>}
    <CameraView reset={props.reset} closeup={props.closeup}/>
  </Canvas>;
}
function CameraView({reset,closeup}:{reset:number;closeup:boolean}) {
  const {camera,size}=useThree();
  useEffect(()=>{const distance=size.width/size.height<1?1.35:1;camera.position.set(...(closeup?[.4,4.3,3.8]:[6*distance,5.7*distance,7*distance]) as [number,number,number]);camera.lookAt(0,1,closeup?-.3:-1.4);},[camera,reset,closeup,size.width,size.height]);
  return <OrbitControls key={`${reset}-${closeup}`} makeDefault target={[0,1,closeup?-.3:-1.4]} minDistance={2.3} maxDistance={18} maxPolarAngle={Math.PI*.48} enableDamping/>;
}



