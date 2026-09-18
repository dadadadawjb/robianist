'use client';
import { useEffect, useMemo } from 'react';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { isBlack, keyX, type Note, type Song } from '@/lib/music';
import { keyboard, keyGeometry } from '@/lib/keyboard';
import { pedalAmount, pedalGeometry } from '@/lib/pedal';

const ebony = '#171717',
  gold = '#b49353';
function Block({
  at,
  size,
  color = ebony,
}: {
  at: [number, number, number];
  size: [number, number, number];
  color?: string;
}) {
  return (
    <RoundedBox
      args={size}
      position={at}
      radius={Math.min(0.009, ...size.map((n) => n / 4))}
      smoothness={3}
      castShadow
      receiveShadow
    >
      <meshPhysicalMaterial color={color} roughness={0.28} metalness={0.12} clearcoat={0.8} />
    </RoundedBox>
  );
}
function Rod({
  a,
  b,
  r = 0.008,
  color = gold,
}: {
  a: THREE.Vector3;
  b: THREE.Vector3;
  r?: number;
  color?: string;
}) {
  return (
    <mesh
      position={a.clone().add(b).multiplyScalar(0.5)}
      quaternion={new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        b.clone().sub(a).normalize(),
      )}
      castShadow
    >
      <cylinderGeometry args={[r, r, a.distanceTo(b), 10]} />
      <meshStandardMaterial color={color} metalness={0.65} roughness={0.3} />
    </mesh>
  );
}
function Rail({
  a,
  b,
  width = 0.035,
  height = 0.06,
  color = gold,
}: {
  a: THREE.Vector3;
  b: THREE.Vector3;
  width?: number;
  height?: number;
  color?: string;
}) {
  return (
    <mesh
      position={a.clone().add(b).multiplyScalar(0.5)}
      rotation={[0, Math.atan2(b.x - a.x, b.z - a.z), 0]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[width, height, a.distanceTo(b)]} />
      <meshStandardMaterial color={color} metalness={color === gold ? 0.5 : 0} roughness={0.45} />
    </mesh>
  );
}
// Shape coordinates are metres: +Y in the shape becomes -Z on the stage.
function contour(inset = 0) {
  const s = new THREE.Shape(),
    left = -0.7 + inset,
    right = 0.7 - inset;
  s.moveTo(left, 0.17 + inset);
  s.lineTo(right, 0.17 + inset);
  s.lineTo(right, 0.62);
  s.bezierCurveTo(right, 1.12, 0.04 - inset, 1.16, 0.04 - inset, 1.67);
  s.bezierCurveTo(0.04 - inset, 2.14 - inset, -0.3, 2.27 - inset, -0.51, 2.12 - inset);
  s.bezierCurveTo(left, 2.02 - inset, left, 1.85, left, 1.65);
  s.closePath();
  return s;
}
function Slab({
  shape,
  y,
  depth,
  color,
}: {
  shape: THREE.Shape;
  y: number;
  depth: number;
  color: string;
}) {
  return (
    <mesh position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
      <extrudeGeometry args={[shape, { depth, bevelEnabled: false, curveSegments: 48 }]} />
      <meshPhysicalMaterial
        color={color}
        roughness={color === ebony ? 0.23 : 0.48}
        metalness={color === gold ? 0.5 : 0.05}
        clearcoat={color === ebony ? 1 : 0}
      />
    </mesh>
  );
}
export default function GrandPiano({
  plannedNotes,
  time,
  playing,
  song,
}: {
  plannedNotes: Note[];
  time: number;
  playing: boolean;
  song: Song;
}) {
  const { outline, inner, rim } = useMemo(() => {
    const outline = contour(),
      inner = contour(0.045),
      rim = contour();
    rim.holes.push(new THREE.Path(inner.getPoints(48)));
    return { outline, inner, rim };
  }, []);
  const label = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 768;
    c.height = 192;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#c9a568';
    ctx.textAlign = 'center';
    ctx.font = '38px Georgia';
    ctx.fillText('STEINWAY STYLE', 384, 85);
    ctx.font = '20px Georgia';
    ctx.fillText('C O N C E R T   G R A N D', 384, 132);
    return new THREE.CanvasTexture(c);
  }, []);
  useEffect(() => () => label.dispose(), [label]);
  const strings = useMemo(
    () =>
      Array.from({ length: 44 }, (_, i) => {
        const t = i / 43,
          x = -0.58 + t * 1.14;
        return { x, endX: x + 0.025, endZ: -(0.48 + 1.45 * (1 - t) ** 1.7) };
      }),
    [],
  );
  const lidAngle = 0.38,
    lidSupport = new THREE.Vector3(
      -0.7 + 1.2 * Math.cos(lidAngle),
      0.83 + 1.2 * Math.sin(lidAngle),
      -0.76,
    );
  return (
    <group>
      <Slab shape={outline} y={0.565} depth={0.045} color={ebony} />
      <Slab shape={rim} y={0.6} depth={0.225} color={ebony} />
      <Slab shape={inner} y={0.61} depth={0.035} color="#a97940" />
      {/* The frame, bridges and string endpoints sit on the soundboard. */}
      <Block at={[-0.615, 0.68, -1.12]} size={[0.05, 0.07, 1.76]} color={gold} />
      <Block at={[0, 0.68, -0.29]} size={[1.29, 0.07, 0.14]} color={gold} />
      {/* String courses remain nearly parallel; the bridge follows their graduated lengths. */}
      {[0, 12, 25, 43].map((i) => {
        const string = strings[i];
        return (
          <Rail
            key={i}
            a={new THREE.Vector3(string.x, 0.675, -0.33)}
            b={new THREE.Vector3(string.endX, 0.675, string.endZ - 0.045)}
            width={0.025}
          />
        );
      })}
      {strings.slice(0, -1).map((string, i) => {
        const next = strings[i + 1];
        return (
          <group key={i}>
            <Rail
              a={new THREE.Vector3(string.endX, 0.681, string.endZ)}
              b={new THREE.Vector3(next.endX, 0.681, next.endZ)}
              width={0.028}
              height={0.072}
              color="#76502e"
            />
            <Rail
              a={new THREE.Vector3(string.endX, 0.68, string.endZ - 0.055)}
              b={new THREE.Vector3(next.endX, 0.68, next.endZ - 0.055)}
              width={0.045}
              height={0.07}
            />
          </group>
        );
      })}
      {strings.map(({ x, endX, endZ }, i) => (
        <group key={i}>
          {[0, 0.004].map((offset) => (
            <group key={offset}>
              <Rod
                a={new THREE.Vector3(x + offset, 0.721, -0.29)}
                b={new THREE.Vector3(endX + offset, 0.721, endZ - 0.055)}
                r={0.0008}
                color={i < 14 ? '#b77d45' : '#ddd1ad'}
              />
              <Rod
                a={new THREE.Vector3(x + offset, 0.708, -0.29)}
                b={new THREE.Vector3(x + offset, 0.725, -0.29)}
                r={0.0025}
                color="#a4a09a"
              />
              <Rod
                a={new THREE.Vector3(endX + offset, 0.708, endZ - 0.055)}
                b={new THREE.Vector3(endX + offset, 0.725, endZ - 0.055)}
                r={0.0025}
                color="#a4a09a"
              />
            </group>
          ))}
        </group>
      ))}
      <group position={[-0.7, 0.83, 0]} rotation={[0, 0, lidAngle]}>
        <group position={[0.7, 0, 0]}>
          <Slab shape={outline} y={0} depth={0.025} color={ebony} />
        </group>
      </group>
      <Block at={[0.57, 0.785, -0.76]} size={[0.18, 0.06, 0.09]} />
      <Block at={[0.52, 0.713, -0.76]} size={[0.045, 0.136, 0.07]} color={gold} />
      <Rod a={new THREE.Vector3(0.52, 0.8, -0.76)} b={lidSupport} r={0.012} color="#282722" />
      {[-0.42, -1.5].map((z) => (
        <Rod
          key={z}
          a={new THREE.Vector3(-0.7, 0.83, z)}
          b={new THREE.Vector3(-0.7, 0.83, z - 0.1)}
          r={0.012}
        />
      ))}
      {/* A continuous keybed and close-fitting cheeks enclose the keyboard. */}
      <Block at={[0, 0.673, -0.065]} size={[1.4, 0.052, 0.28]} />
      <Block at={[0, 0.693, 0.062]} size={[1.4, 0.035, 0.025]} />
      <Block at={[0, 0.784, -0.166]} size={[1.4, 0.082, 0.065]} />
      {[-0.675, 0.675].map((x) => (
        <Block key={x} at={[x, 0.722, -0.041]} size={[0.05, 0.075, 0.23]} />
      ))}
      <mesh position={[0, 0.786, -0.1325]}>
        <planeGeometry args={[0.25, 0.0625]} />
        <meshBasicMaterial map={label} transparent />
      </mesh>
      {[
        [-0.6, -0.29],
        [0.6, -0.29],
        [-0.4, -1.94],
      ].map(([x, z]) => (
        <group key={x}>
          <mesh position={[x, 0.315, z]} castShadow>
            <cylinderGeometry args={[0.045, 0.029, 0.52, 8]} />
            <meshPhysicalMaterial color={ebony} clearcoat={1} roughness={0.22} />
          </mesh>
          <mesh position={[x, 0.045, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.035, 0.035, 0.035, 16]} />
            <meshStandardMaterial color={gold} metalness={0.75} roughness={0.28} />
          </mesh>
        </group>
      ))}
      <group position={[0, 0, -0.1]}>
        <Block at={[0, 0.555, -0.29]} size={[0.32, 0.04, 0.15]} />
        {[-0.105, 0.105].map((x) => (
          <Block key={x} at={[x, 0.36, -0.29]} size={[0.035, 0.38, 0.055]} />
        ))}
        <Block at={[0, 0.172, -0.23]} size={[0.29, 0.045, 0.17]} />
        {[-0.085, 0, 0.085].map((x) => (
          <group key={x}>
            <Rod
              a={new THREE.Vector3(x, 0.19, -0.25)}
              b={new THREE.Vector3(x, 0.56, -0.25)}
              r={0.004}
            />
            <group
              position={[x, pedalGeometry.pivotY, pedalGeometry.pivotZ + 0.1]}
              rotation={[
                x === pedalGeometry.x ? pedalAmount(song.pedals, time) * pedalGeometry.travel : 0,
                0,
                0,
              ]}
            >
              <Block
                at={[0, 0, pedalGeometry.length / 2]}
                size={[0.042, 0.018, pedalGeometry.length]}
                color={gold}
              />
            </group>
          </group>
        ))}
      </group>
      {Array.from({ length: 88 }, (_, i) => i + 21).map((midi) => {
        const black = isBlack(midi),
          active =
            playing &&
            plannedNotes.some(
              (n) => n.midi === midi && time >= n.start && time < n.start + n.duration,
            ),
          key = keyGeometry(midi, active);
        return (
          <group
            key={midi}
            position={[keyX(midi), keyboard.pivotY, keyboard.rearZ]}
            rotation={[key.angle, 0, 0]}
          >
            <mesh position={[0, key.offsetY, key.length / 2]} castShadow receiveShadow>
              <boxGeometry args={[key.width, key.height, key.length]} />
              <meshStandardMaterial
                color={active ? (black ? '#333333' : '#d6d6d6') : black ? '#141414' : '#f5f3ed'}
                roughness={0.25}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
