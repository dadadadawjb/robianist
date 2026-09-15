import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DOMParser } from '@xmldom/xmldom';
import { robots,hands } from '../lib/presets.ts';
test('all selectable hardware has local meshes, valid IK endpoints and distinct hand sides',()=>{
  function read(url:string){const file=path.join('public',url);assert.ok(fs.existsSync(file),file);const doc=new DOMParser().parseFromString(fs.readFileSync(file,'utf8'),'text/xml');for(const mesh of Array.from(doc.getElementsByTagName('mesh'))){const ref=mesh.getAttribute('filename')!;assert.ok(fs.existsSync(ref.startsWith('/')?path.join('public',ref):path.join(path.dirname(file),ref)),ref);}return doc;}
  for(const robot of robots.filter(r=>r.available!==false))for(const side of ['left','right'] as const){const rig=robot.rig(side),doc=read(rig.url);const links=Array.from(doc.getElementsByTagName('link')).map(l=>l.getAttribute('name'));const joints=Array.from(doc.getElementsByTagName('joint')).map(j=>j.getAttribute('name'));assert.ok(links.includes(rig.tip));rig.joints.forEach(j=>assert.ok(joints.includes(j)));}
  for(const hand of hands){assert.notEqual(hand.url('left'),hand.url('right'));for(const side of ['left','right'] as const){const doc=read(hand.url(side)),links=Array.from(doc.getElementsByTagName('link')).map(l=>l.getAttribute('name'));for(const name of [hand.palm(side),...hand.tips(side)])assert.ok(links.includes(name),`${hand.id}: ${name}`);}}
});
