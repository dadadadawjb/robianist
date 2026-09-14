'use client';
import { useMemo } from 'react';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { isBlack, keyX, type Song } from '@/lib/music';

const ebony='#171a19';
function Block({at,size,color=ebony}:{at:[number,number,number];size:[number,number,number];color?:string}) {return <RoundedBox args={size} position={at} radius={.025} smoothness={3} castShadow receiveShadow><meshPhysicalMaterial color={color} roughness={.22} metalness={.18} clearcoat={1}/></RoundedBox>;}
function Rod({a,b,r=.018,color='#ba9453'}:{a:THREE.Vector3;b:THREE.Vector3;r?:number;color?:string}){return <mesh position={a.clone().add(b).multiplyScalar(.5)} quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),b.clone().sub(a).normalize())} castShadow><cylinderGeometry args={[r,r,a.distanceTo(b),10]}/><meshStandardMaterial color={color} metalness={.65} roughness={.3}/></mesh>;}
export default function GrandPiano({song,time,playing,lightweight}:{song:Song;time:number;playing:boolean;lightweight:boolean}) {
  const outline=useMemo(()=>{const s=new THREE.Shape();s.moveTo(-2.8,.85);s.lineTo(2.8,.85);s.lineTo(2.8,1.75);s.bezierCurveTo(2.7,2.55,.6,2.3,.6,3.75);s.bezierCurveTo(.6,5.35,-.55,5.8,-1.6,5.65);s.bezierCurveTo(-2.45,5.55,-2.8,5.15,-2.8,4.6);s.closePath();return s;},[]);
  const label=useMemo(()=>{const c=document.createElement('canvas');c.width=512;c.height=100;const ctx=c.getContext('2d')!;ctx.fillStyle='#c9a568';ctx.textAlign='center';ctx.font='25px Georgia';ctx.fillText('CONCERT GRAND',256,52);ctx.font='14px Georgia';ctx.fillText('S T E I N W A Y   S T Y L E',256,80);return new THREE.CanvasTexture(c);},[]);
  return <group>
    <mesh position={[0,.96,0]} rotation={[-Math.PI/2,0,0]} castShadow receiveShadow><extrudeGeometry args={[outline,{depth:.4,bevelEnabled:true,bevelSize:.035,bevelThickness:.03,bevelSegments:2,steps:1,curveSegments:lightweight?12:32}]}/><meshPhysicalMaterial color={ebony} roughness={.2} clearcoat={1}/></mesh>
    <mesh position={[0,1.435,-.1]} rotation={[-Math.PI/2,0,0]} scale={[.95,.96,1]} receiveShadow><shapeGeometry args={[outline,24]}/><meshStandardMaterial color="#c6a15f" roughness={.4} metalness={.45} side={THREE.DoubleSide}/></mesh>
    {!lightweight && Array.from({length:44},(_,i)=>{const x=-2.45+i*.11;const length=x<-.5?4.15:Math.max(.7,3.1-(x+.5)*.9);return <Rod key={i} a={new THREE.Vector3(x,1.46,-1.12)} b={new THREE.Vector3(x-.15,1.46,-1.12-length)} r={.004} color="#e4ce9b"/>;})}
    {[-1.85,-.55,.75].map((x,i)=><Rod key={x} a={new THREE.Vector3(x,1.48,-1.25)} b={new THREE.Vector3(x-.22,1.48,-(4.9-i*.9))} r={.045}/>)}
    <group position={[-2.8,1.48,0]} rotation={[0,0,.34]}><mesh position={[2.8,0,0]} rotation={[-Math.PI/2,0,0]} castShadow><extrudeGeometry args={[outline,{depth:.075,bevelEnabled:true,bevelSize:.025,bevelThickness:.02,bevelSegments:2,curveSegments:24}]}/><meshPhysicalMaterial color="#121614" roughness={.16} metalness={.15} clearcoat={1} side={THREE.DoubleSide}/></mesh></group>
    <Rod a={new THREE.Vector3(1.4,1.43,-2.1)} b={new THREE.Vector3(1.2,2.94,-2.1)} r={.035} color="#282722"/>
    <Block at={[0,1.03,-.4]} size={[5.65,.22,1.22]}/>
    <Block at={[0,1.45,-.95]} size={[5.58,.42,.15]}/>
    <mesh position={[0,1.47,-.867]}><planeGeometry args={[1.5,.293]}/><meshBasicMaterial map={label} transparent/></mesh>
    <Block at={[0,1.075,.16]} size={[5.72,.09,.13]}/>
    {[-2.73,2.73].map(x=><Block key={x} at={[x,1.23,-.37]} size={[.2,.3,1.17]}/>)}
    {Array.from({length:88},(_,i)=>i+21).map(midi=>{const black=isBlack(midi);const active=playing&&song.notes.some(n=>n.midi===midi&&time>=n.start&&time<n.start+n.duration);return <group key={midi} position={[keyX(midi),1.2,-.82]} rotation={[active?-.035:0,0,0]}><mesh position={[0,black?.1:0,black?.22:.42]} castShadow receiveShadow><boxGeometry args={[black?.057:.098,black?.12:.11,black?.48:.88]}/><meshStandardMaterial color={active?'#d6e8a2':black?'#141718':'#f5f1e6'} roughness={.25}/></mesh></group>;})}
    {[[-2.48,-.5],[2.48,-.5],[-1.65,-4.8]].map(([x,z])=><group key={x}>
      <mesh position={[x,.52,z]} castShadow><cylinderGeometry args={[.14,.085,.94,8]}/><meshPhysicalMaterial color={ebony} clearcoat={1} roughness={.22}/></mesh>
      <mesh position={[x,.085,z]} rotation={[Math.PI/2,0,0]} castShadow><cylinderGeometry args={[.085,.085,.13,16]}/><meshStandardMaterial color="#ab874d" metalness={.75} roughness={.28}/></mesh>
    </group>)}
    <Block at={[0,.48,-.65]} size={[.55,.72,.1]}/><Block at={[0,.16,-.52]} size={[.65,.11,.45]}/>
    {[-.2,0,.2].map(x=><Block key={x} at={[x,.13,-.22]} size={[.12,.055,.36]} color="#bc9756"/>)}
  </group>;
}

