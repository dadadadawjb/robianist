'use client';
import { useEffect, useMemo } from 'react';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { isBlack, keyX, type Note, type Song } from '@/lib/music';
import { keyboard,keyGeometry } from '@/lib/keyboard';
import { pedalAmount,pedalGeometry } from '@/lib/pedal';

const ebony='#171717',gold='#b49353';
function Block({at,size,color=ebony}:{at:[number,number,number];size:[number,number,number];color?:string}) {return <RoundedBox args={size} position={at} radius={Math.min(.009,...size.map(n=>n/4))} smoothness={3} castShadow receiveShadow><meshPhysicalMaterial color={color} roughness={.28} metalness={.12} clearcoat={.8}/></RoundedBox>;}
function Rod({a,b,r=.008,color=gold}:{a:THREE.Vector3;b:THREE.Vector3;r?:number;color?:string}){return <mesh position={a.clone().add(b).multiplyScalar(.5)} quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),b.clone().sub(a).normalize())} castShadow><cylinderGeometry args={[r,r,a.distanceTo(b),10]}/><meshStandardMaterial color={color} metalness={.65} roughness={.3}/></mesh>;}
function Rail({a,b,width=.035,height=.06,color=gold}:{a:THREE.Vector3;b:THREE.Vector3;width?:number;height?:number;color?:string}) {
  return <mesh position={a.clone().add(b).multiplyScalar(.5)} rotation={[0,Math.atan2(b.x-a.x,b.z-a.z),0]} castShadow receiveShadow><boxGeometry args={[width,height,a.distanceTo(b)]}/><meshStandardMaterial color={color} metalness={color===gold?.5:0} roughness={.45}/></mesh>;
}
// Shape coordinates are metres: +Y in the shape becomes -Z on the stage.
function contour(inset=0) {
  const s=new THREE.Shape(),left=-.70+inset,right=.70-inset;
  s.moveTo(left,.17+inset);s.lineTo(right,.17+inset);s.lineTo(right,.62);
  s.bezierCurveTo(right,1.12,.04-inset,1.16,.04-inset,1.67);
  s.bezierCurveTo(.04-inset,2.14-inset,-.30,2.27-inset,-.51,2.12-inset);
  s.bezierCurveTo(left,2.02-inset,left,1.85,left,1.65);s.closePath();return s;
}
function Slab({shape,y,depth,color}:{shape:THREE.Shape;y:number;depth:number;color:string}){return <mesh position={[0,y,0]} rotation={[-Math.PI/2,0,0]} castShadow receiveShadow><extrudeGeometry args={[shape,{depth,bevelEnabled:false,curveSegments:48}]}/><meshPhysicalMaterial color={color} roughness={color===ebony?.23:.48} metalness={color===gold?.5:.05} clearcoat={color===ebony?1:0}/></mesh>;}
export default function GrandPiano({plannedNotes,time,playing,song}:{plannedNotes:Note[];time:number;playing:boolean;song:Song}) {
  const {outline,inner,rim}=useMemo(()=>{const outline=contour(),inner=contour(.045),rim=contour();rim.holes.push(new THREE.Path(inner.getPoints(48)));return {outline,inner,rim};},[]);
  const label=useMemo(()=>{const c=document.createElement('canvas');c.width=768;c.height=192;const ctx=c.getContext('2d')!;ctx.fillStyle='#c9a568';ctx.textAlign='center';ctx.font='38px Georgia';ctx.fillText('STEINWAY STYLE',384,85);ctx.font='20px Georgia';ctx.fillText('C O N C E R T   G R A N D',384,132);return new THREE.CanvasTexture(c);},[]);
  useEffect(()=>()=>label.dispose(),[label]);
  const strings=useMemo(()=>Array.from({length:44},(_,i)=>{
    const t=i/43,x=-.58+t*1.14;
    return {x,endX:x+.025,endZ:-(.48+1.45*(1-t)**1.7)};
  }),[]);
  const lidAngle=.38,lidSupport=new THREE.Vector3(-.70+1.20*Math.cos(lidAngle),.83+1.20*Math.sin(lidAngle),-.76);
  return <group>
    <Slab shape={outline} y={.565} depth={.045} color={ebony}/>
    <Slab shape={rim} y={.60} depth={.225} color={ebony}/>
    <Slab shape={inner} y={.61} depth={.035} color="#a97940"/>
    {/* The frame, bridges and string endpoints sit on the soundboard. */}
    <Block at={[-.615,.68,-1.12]} size={[.05,.07,1.76]} color={gold}/>
    <Block at={[0,.68,-.29]} size={[1.29,.07,.14]} color={gold}/>
    {/* String courses remain nearly parallel; the bridge follows their graduated lengths. */}
    {[0,12,25,43].map(i=>{const string=strings[i];return <Rail key={i} a={new THREE.Vector3(string.x,.675,-.33)} b={new THREE.Vector3(string.endX,.675,string.endZ-.045)} width={.025}/>;})}
    {strings.slice(0,-1).map((string,i)=>{
      const next=strings[i+1];
      return <group key={i}>
        <Rail a={new THREE.Vector3(string.endX,.681,string.endZ)} b={new THREE.Vector3(next.endX,.681,next.endZ)} width={.028} height={.072} color="#76502e"/>
        <Rail a={new THREE.Vector3(string.endX,.68,string.endZ-.055)} b={new THREE.Vector3(next.endX,.68,next.endZ-.055)} width={.045} height={.07}/>
      </group>;
    })}
    {strings.map(({x,endX,endZ},i)=><group key={i}>
      {[0,.004].map(offset=><group key={offset}>
        <Rod a={new THREE.Vector3(x+offset,.721,-.29)} b={new THREE.Vector3(endX+offset,.721,endZ-.055)} r={.0008} color={i<14?'#b77d45':'#ddd1ad'}/>
        <Rod a={new THREE.Vector3(x+offset,.708,-.29)} b={new THREE.Vector3(x+offset,.725,-.29)} r={.0025} color="#a4a09a"/>
        <Rod a={new THREE.Vector3(endX+offset,.708,endZ-.055)} b={new THREE.Vector3(endX+offset,.725,endZ-.055)} r={.0025} color="#a4a09a"/>
      </group>)}
    </group>)}
    <group position={[-.70,.83,0]} rotation={[0,0,lidAngle]}><group position={[.70,0,0]}><Slab shape={outline} y={0} depth={.025} color={ebony}/></group></group>
    <Block at={[.57,.785,-.76]} size={[.18,.06,.09]}/>
    <Block at={[.52,.713,-.76]} size={[.045,.136,.07]} color={gold}/>
    <Rod a={new THREE.Vector3(.52,.80,-.76)} b={lidSupport} r={.012} color="#282722"/>
    {[-.42,-1.5].map(z=><Rod key={z} a={new THREE.Vector3(-.70,.83,z)} b={new THREE.Vector3(-.70,.83,z-.10)} r={.012}/>)}
    {/* A continuous keybed and close-fitting cheeks enclose the keyboard. */}
    <Block at={[0,.673,-.065]} size={[1.40,.052,.28]}/>
    <Block at={[0,.693,.062]} size={[1.40,.035,.025]}/>
    <Block at={[0,.784,-.166]} size={[1.40,.082,.065]}/>
    {[-.675,.675].map(x=><Block key={x} at={[x,.722,-.041]} size={[.05,.075,.23]}/>)}
    <mesh position={[0,.786,-.1325]}><planeGeometry args={[.25,.0625]}/><meshBasicMaterial map={label} transparent/></mesh>
    {[[-.60,-.29],[.60,-.29],[-.40,-1.94]].map(([x,z])=><group key={x}>
      <mesh position={[x,.315,z]} castShadow><cylinderGeometry args={[.045,.029,.52,8]}/><meshPhysicalMaterial color={ebony} clearcoat={1} roughness={.22}/></mesh>
      <mesh position={[x,.045,z]} rotation={[0,0,Math.PI/2]} castShadow><cylinderGeometry args={[.035,.035,.035,16]}/><meshStandardMaterial color={gold} metalness={.75} roughness={.28}/></mesh>
    </group>)}
    <group position={[0,0,-.10]}>
    <Block at={[0,.555,-.29]} size={[.32,.04,.15]}/>
    {[-.105,.105].map(x=><Block key={x} at={[x,.36,-.29]} size={[.035,.38,.055]}/>)}
    <Block at={[0,.172,-.23]} size={[.29,.045,.17]}/>
    {[-.085,0,.085].map(x=><group key={x}>
      <Rod a={new THREE.Vector3(x,.19,-.25)} b={new THREE.Vector3(x,.56,-.25)} r={.004}/>
      <group position={[x,pedalGeometry.pivotY,pedalGeometry.pivotZ+.10]} rotation={[x===pedalGeometry.x?pedalAmount(song.pedals,time)*pedalGeometry.travel:0,0,0]}>
        <Block at={[0,0,pedalGeometry.length/2]} size={[.042,.018,pedalGeometry.length]} color={gold}/>
      </group>
    </group>)}
    </group>
    {Array.from({length:88},(_,i)=>i+21).map(midi=>{
      const black=isBlack(midi),active=playing&&plannedNotes.some(n=>n.midi===midi&&time>=n.start&&time<n.start+n.duration),key=keyGeometry(midi,active);
      return <group key={midi} position={[keyX(midi),keyboard.pivotY,keyboard.rearZ]} rotation={[key.angle,0,0]}><mesh position={[0,key.offsetY,key.length/2]} castShadow receiveShadow><boxGeometry args={[key.width,key.height,key.length]}/><meshStandardMaterial color={active?(black?'#333333':'#d6d6d6'):black?'#141414':'#f5f3ed'} roughness={.25}/></mesh></group>;
    })}
  </group>;
}
