import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DOMParser } from '@xmldom/xmldom';
import { robotUrl, armJoints, hand } from '../lib/presets.ts';

test('G1 and Wuji form one connected assembly with local meshes and preserved joints', () => {
  const doc = new DOMParser().parseFromString(
    fs.readFileSync(path.join('public', robotUrl), 'utf8'),
    'text/xml',
  );
  const links = Array.from(doc.getElementsByTagName('link')).map((l) => l.getAttribute('name'));
  const joints = Array.from(doc.getElementsByTagName('joint'));
  assert.equal(new Set(links).size, links.length);
  const parents = new Map(
    joints.map((j) => [
      j.getElementsByTagName('child')[0].getAttribute('link'),
      j.getElementsByTagName('parent')[0].getAttribute('link'),
    ]),
  );
  for (const side of ['left', 'right'] as const) {
    armJoints(side).forEach((name) =>
      assert.ok(joints.some((j) => j.getAttribute('name') === name)),
    );
    assert.equal(parents.get(`${side}_palm_link`), `${side}_wrist_yaw_link`);
    assert.ok(!links.includes(`${side}_rubber_hand`));
    for (const tip of hand.tips(side)) {
      let node: string | null = tip;
      const visited = new Set();
      while (parents.has(node)) {
        assert.ok(!visited.has(node));
        visited.add(node);
        node = parents.get(node)!;
      }
      assert.equal(node, 'pelvis');
    }
  }
  for (const mesh of Array.from(doc.getElementsByTagName('mesh'))) {
    const ref = mesh.getAttribute('filename')!;
    assert.ok(fs.existsSync(path.join('public', path.dirname(robotUrl), ref)), ref);
    assert.equal(mesh.getAttribute('scale') || '1 1 1', '1 1 1');
  }
});
