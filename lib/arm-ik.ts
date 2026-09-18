import * as THREE from 'three';
import type { URDFRobot } from 'urdf-loader';

// Damped least squares in world space, with optional endpoint orientation.
// Solve the small positive-definite system without inverting a matrix.
function solve(matrix: number[][], rhs: number[]) {
  const a = matrix.map((row, i) => [...row, rhs[i]]),
    n = rhs.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const ratio = a[j][i] / a[i][i];
      for (let k = i; k <= n; k++) a[j][k] -= ratio * a[i][k];
    }
  }
  const result = Array<number>(n).fill(0);
  for (let i = n - 1; i >= 0; i--)
    result[i] =
      (a[i][n] - result.reduce((sum, x, j) => sum + (j > i ? a[i][j] * x : 0), 0)) / a[i][i];
  return result;
}

export function createPoseIK(model: URDFRobot, end: string, names: string[], rest: number[]) {
  const endpoint = model.links[end],
    joints = names.map((name) => model.joints[name]);
  if (!endpoint || joints.some((j) => !j)) throw new Error('Missing pose IK endpoint or joint.');
  joints.forEach((joint, i) => joint.setJointValue(rest[i]));
  const origin = new THREE.Vector3(),
    axis = new THREE.Vector3(),
    rotation = new THREE.Quaternion();
  return {
    update(
      goal: THREE.Vector3,
      orientation?: THREE.Quaternion,
      contacts?: { end: string; goal: THREE.Vector3 }[],
    ) {
      const targets = (contacts ?? [{ end, goal }]).map((c) => ({
        point: model.links[c.end],
        goal: c.goal,
      }));
      const affects = (joint: THREE.Object3D, tip: THREE.Object3D) => {
        for (let node: THREE.Object3D | null = tip; node; node = node.parent)
          if (node === joint) return true;
        return false;
      };
      const influences = joints.map((j) => targets.map((t) => affects(j, t.point)));
      const turns = joints.map((j) => affects(j, endpoint));
      const size = targets.length * 3 + (orientation ? 3 : 0),
        damping = orientation ? 0.012 : 0.006,
        orientationWeight = 0.12;
      for (let iteration = 0; iteration < 32; iteration++) {
        endpoint.updateWorldMatrix(true, false);
        const points = targets.map((t) => t.point.getWorldPosition(new THREE.Vector3()));
        const error = targets.flatMap((t, i) => t.goal.clone().sub(points[i]).toArray());
        if (orientation) {
          rotation
            .copy(orientation)
            .multiply(endpoint.getWorldQuaternion(new THREE.Quaternion()).invert())
            .normalize();
          if (rotation.w < 0) rotation.set(-rotation.x, -rotation.y, -rotation.z, -rotation.w);
          const sin = Math.hypot(rotation.x, rotation.y, rotation.z);
          const factor =
            sin > 1e-8
              ? ((2 * Math.atan2(sin, rotation.w)) / sin) * orientationWeight
              : 2 * orientationWeight;
          error.push(rotation.x * factor, rotation.y * factor, rotation.z * factor);
        }
        const columns = joints.map((joint, j) => {
          joint.getWorldPosition(origin);
          axis.copy(joint.axis).applyQuaternion(joint.getWorldQuaternion(new THREE.Quaternion()));
          const linear = points.flatMap((p, i) =>
            influences[j][i]
              ? new THREE.Vector3().crossVectors(axis, p.clone().sub(origin)).toArray()
              : [0, 0, 0],
          );
          return orientation
            ? [
                ...linear,
                ...(turns[j]
                  ? axis.clone().multiplyScalar(orientationWeight).toArray()
                  : [0, 0, 0]),
              ]
            : linear;
        });
        const blocked = joints.map((joint, j) => {
          const gradient = columns[j].reduce((sum, x, r) => sum + x * error[r], 0);
          return (
            (joint.angle <= joint.limit.lower + 1e-5 && gradient < 0) ||
            (joint.angle >= joint.limit.upper - 1e-5 && gradient > 0)
          );
        });
        blocked.forEach((b, j) => {
          if (b) columns[j].fill(0);
        });
        // A small null-space preference keeps redundant joints near a relaxed pose.
        const bias = joints.map((j, i) => (blocked[i] ? 0 : (rest[i] - j.angle) * 0.025));
        const rhs = error.map((e, r) => e - columns.reduce((sum, c, j) => sum + c[r] * bias[j], 0));
        const matrix = Array.from({ length: size }, (_, r) =>
          Array.from(
            { length: size },
            (_, c) =>
              columns.reduce((sum, j) => sum + j[r] * j[c], 0) + (r === c ? damping * damping : 0),
          ),
        );
        const correction = solve(matrix, rhs);
        const angles = joints.map((j) => j.angle);
        const steps = joints.map((joint, j) => {
          if (!influences[j].some(Boolean) && !turns[j]) return 0;
          const step = bias[j] + columns[j].reduce((sum, x, r) => sum + x * correction[r], 0);
          return step;
        });
        const stepScale = Math.min(1, 0.2 / Math.max(...steps.map(Math.abs)));
        steps.forEach((step, i) => {
          steps[i] = step * stepScale;
        });
        if (Math.hypot(...error) < 0.0002) break;
        const cost = error.reduce((sum, x) => sum + x * x, 0);
        let improved = false;
        for (let scale = 1; scale >= 1 / 16; scale /= 2) {
          joints.forEach((j, i) => j.setJointValue(angles[i] + steps[i] * scale));
          let nextCost = targets.reduce(
            (sum, t) =>
              sum + t.point.getWorldPosition(new THREE.Vector3()).distanceToSquared(t.goal),
            0,
          );
          if (orientation)
            nextCost +=
              (orientation.angleTo(endpoint.getWorldQuaternion(new THREE.Quaternion())) *
                orientationWeight) **
              2;
          if (nextCost < cost) {
            improved = true;
            break;
          }
        }
        if (!improved) {
          joints.forEach((j, i) => j.setJointValue(angles[i]));
          break;
        }
      }
      endpoint.updateWorldMatrix(true, false);
    },
  };
}
