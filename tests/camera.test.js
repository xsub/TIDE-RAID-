import test from 'node:test';
import assert from 'node:assert/strict';
import {cameraPose, clampCameraZoom, CAMERA_ZOOM_PRESETS} from '../src/camera.js';
import {readPreferences, savePreferences} from '../src/preferences.js';

test('zoom presets enlarge the arcade boat and preserve orbit and safe chase clearance', () => {
  const state = {x: 0, y: 0, z: 0, heading: 0, speed: 40, length: 12};
  let previousHeight = Infinity;
  for (const {zoom} of CAMERA_ZOOM_PRESETS) {
    const pose = cameraPose(state, 'arcade', 90, 16 / 9, false, 400, zoom);
    assert.ok(pose.y < previousHeight); previousHeight = pose.y;
    assert.ok(Math.abs(pose.z) < 1e-8);
    for (const aspect of [16 / 9, 9 / 16]) {
      const chase = cameraPose(state, 'chase', 0, aspect, aspect < 1, 400, zoom);
      assert.ok(chase.z >= state.length * 0.8 + 2);
      assert.ok(Object.values(chase).every(Number.isFinite));
    }
  }
  assert.equal(clampCameraZoom(Infinity), 1);
  assert.equal(clampCameraZoom(-1), 0.5);
  assert.equal(clampCameraZoom(100), 8);
});

test('zoom preferences migrate and reject invalid values', () => {
  for (const cameraZoom of [null, '4', -1, 9]) assert.equal(readPreferences({getItem: () => JSON.stringify({cameraZoom})}).cameraZoom, 1);
  let saved;
  const storage = {getItem: () => saved, setItem: (key, value) => {saved = value;}};
  savePreferences(storage, {...readPreferences(undefined), cameraZoom: 4});
  assert.equal(readPreferences(storage).cameraZoom, 4);
});

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
