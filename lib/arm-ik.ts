import * as THREE from 'three';
import { CCDIKSolver } from 'three/examples/jsm/animation/CCDIKSolver.js';
import type { URDFRobot } from 'urdf-loader';

// Adapt URDF fixed origins + revolute joints to Three.js's existing IK solver.
export function createArmIK(model: URDFRobot) {
  const rig = new THREE.SkinnedMesh(); const root = new THREE.Bone();
  const target = new THREE.Bone(); const bones: THREE.Bone[] = [root,target];
  rig.add(root,target);
  const motion: THREE.Bone[]=[]; let parent=root;
  const initial=[0,-.45,0,-1.9,0,1.5,.7];
  for(let i=1;i<=7;i++) {
    const joint=model.joints[`panda_joint${i}`];
    const origin=new THREE.Bone(); origin.position.copy(joint.position);origin.quaternion.copy(joint.quaternion);
    const bone=new THREE.Bone();bone.rotation.z=initial[i-1];
    parent.add(origin);origin.add(bone);bones.push(origin,bone);motion.push(bone);parent=bone;
  }
  const tip=new THREE.Bone();tip.position.copy(model.joints.panda_joint8.position);parent.add(tip);bones.push(tip);
  rig.bind(new THREE.Skeleton(bones));rig.matrixAutoUpdate=false;
  const links=motion.flatMap((bone,i)=>{const joint=model.joints[`panda_joint${i+1}`];const origin=bone.parent as THREE.Bone;const fixed=new THREE.Vector3(origin.rotation.x,origin.rotation.y,origin.rotation.z);return [{index:bones.indexOf(origin),rotationMin:fixed,rotationMax:fixed},{index:bones.indexOf(bone),rotationMin:new THREE.Vector3(0,0,joint.limit.lower),rotationMax:new THREE.Vector3(0,0,joint.limit.upper)}];}).reverse();
  const solver=new CCDIKSolver(rig,[{target:1,effector:bones.indexOf(tip),links,iteration:18,maxAngle:.15}]);
  return { update(goal:THREE.Vector3) {
    model.updateWorldMatrix(true,true);rig.matrix.copy(model.matrixWorld);rig.updateMatrixWorld(true);
    target.position.copy(rig.worldToLocal(goal.clone()));rig.updateMatrixWorld(true);solver.update();
    motion.forEach((bone,i)=>model.setJointValue(`panda_joint${i+1}`,bone.rotation.z));
  }};
}
