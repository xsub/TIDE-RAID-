import test from 'node:test';
import assert from 'node:assert/strict';
import {cameraObstacleLayout, clearCameraBounds, clearCameraObjects} from '../src/camera-obstacles.js';
import {mooredLayout} from '../src/moored-boats.js';

const box = {minX: 4, maxX: 5, minZ: -2, maxZ: 2, bottom: 0, top: 8};
test('camera clears thin obstacles between terrain samples with lens clearance', () => {
  const eye = {x: 20, y: 3, z: 0};
  clearCameraBounds(eye, {x: 0, y: 1, z: 0}, [box]);
  assert.ok(1 + (eye.y - 1) * 0.16 >= 8.8);
  assert.equal(eye.x, 20); assert.equal(eye.z, 0);
});
test('parallel misses and underwater sightlines remain untouched', () => {
  for (const eye of [{x: 20, y: -4, z: 0}, {x: 0, y: 3, z: 10}]) {
    const original = {...eye};
    clearCameraBounds(eye, {x: 0, y: eye.y, z: 0}, [box]);
    assert.deepEqual(eye, original);
  }
});
test('camera inside a bound escapes without moving the target', () => {
  const eye = {x: 4.5, y: 2, z: 0}; const target = {...eye};
  clearCameraBounds(eye, target, [box]);
  assert.equal(eye.y, 8.8); assert.equal(target.y, 2);
});
test('cached deterministic world bounds include nature, houses and moorings', () => {
  const bounds = cameraObstacleLayout(0);
  assert.equal(bounds, cameraObstacleLayout(0)); assert.ok(Object.isFrozen(bounds));
  for (const kind of ['tree', 'rock', 'building', 'dock', 'lighthouse']) assert.ok(bounds.some((item) => item.kind === kind));
  const target = {x: 0, y: 2, z: 100}; const original = {x: 220, y: 5, z: -100};
  const first = clearCameraObjects({...original}, target, true, 2, 4, () => ({h: 0}));
  assert.deepEqual(first, clearCameraObjects({...original}, target, true, 2, 4, () => ({h: 0})));
  assert.ok(Number.isFinite(first.y));
});
test('exploration cameras clear an anchored hull while trials omit moorings', () => {
  const boat = mooredLayout(0)[0]; assert.ok(boat);
  const target = {x: boat.x - 8, y: 1, z: boat.z};
  const eye = {x: boat.x + 8, y: 1, z: boat.z};
  const trial = clearCameraObjects({...eye}, target, false, 0, 1, () => ({h: 0}));
  const explore = clearCameraObjects({...eye}, target, true, 0, 1, () => ({h: 0}));
  assert.ok(explore.y > trial.y);
});
