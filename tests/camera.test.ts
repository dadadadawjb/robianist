import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cameraPose, cameraViews, type CameraView } from '../lib/camera.ts';

test('all camera views have finite positions above the stage and distinct targets', () => {
  for (const view of Object.keys(cameraViews) as CameraView[])
    for (const portrait of [false, true]) {
      const pose = cameraPose(view, 17, portrait);
      assert.ok([...pose.position, ...pose.target, pose.fov].every(Number.isFinite));
      assert.ok(pose.position[1] > 0.72);
      assert.notDeepEqual(pose.position, pose.target);
    }
});
test('moving arc is deterministic on seek and remains in front of the keyboard', () => {
  const first = cameraPose('motion', 7);
  cameraPose('motion', 51);
  assert.deepEqual(cameraPose('motion', 7), first);
  assert.notDeepEqual(cameraPose('motion', 0), first);
  for (let t = 0; t < 300; t += 0.25) {
    const { position } = cameraPose('motion', t);
    assert.ok(position[2] > 1.28);
    assert.ok(position[1] >= 1.38 && position[1] <= 1.62);
  }
});

test('side camera looks from the left and motion stays closer to the keys', () => {
  assert.ok(cameraPose('side', 0).position[0] < 0);
  for (let t = 0; t < 36; t++) {
    const { position } = cameraPose('motion', t);
    assert.ok(Math.abs(Math.hypot(position[0], position[2]) - 1.85) < 1e-12);
  }
});
