import type { Note, PedalEvent } from './music.ts';

// Events are ordered, including release/repress pairs at the same score time.
export function pedalDown(events:PedalEvent[],time:number) {
  let down=false;
  for(const event of events){if(event.time>time)break;down=event.down;}
  return down;
}
export function soundingEnd(note:Note,events:PedalEvent[]) {
  const end=note.start+note.duration;
  // A release at the exact key-up time damps the old note even when immediately repedalled.
  if(events.some(e=>!e.down&&Math.abs(e.time-end)<1e-7))return end;
  if(!pedalDown(events,end))return end;
  return events.find(e=>!e.down&&e.time>end)?.time??end;
}

// Smooth, seekable motion; a repedal lifts briefly before pressing again.
export function pedalAmount(events:PedalEvent[],time:number) {
  let amount=0,previous=0,lastTime=-Infinity;
  for(const event of events) {
    if(event.time>time)break;
    const phase=Math.min(1,(event.time-lastTime)/.06);
    previous=previous+(amount-previous)*phase;
    if(!event.down)previous=amount;
    else if(event.time===lastTime)previous=0;
    amount=event.down?1:0;lastTime=event.time;
  }
  const phase=Math.min(1,Math.max(0,(time-lastTime)/.06));
  return previous+(amount-previous)*phase*phase*(3-2*phase);
}

export const pedalGeometry={x:.085,pivotY:.157,pivotZ:-.29,length:.19,travel:.10};
export const footSupport={width:.40,depth:.24,centerZ:.045,top:.134};
export function pedalContact(amount:number):[number,number,number] {
  const angle=amount*pedalGeometry.travel,along=.15,top=.009;
  return [pedalGeometry.x,pedalGeometry.pivotY+top*Math.cos(angle)-along*Math.sin(angle),pedalGeometry.pivotZ+top*Math.sin(angle)+along*Math.cos(angle)];
}
