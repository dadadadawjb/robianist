import fs from 'node:fs/promises';
import path from 'node:path';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';

// Keep upstream paths and licenses. Only visual resources are shipped to the browser.
const sources = [
  {key:'dex',ref:'f5e7132f22108164577fea4c25ef99b5cc0e1900',repo:'dexsuite/dex-urdf',models:[
    ['ur5e','robots/arms/ur5e','ur5e_glb.urdf'],
    ['iiwa7','robots/arms/iiwa7','iiwa7_glb.urdf'],
    ...['allegro','leap','shadow'].map(n=>[n,`robots/hands/${n}_hand`,`${n}_hand_left_glb.urdf`,`${n}_hand_right_glb.urdf`])
  ]},
  {key:'sharpa',ref:'0d447b6889e6d993758169dfc0aa75ee9f6ad8d7',repo:'sharpa-robotics/sharpa-urdf-usd-xml',models:['left','right'].map(s=>[`sharpa-${s}`,`wave_01/${s}_sharpa_wave`,`${s}_sharpa_wave.urdf`])},
  {key:'wuji',ref:'c2cd7f8d1ef8b6dc8cb907c17daa5a88b4442d95',repo:'wuji-technology/wuji-description',models:[['wuji','hand/body','urdf/left.urdf','urdf/right.urdf']]},
  {key:'flexiv',ref:'72cc00a137d7dd18816ee5676cc94b630061709b',repo:'flexivrobotics/flexiv_rdk',models:[['rizon4','resources','flexiv_Rizon4_kinematics.urdf','flexiv_Rizon4R_kinematics.urdf']]}
];
const jobs=new Map();const records=[];
async function get(repo,ref,file) {
  const url=`https://raw.githubusercontent.com/${repo}/${ref}/${file}`;
  let response=await request(url);if(!response.ok)throw new Error(`${response.status} ${url}`);
  let bytes=Buffer.from(await response.arrayBuffer());
  if(bytes.subarray(0,80).toString().startsWith('version https://git-lfs.github.com')) {
    response=await request(`https://media.githubusercontent.com/media/${repo}/${ref}/${file}`);
    if(!response.ok)throw new Error(`LFS ${response.status}: ${file}`);
    bytes=Buffer.from(await response.arrayBuffer());
  }
  return bytes;
}
async function request(url) {
  for(let attempt=0;attempt<4;attempt++) {
    try {return await fetch(url,{signal:AbortSignal.timeout(45000)});}
    catch(error){if(attempt===3)throw error;await new Promise(resolve=>setTimeout(resolve,1000));}
  }
}
for(const source of sources) {
  const response=await request(`https://api.github.com/repos/${source.repo}/git/trees/${source.ref}?recursive=1`);
  if(!response.ok)throw new Error(`Tree request failed: ${source.repo}`);
  const tree=await response.json();
  const ref=tree.sha;const root=`public/models/vendor/${source.key}`;
  const queue=(file)=>{const local=path.posix.join(root,file);if(!jobs.has(local))jobs.set(local,async()=>{try { if((await fs.stat(local)).size>0)return; } catch {} await fs.mkdir(path.dirname(local),{recursive:true});await fs.writeFile(local,await get(source.repo,ref,file));});};
  for(const file of tree.tree.filter(f=>/^(LICENSE[^/]*|NOTICE[^/]*|README.md)$/.test(f.path)))queue(file.path);
  for(const [id,folder,...urdfs] of source.models) {
    for(const lic of tree.tree.filter(f=>f.path.startsWith(folder+'/')&&/\/(LICENSE[^/]*|NOTICE[^/]*)$/i.test(f.path)))queue(lic.path);
    for(const name of urdfs) {
      const file=path.posix.join(folder,name);const text=(await get(source.repo,ref,file)).toString();
      const doc=new DOMParser().parseFromString(text,'text/xml');
      for(const collision of [...Array.from(doc.getElementsByTagName('collision'))])collision.parentNode.removeChild(collision);
      for(const mesh of Array.from(doc.getElementsByTagName('mesh'))) {
        let asset=mesh.getAttribute('filename');
        if(asset.startsWith('package://')) {
          asset=asset.replace(/^package:\/\/[^/]+\//,'');
          // Sharpa packages resolve at the model folder; Flexiv at resources.
          asset=path.posix.join(folder,source.key==='flexiv'?'meshes':'',asset);
        } else asset=path.posix.normalize(path.posix.join(path.posix.dirname(file),asset));
        queue(asset);
        mesh.setAttribute('filename','/models/vendor/'+source.key+'/'+asset);
        if(asset.endsWith('.obj')) {const mtl=asset.replace(/\.obj$/,'.mtl');if(tree.tree.some(f=>f.path===mtl))queue(mtl);}
      }
      const local=path.posix.join(root,file);await fs.mkdir(path.dirname(local),{recursive:true});
      await fs.writeFile(local+'.source',text);await fs.writeFile(local,new XMLSerializer().serializeToString(doc));
      records.push({id,repo:source.repo,commit:ref,source:file,url:local.replace(/^public/,'')});
    }
  }
}
const list=[...jobs.entries()];let cursor=0;
await Promise.all(Array.from({length:6},async()=>{while(cursor<list.length){const [file,job]=list[cursor++];await job();console.log(file);}}));
await fs.writeFile('public/models/catalog-sources.json',JSON.stringify(records,null,2)+'\n');
console.log(`Downloaded ${list.length} visual resources and licenses.`);
