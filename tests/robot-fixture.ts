import { readFileSync } from 'node:fs';
import { DOMParser } from '@xmldom/xmldom';
import URDFLoader from 'urdf-loader';

// Use the production URDF loader and real joint transforms without loading visual meshes.
export function robotFixture() {
  const doc=new DOMParser().parseFromString(readFileSync(new URL('../public/models/g1_wuji/g1_wuji.urdf',import.meta.url),'utf8'),'text/xml');
  for(const node of [doc,...Array.from(doc.getElementsByTagName('*'))])Object.defineProperty(node,'children',{get:()=>Array.from(node.childNodes).filter(n=>n.nodeType===1)});
  Object.defineProperty(doc.documentElement,'querySelector',{value:(selector:string)=>{
    const name=selector.match(/link="([^"]+)"/)![1];
    return Array.from(doc.getElementsByTagName('child')).find(n=>n.getAttribute('link')===name)??null;
  }});
  const globals=globalThis as unknown as {Document:unknown;Element:unknown};
  const previous={Document:globals.Document,Element:globals.Element};
  globals.Document=doc.constructor;globals.Element=doc.documentElement!.constructor;
  try {
    const loader=new URDFLoader();loader.parseVisual=false;loader.parseCollision=false;
    return loader.parse(doc as unknown as Document);
  } finally {globals.Document=previous.Document;globals.Element=previous.Element;}
}
