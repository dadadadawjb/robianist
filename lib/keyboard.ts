import { isBlack,keyX } from './music.ts';

// Visible key dimensions in metres; the hidden action is not modelled.
export const keyboard={rearZ:-.13,pivotY:.72,whiteLength:.155,blackLength:.095,whiteWidth:.0229,blackWidth:.0137};
export function keyGeometry(midi:number,pressed:boolean) {
  const black=isBlack(midi),length=black?keyboard.blackLength:keyboard.whiteLength;
  return {length,width:black?keyboard.blackWidth:keyboard.whiteWidth,height:black?.024:.018,offsetY:black?.015:0,angle:pressed?Math.asin((black?.009:.01)/length):0};
}
export function keyContact(midi:number,pressed:boolean):[number,number,number] {
  const key=keyGeometry(midi,pressed),y=key.offsetY+key.height/2,z=isBlack(midi)?.075:.125;
  return [keyX(midi),keyboard.pivotY+y*Math.cos(key.angle)-z*Math.sin(key.angle),keyboard.rearZ+y*Math.sin(key.angle)+z*Math.cos(key.angle)];
}
