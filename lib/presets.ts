// Official source assets are provided for the MVP; other presets are stylized.
export type ModelAsset = { format: 'procedural' } | { format: 'glb' | 'urdf'; url: string; scale: number };
export type RobotPreset = { id: string; name: string; color: string; joint: string; upper: number; lower: number; asset: ModelAsset };
export type HandPreset = { id: string; name: string; fingers: number; color: string; asset: ModelAsset };
export const robots: RobotPreset[] = [
  { id:'franka', name:'Franka', color:'#f3f2ed', joint:'#343c3d', upper:1.35, lower:1.35, asset:{format:'urdf',url:'/models/franka/robot.urdf',scale:2.4} },
  { id:'ur5', name:'UR5', color:'#bfcbd0', joint:'#6aa5b8', upper:1.45, lower:1.25, asset:{format:'procedural'} },
  { id:'flexiv', name:'Flexiv', color:'#f1f2f4', joint:'#717b85', upper:1.4, lower:1.3, asset:{format:'procedural'} },
  { id:'tianji', name:'天机', color:'#c6d0db', joint:'#334b65', upper:1.3, lower:1.4, asset:{format:'procedural'} }
];
export const hands: HandPreset[] = [
  { id:'leap', name:'LEAP Hand', fingers:4, color:'#babdc2', asset:{format:'urdf',url:'/models/leap/robot.urdf',scale:2.5} },
  { id:'sharpa', name:'Sharpa', fingers:5, color:'#dddcd5', asset:{format:'procedural'} },
  { id:'wuji', name:'Wuji', fingers:5, color:'#78858b', asset:{format:'procedural'} }
];
