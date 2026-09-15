import * as THREE from 'three';
import { CCDIKSolver } from 'three/examples/jsm/animation/CCDIKSolver.js';
import type { URDFRobot } from 'urdf-loader';

// Represent each URDF axis as a local Z motion between two fixed basis transforms.
export function createChainIK(model:URDFRobot,end:string,names:string[],initial:number[]=[]) {
  const endpoint=model.links[end];
  if(!endpoint)throw new Error(`Missing IK endpoint: ${end}`);
  const chain:THREE.Object3D[]=[];
  for(let node:THREE.Object3D|null=endpoint;node&&node!==model;node=node.parent)chain.unshift(node);
  const rig=new THREE.SkinnedMesh(),root=new THREE.Bone(),target=new THREE.Bone();
  const bones=[root,target];rig.add(root,target);let parent=root;
  const motions:{name:string;bone:THREE.Bone}[]=[];
  const links:{index:number;rotationMin:THREE.Vector3;rotationMax:THREE.Vector3}[]=[];
  function add(bone:THREE.Bone,min?:number,max?:number) {
    parent.add(bone);bones.push(bone);parent=bone;
    const fixed=new THREE.Vector3(bone.rotation.x,bone.rotation.y,bone.rotation.z);
    links.push({index:bones.length-1,rotationMin:min===undefined?fixed:new THREE.Vector3(0,0,min),rotationMax:max===undefined?fixed:new THREE.Vector3(0,0,max)});
  }
  for(const node of chain) {
    const origin=new THREE.Bone();origin.position.copy(node.position);origin.quaternion.copy(node.quaternion);add(origin);
    const name=Object.keys(model.joints).find(n=>model.joints[n]===node);
    if(name&&names.includes(name)) {
      const joint=model.joints[name],basis=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),joint.axis);
      const axis=new THREE.Bone();axis.quaternion.copy(basis);add(axis);
      const motion=new THREE.Bone();motion.rotation.z=initial[names.indexOf(name)]??0;
      add(motion,joint.jointType==='continuous'?-Math.PI:joint.limit.lower,joint.jointType==='continuous'?Math.PI:joint.limit.upper);motions.push({name,bone:motion});
      const inverse=new THREE.Bone();inverse.quaternion.copy(basis).invert();add(inverse);
    }
  }
  const tip=new THREE.Bone();parent.add(tip);bones.push(tip);
  rig.bind(new THREE.Skeleton(bones));rig.matrixAutoUpdate=false;
  const solver=new CCDIKSolver(rig,[{target:1,effector:bones.length-1,links:links.reverse(),iteration:12,maxAngle:.18}]);
  return {update(goal:THREE.Vector3){
    model.updateWorldMatrix(true,true);rig.matrix.copy(model.matrixWorld);rig.updateMatrixWorld(true);
    target.position.copy(rig.worldToLocal(goal.clone()));rig.updateMatrixWorld(true);solver.update();
    motions.forEach(({name,bone})=>model.setJointValue(name,bone.rotation.z));
  }};
}
export function createArmIK(model:URDFRobot) {
  return createChainIK(model,'panda_link8',Array.from({length:7},(_,i)=>`panda_joint${i+1}`),[0,-.45,0,-1.9,0,1.5,.7]);
}
