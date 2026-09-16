import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assetUrl } from '../lib/asset-url.ts';

test('model URLs support root and GitHub Pages hosting without double prefixes',()=>{
  const previous=process.env.NEXT_PUBLIC_BASE_PATH;
  try {
    delete process.env.NEXT_PUBLIC_BASE_PATH;
    assert.equal(assetUrl('/models/g1_wuji/g1_wuji.urdf'),'/models/g1_wuji/g1_wuji.urdf');
    process.env.NEXT_PUBLIC_BASE_PATH='/robianist';
    assert.equal(assetUrl('/models/g1_wuji/g1_wuji.urdf'),'/robianist/models/g1_wuji/g1_wuji.urdf');
    assert.equal(assetUrl('/models/vendor/hand/mesh.STL'),'/robianist/models/vendor/hand/mesh.STL');
    for(const url of ['/robianist/models/g1_wuji/meshes/g1/pelvis.STL','texture.png','blob:example','https://example.com/mesh.glb'])assert.equal(assetUrl(url),url);
  } finally {
    if(previous===undefined)delete process.env.NEXT_PUBLIC_BASE_PATH;
    else process.env.NEXT_PUBLIC_BASE_PATH=previous;
  }
});
