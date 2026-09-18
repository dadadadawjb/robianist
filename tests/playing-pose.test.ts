import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { robotFixture } from './robot-fixture.ts';
import { createPlayingPose, playingContact, fingertipRadius } from '../lib/playing-pose.ts';
import { keyContact } from '../lib/keyboard.ts';
import { createPoseIK } from '../lib/arm-ik.ts';
import { assignFingers } from '../lib/fingering.ts';
import { readScore } from '../lib/score.ts';
import { armJoints, hand } from '../lib/presets.ts';
import { pedalAmount, pedalContact, footSupport } from '../lib/pedal.ts';

const song = readScore(
  readFileSync(new URL('../public/scores/HumanLight.mxl', import.meta.url)),
  'HumanLight.mxl',
);
const notes = assignFingers(song.notes, 5);
test('repeated key lifts the actual fingertip before pressing again', () => {
  const contacts = assignFingers(
    [0, 0.5, 1].map((start) => ({ midi: 60, start, duration: 0.5, hand: 'right' as const })),
    1,
  );
  const model = robotFixture(),
    pose = createPlayingPose(model),
    heights: number[] = [];
  for (let frame = 0; frame <= 66; frame++) {
    pose.update(contacts, frame / 60, true, 1 / 60);
    heights.push(model.links.right_finger1_tip_link.getWorldPosition(new THREE.Vector3()).y);
  }
  assert.ok(heights[29] - heights[24] > 0.015, 'Finger lifts between consecutive attacks');
  assert.ok(
    Math.abs(heights[36] - playingContact(60, true).y) < 0.003,
    'Finger returns to the key',
  );
  assert.ok(heights[59] - heights[54] > 0.015, 'The next repetition also lifts');
});
test('real G1 + Wuji reaches Human Light opening targets without overturning its wrists', () => {
  const model = robotFixture(),
    pose = createPlayingPose(model);
  const orientations = new Map<string, THREE.Quaternion>();
  for (const time of [...new Set(notes.filter((n) => n.start < 6).map((n) => n.start + 0.1))]) {
    for (let i = 0; i < 30; i++) pose.update(notes, time, true, 1 / 60);
    for (const n of notes.filter((n) => n.start <= time && time < n.start + n.duration)) {
      const tip = model.links[`${n.hand}_finger${n.finger + 1}_tip_link`].getWorldPosition(
        new THREE.Vector3(),
      );
      assert.ok(
        tip.distanceTo(playingContact(n.midi, true, n.finger)) < 0.003,
        `${time}s ${n.hand} finger ${n.finger + 1} misses key`,
      );
    }
    for (const side of ['left', 'right'] as const) {
      const q = model.links[`${side}_wrist_yaw_link`].getWorldQuaternion(new THREE.Quaternion());
      if (!orientations.has(side)) orientations.set(side, q.clone());
      assert.ok(q.angleTo(orientations.get(side)!) < 0.05, `${side} wrist overturned`);
      for (const name of armJoints(side)) {
        const joint = model.joints[name];
        assert.ok(
          joint.angle > joint.limit.lower + 0.01 && joint.angle < joint.limit.upper - 0.01,
          `${name} at limit`,
        );
      }
    }
  }
});
test('released fingers return to a raised curved pose and seeking clears pose history', () => {
  const model = robotFixture(),
    pose = createPlayingPose(model);
  for (const time of [0, 0.3, 0.6, 1, 2, 3])
    for (let i = 0; i < 20; i++) pose.update(notes, time, true, 1 / 60);
  for (let i = 0; i < 30; i++) pose.update(notes, 0, true, 1 / 60);
  const fresh = robotFixture(),
    freshPose = createPlayingPose(fresh);
  for (let i = 0; i < 30; i++) freshPose.update(notes, 0, true, 1 / 60);
  for (const side of ['left', 'right'] as const)
    for (const [i, name] of hand.tips(side).entries()) {
      const tip = model.links[name].getWorldPosition(new THREE.Vector3());
      assert.ok(tip.distanceTo(fresh.links[name].getWorldPosition(new THREE.Vector3())) < 0.001);
      if (side === 'left' && i === 4) continue;
      assert.ok(tip.y > 0.735, `${name} should hover above the white keys`);
      assert.ok(
        model.joints[`${side}_finger${i + 1}_joint3`].angle > 0.1,
        'Idle finger stays curved',
      );
    }
});
test('pose IK reaches a known attainable wrist pose using actual joint axes and limits', () => {
  const model = robotFixture(),
    names = armJoints('right');
  model.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
  model.position.set(0.1, 0.59, 0.46);
  const desired = [-0.5, -0.4, 0.2, 0.8, -0.7, 0.3, 0.2];
  names.forEach((n, i) => model.setJointValue(n, desired[i]));
  model.updateMatrixWorld(true);
  const wrist = model.links.right_wrist_yaw_link,
    position = wrist.getWorldPosition(new THREE.Vector3()),
    orientation = wrist.getWorldQuaternion(new THREE.Quaternion());
  names.forEach((n, i) => model.setJointValue(n, desired[i] + 0.15));
  const solver = createPoseIK(model, 'right_wrist_yaw_link', names, desired);
  for (let i = 0; i < 10; i++) solver.update(position, orientation);
  assert.ok(wrist.getWorldPosition(new THREE.Vector3()).distanceTo(position) < 0.001);
  assert.ok(wrist.getWorldQuaternion(new THREE.Quaternion()).angleTo(orientation) < 0.01);
});

test('continuous opening playback settles onto keys after each attack', () => {
  const model = robotFixture(),
    pose = createPlayingPose(model);
  for (let frame = 0; frame < 360; frame++) {
    const time = frame / 60;
    pose.update(notes, time, true, 1 / 60);
    for (const n of notes.filter((n) => n.start + 0.12 < time && time < n.start + n.duration)) {
      const tip = model.links[`${n.hand}_finger${n.finger + 1}_tip_link`].getWorldPosition(
        new THREE.Vector3(),
      );
      assert.ok(
        tip.distanceTo(playingContact(n.midi, true, n.finger)) < 0.003,
        `${time}s ${n.hand} misses after transition`,
      );
    }
  }
});

test('white and black chords and low bass octaves share a reachable wrist pose', () => {
  for (const [file, times] of [
    ['HumanLight.mxl', [58, 62, 78]],
    ['IfOnly.mxl', [0, 78]],
  ] as const) {
    const score = readScore(
      readFileSync(new URL(`../public/scores/${file}`, import.meta.url)),
      file,
    );
    const contacts = assignFingers(score.notes, 5),
      model = robotFixture(),
      pose = createPlayingPose(model);
    for (const time of times) {
      for (let frame = 0; frame < 30; frame++) pose.update(contacts, time, true, 1 / 60);
      for (const n of contacts.filter((n) => n.start <= time && time < n.start + n.duration)) {
        const tip = model.links[`${n.hand}_finger${n.finger + 1}_tip_link`].getWorldPosition(
          new THREE.Vector3(),
        );
        assert.ok(
          tip.distanceTo(playingContact(n.midi, true, n.finger)) < 0.005,
          `${file} ${time}s ${n.hand} finger ${n.finger + 1}`,
        );
      }
      for (const joint of Object.values(model.joints))
        if (joint.jointType === 'revolute')
          assert.ok(
            joint.angle >= joint.limit.lower - 1e-8 && joint.angle <= joint.limit.upper + 1e-8,
          );
    }
  }
});

test('idle fingertips stay above adjacent black keys after the playing hand settles', () => {
  const model = robotFixture(),
    pose = createPlayingPose(model);
  for (const time of [0, 0.3, 0.6, 1, 2, 3, 5.5, 58, 62, 78]) {
    for (let frame = 0; frame < 30; frame++) pose.update(notes, time, true, 1 / 60);
    const active = notes.filter((n) => n.start <= time && time < n.start + n.duration);
    for (const side of ['left', 'right'] as const)
      for (const [i, name] of hand.tips(side).entries()) {
        if (active.some((n) => n.hand === side && n.finger === i)) continue;
        const tip = model.links[name].getWorldPosition(new THREE.Vector3());
        assert.ok(
          tip.y - fingertipRadius >= keyContact(61, false)[1] + 0.01,
          `${time}s ${name} clearance too low: ${tip.y}`,
        );
      }
  }
});

test('longer fingers land deeper while targets remain on the rotated key surface', () => {
  for (const midi of [60, 61]) {
    const middle = playingContact(midi, true, 2),
      thumb = playingContact(midi, true, 0);
    assert.ok(middle.z < thumb.z - (midi === 60 ? 0.01 : 0.004));
    assert.ok(middle.y > thumb.y, 'Deeper contact follows the tilted key top');
  }
});

test('If Only bars 29 and 91 keep contacts and curved idle joints during continuous playback', () => {
  const score = readScore(
    readFileSync(new URL('../public/scores/IfOnly.mxl', import.meta.url)),
    'IfOnly.mxl',
  );
  const plan = assignFingers(score.notes, 5);
  // 4/4 at 80 BPM: bars 29 and 91 begin at 84 and 270 seconds.
  for (const start of [83.8, 269.8]) {
    const model = robotFixture(),
      pose = createPlayingPose(model);
    for (let frame = 0; frame < 210; frame++) {
      const time = start + frame / 60;
      pose.update(plan, time, true, 1 / 60, score);
      const active = plan.filter(
        (n) => n.hand === 'left' && n.start <= time && time < n.start + n.duration,
      );
      for (const n of active)
        if (time >= n.start + 0.05) {
          const tip = model.links[`left_finger${n.finger + 1}_tip_link`].getWorldPosition(
            new THREE.Vector3(),
          );
          assert.ok(
            tip.distanceTo(playingContact(n.midi, true, n.finger)) < 0.005,
            `${time}: left key ${n.midi}`,
          );
        }
      for (let finger = 1; finger < 5; finger++)
        if (!active.some((n) => n.finger === finger)) {
          for (const j of [3, 4]) {
            const angle = model.joints[`left_finger${finger + 1}_joint${j}`].angle;
            assert.ok(
              angle >= 0.14 && angle <= 0.36,
              `${time}: idle finger ${finger}, joint ${j} folds or hyperextends`,
            );
          }
        }
    }
  }
});

test('torso sway preserves hand contacts and the right foot follows the damper surface', () => {
  const score = {
    ...song,
    pedals: [
      { time: 0, down: true },
      { time: 1, down: false },
    ],
  };
  const model = robotFixture(),
    pose = createPlayingPose(model),
    rolls: number[] = [];
  for (const time of [0.2, 0.7, 1.2]) {
    for (let frame = 0; frame < 15; frame++) pose.update(notes, time, true, 1 / 60, score);
    rolls.push(model.joints.waist_roll_joint.angle);
    const toe = model.links.right_ankle_roll_link.localToWorld(new THREE.Vector3(0.1, 0, -0.035));
    assert.ok(
      toe.distanceTo(new THREE.Vector3(...pedalContact(pedalAmount(score.pedals, time)))) < 0.003,
      `${time}: foot misses pedal`,
    );
    for (const n of notes.filter((n) => n.start <= time && time < n.start + n.duration))
      assert.ok(
        model.links[`${n.hand}_finger${n.finger + 1}_tip_link`]
          .getWorldPosition(new THREE.Vector3())
          .distanceTo(playingContact(n.midi, true, n.finger)) < 0.005,
      );
  }
  assert.ok(Math.max(...rolls) - Math.min(...rolls) > 0.02);
  pose.update(notes, 1.2, false, 1 / 60, score);
  assert.equal(model.joints.waist_roll_joint.angle, 0);
});

test('both heels stay supported while the right forefoot presses and releases the pedal', () => {
  const score = {
    ...song,
    pedals: [
      { time: 0, down: true },
      { time: 1, down: false },
    ],
  };
  const model = robotFixture(),
    pose = createPlayingPose(model);
  assert.ok(footSupport.centerZ - footSupport.depth / 2 > -0.1, 'Platform clears the pedal front');
  for (const time of [0, 0.03, 0.2, 1.03, 1.2]) {
    for (let frame = 0; frame < 15; frame++) pose.update(notes, time, true, 1 / 60, score);
    for (const side of ['left', 'right']) {
      const heel = model.links[`${side}_ankle_roll_link`].localToWorld(
        new THREE.Vector3(-0.05, 0, -0.035),
      );
      assert.ok(
        Math.abs(heel.y - footSupport.top) < 0.002,
        `${side} heel floats at ${time}: ${heel.y}`,
      );
      assert.ok(Math.abs(heel.x) < footSupport.width / 2 - 0.01);
      assert.ok(Math.abs(heel.z - footSupport.centerZ) < footSupport.depth / 2 - 0.01);
    }
    const toe = model.links.right_ankle_roll_link.localToWorld(new THREE.Vector3(0.1, 0, -0.035));
    assert.ok(
      toe.distanceTo(new THREE.Vector3(...pedalContact(pedalAmount(score.pedals, time)))) < 0.003,
    );
  }
});

test('If Only bars 9–12 retain a lowered elbow when reached continuously from the opening', () => {
  const score = readScore(
    readFileSync(new URL('../public/scores/IfOnly.mxl', import.meta.url)),
    'IfOnly.mxl',
  );
  const plan = assignFingers(score.notes, 5),
    model = robotFixture(),
    pose = createPlayingPose(model);
  // Include the preceding wide chords: directly seeking to bar 9 misses the bad IK branch.
  for (let frame = 0; frame < 36 * 60; frame++) {
    const time = frame / 60;
    pose.update(plan, time, true, 1 / 60, score);
    if (time < 24) continue;
    for (const side of ['left', 'right'] as const) {
      const elbow = model.links[`${side}_elbow_link`].getWorldPosition(new THREE.Vector3());
      const wrist = model.links[`${side}_wrist_yaw_link`].getWorldPosition(new THREE.Vector3());
      assert.ok(elbow.y < wrist.y + 0.01, `${time}: ${side} elbow rises above wrist`);
      const joint = model.joints[`${side}_elbow_joint`];
      assert.ok(
        joint.angle < joint.limit.upper - 0.1,
        `${time}: ${side} elbow hits mechanical limit`,
      );
    }
    for (const n of plan.filter((n) => n.start + 0.08 <= time && time < n.start + n.duration)) {
      const tip = model.links[`${n.hand}_finger${n.finger + 1}_tip_link`].getWorldPosition(
        new THREE.Vector3(),
      );
      assert.ok(
        tip.distanceTo(playingContact(n.midi, true, n.finger)) < 0.005,
        `${time}: ${n.hand} misses ${n.midi}`,
      );
    }
  }
});
