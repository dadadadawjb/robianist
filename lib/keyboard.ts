import { isBlack, keyX } from './music.ts';

// Visible key dimensions in metres; the hidden action is not modelled.
export const keyboard = {
  rearZ: -0.13,
  pivotY: 0.72,
  whiteLength: 0.18,
  blackLength: 0.11,
  whiteWidth: 0.0244,
  blackWidth: 0.0145,
};
export function keyGeometry(midi: number, pressed: boolean) {
  const black = isBlack(midi),
    length = black ? keyboard.blackLength : keyboard.whiteLength;
  return {
    length,
    width: black ? keyboard.blackWidth : keyboard.whiteWidth,
    height: black ? 0.024 : 0.018,
    offsetY: black ? 0.015 : 0,
    angle: pressed ? Math.asin((black ? 0.009 : 0.01) / length) : 0,
  };
}
export function keyContact(midi: number, pressed: boolean, depth = 0): [number, number, number] {
  const key = keyGeometry(midi, pressed),
    y = key.offsetY + key.height / 2,
    z = Math.max(0.025, Math.min(key.length - 0.018, (isBlack(midi) ? 0.085 : 0.145) + depth));
  return [
    keyX(midi),
    keyboard.pivotY + y * Math.cos(key.angle) - z * Math.sin(key.angle),
    keyboard.rearZ + y * Math.sin(key.angle) + z * Math.cos(key.angle),
  ];
}
