import test from 'node:test';
import assert from 'node:assert/strict';
import {cameraPose} from '../src/camera.js';
import {readPreferences, savePreferences} from '../src/preferences.js';

test('orbit covers the full circle in both camera modes without moving its target', () => {
  const state = {x: 10, y: 0.5, z: -100, heading: 0.7, speed: 40};
  for (const mode of ['chase', 'arcade']) {
    const rear = cameraPose(state, mode, 0, 16 / 9);
    const full = cameraPose(state, mode, 360, 16 / 9);
    assert.ok(Math.abs(rear.x - full.x) < 1e-9);
    assert.ok(Math.abs(rear.z - full.z) < 1e-9);
    const front = cameraPose(state, mode, 180, 16 / 9);
    assert.ok(Math.abs((rear.x + front.x) / 2 - state.x) < 1e-9);
    for (let angle = 0; angle <= 360; angle++) {
      const pose = cameraPose(state, mode, angle, 9 / 16, true);
      assert.ok(Object.values(pose).every(Number.isFinite));
      assert.equal(pose.lookX, rear.lookX);
      assert.equal(pose.lookZ, rear.lookZ);
      assert.ok(pose.y > state.y + 5);
    }
  }
});

test('chase stays close and low at speed with bounded wider perspective', () => {
  const state = {x: 0, y: 0, z: 0, heading: 0, speed: 0};
  const rest = cameraPose(state, 'chase', 0, 16 / 9);
  const fast = cameraPose({...state, speed: 70}, 'chase', 0, 16 / 9);
  assert.ok(fast.y < 7 && fast.z < 18);
  assert.ok(fast.fov > rest.fov && fast.fov <= 68);
});

test('camera angle preferences migrate, validate and persist', () => {
  assert.equal(readPreferences(undefined).cameraAngle, 20);
  for (const cameraAngle of [-1, 361, '90', null]) {
    assert.equal(readPreferences({getItem: () => JSON.stringify({cameraAngle})}).cameraAngle, 20);
  }
  let saved;
  const storage = {getItem: () => saved, setItem: (key, value) => {saved = value;}};
  savePreferences(storage, {...readPreferences(undefined), cameraAngle: 270});
  assert.equal(readPreferences(storage).cameraAngle, 270);
});
