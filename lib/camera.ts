import { seatedDepth } from './presets.ts';
export const cameraViews = {
  overview: 'Overview',
  hands: 'Hands close-up',
  side: 'Elevated side',
  eyes: 'Robot eyes',
  shoulder: 'Over the shoulder',
  motion: 'Moving arc',
};
export type CameraView = keyof typeof cameraViews;
type Point = [number, number, number];
export function cameraPose(
  view: CameraView,
  time: number,
  portrait = false,
): { position: Point; target: Point; fov: number } {
  const d = portrait ? 1.5 : 1;
  switch (view) {
    case 'hands':
      return { position: [0.12, 1.65, 1.05], target: [0, 0.72, -0.025], fov: 42 };
    case 'side':
      return { position: [-1.9 * d, 1.5 * d, 0.3], target: [0, 0.68, -0.45], fov: 42 };
    case 'eyes':
      return { position: [0, 1.13, seatedDepth - 0.14], target: [0, 0.72, -0.035], fov: 78 };
    case 'shoulder':
      return { position: [0.85 * d, 1.53 * d, 1.12 * d], target: [0, 0.73, -0.12], fov: 48 };
    case 'motion': {
      const angle = 0.8 * Math.sin((time * Math.PI) / 18);
      return {
        position: [
          1.85 * d * Math.sin(angle),
          1.5 * d + 0.12 * Math.sin((time * Math.PI) / 12),
          1.85 * d * Math.cos(angle),
        ],
        target: [0, 0.72, -0.28],
        fov: 44,
      };
    }
    default:
      return { position: [3 * d, 2.6 * d, 3.4 * d], target: [0, 0.65, -0.65], fov: 39 };
  }
}
