export type Side = 'left' | 'right';
export const seatedDepth = 0.36;
export const robotUrl = '/models/g1_wuji/g1_wuji.urdf';
export const armJoints = (side: Side) =>
  [
    'shoulder_pitch',
    'shoulder_roll',
    'shoulder_yaw',
    'elbow',
    'wrist_roll',
    'wrist_pitch',
    'wrist_yaw',
  ].map((n) => `${side}_${n}_joint`);
export const hand = {
  fingers: 5,
  tips: (side: Side) => [1, 2, 3, 4, 5].map((n) => `${side}_finger${n}_tip_link`),
};
