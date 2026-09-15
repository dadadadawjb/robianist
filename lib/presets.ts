export type Side='left'|'right';
export type ArmRig={url:string;tip:string;joints:string[];seed:number[]};
export type RobotPreset={id:string;name:string;available?:boolean;scale:number;rig:(side:Side)=>ArmRig};
export type HandPreset={id:string;name:string;fingers:number;scale:number;url:(side:Side)=>string;tips:(side:Side)=>string[];palm:(side:Side)=>string};
const vendor='/models/vendor';
export const robots:RobotPreset[]=[
  {id:'franka',name:'Franka Emika Panda',scale:2.4,rig:()=>({url:'/models/franka/robot.urdf',tip:'panda_link8',joints:Array.from({length:7},(_,i)=>`panda_joint${i+1}`),seed:[0,-.45,0,-1.9,0,1.5,.7]})},
  {id:'ur5e',name:'Universal Robots UR5e',scale:2.4,rig:()=>({url:`${vendor}/dex/robots/arms/ur5e/ur5e_glb.urdf`,tip:'wrist_3_link',joints:['shoulder_pan_joint','shoulder_lift_joint','elbow_joint','wrist_1_joint','wrist_2_joint','wrist_3_joint'],seed:[0,-1.2,1.7,-.5,1.57,0]})},
  {id:'flexiv',name:'Flexiv Rizon 4 / 4R',scale:2.4,rig:s=>({url:`${vendor}/flexiv/resources/flexiv_Rizon${s==='left'?'4':'4R'}_kinematics.urdf`,tip:'flange',joints:Array.from({length:7},(_,i)=>`joint${i+1}`),seed:[0,-.5,0,1.5,0,.9,0]})},
  {id:'kuka',name:'KUKA LBR iiwa 7 R800',scale:2.4,rig:()=>({url:`${vendor}/dex/robots/arms/iiwa7/iiwa7_glb.urdf`,tip:'link_7',joints:Array.from({length:7},(_,i)=>`A${i+1}`),seed:[0,.5,0,-1.4,0,.8,0]})},
  {id:'tianji',name:'Tianji Marvin',available:false,scale:1,rig:()=>{throw new Error('A public Tianji Marvin visual model is not available.');}}
];
export const hands:HandPreset[]=[
  {id:'leap',name:'LEAP Hand v1',fingers:4,scale:3.2,url:s=>`${vendor}/dex/robots/hands/leap_hand/leap_hand_${s}_glb.urdf`,tips:()=>['thumb_tip_head','index_tip_head','middle_tip_head','ring_tip_head'],palm:s=>s==='left'?'palm_lower_left':'palm_lower'},
  {id:'allegro',name:'Wonik Robotics Allegro Hand',fingers:4,scale:3.2,url:s=>`${vendor}/dex/robots/hands/allegro_hand/allegro_hand_${s}_glb.urdf`,tips:()=>[15,3,7,11].map(n=>`link_${n}.0_tip`),palm:()=> 'palm'},
  {id:'shadow',name:'Shadow Dexterous Hand',fingers:5,scale:3.2,url:s=>`${vendor}/dex/robots/hands/shadow_hand/shadow_hand_${s}_glb.urdf`,tips:()=>['thtip','fftip','mftip','rftip','lftip'],palm:()=> 'palm'},
  {id:'sharpa',name:'Sharpa Wave',fingers:5,scale:3.2,url:s=>`${vendor}/sharpa/wave_01/${s}_sharpa_wave/${s}_sharpa_wave.urdf`,tips:s=>['thumb','index','middle','ring','pinky'].map(f=>`${s}_${f}_fingertip`),palm:s=>`${s}_hand_C_MC`},
  {id:'wuji',name:'Wuji Hand',fingers:5,scale:3.2,url:s=>`${vendor}/wuji/hand/body/urdf/${s}.urdf`,tips:s=>[1,2,3,4,5].map(n=>`${s}_finger${n}_tip_link`),palm:s=>`${s}_palm_link`}
];
