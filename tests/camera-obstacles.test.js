import test from 'node:test';
import assert from 'node:assert/strict';
import {cameraObstacleLayout, clearCameraBounds, clearCameraObjects, smoothCameraBoom} from '../src/camera-obstacles.js';
import {mooredLayout} from '../src/moored-boats.js';

const box = {minX: 4, maxX: 5, minZ: -2, maxZ: 2, bottom: 0, top: 8};
test('camera clears thin obstacles between terrain samples with lens clearance', () => {
  const eye = {x: 20, y: 3, z: 0};
  clearCameraBounds(eye, {x: 0, y: 1, z: 0}, [box]);
  assert.ok(eye.x < 3.2 && eye.x > 3);
  assert.ok(eye.y <= 3); assert.equal(eye.z, 0);
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
  assert.equal(eye.x, 3.2); assert.equal(eye.y, 2); assert.equal(target.x, 4.5);
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
  assert.ok(explore.x < trial.x); assert.equal(explore.y, 1);
});
test('tall near-target trees retract the boom rather than launching it skyward', () => {
  const eye = {x: 100, y: 5, z: 0};
  clearCameraBounds(eye, {x: 0, y: 2, z: 0}, [{...box, minX: 1, maxX: 3, top: 80}]);
  assert.ok(eye.x < 0.2); assert.ok(eye.y <= 5);
});
test('boom damping anticipates contact, recovers slowly and never exceeds hard clearance', () => {
  const inward = smoothCameraBoom(1, 0.4, 0.9, 1 / 60);
  assert.ok(inward < 1 && inward > 0.4);
  assert.equal(smoothCameraBoom(1, 0.4, 0.5, 1 / 60), 0.5);
  const outward = smoothCameraBoom(0.4, 1, 1, 1 / 60);
  assert.ok(outward > 0.4 && outward < 0.45);
  let split = 0.4;
  for (let frame = 0; frame < 60; frame++) split = smoothCameraBoom(split, 1, 1, 1 / 60);
  let coarse = 0.4;
  for (let frame = 0; frame < 30; frame++) coarse = smoothCameraBoom(coarse, 1, 1, 1 / 30);
  assert.ok(Math.abs(split - coarse) < 1e-12);
});
test('nearest segment obstruction is independent of bounds ordering', () => {
  const far = {...box, minX: 10, maxX: 12, top: 30};
  const target = {x: 0, y: 1, z: 0};
  const first = clearCameraBounds({x: 20, y: 3, z: 0}, target, [box, far]);
  const second = clearCameraBounds({x: 20, y: 3, z: 0}, target, [far, box]);
  assert.ok(Math.abs(first.x - second.x) < 1e-12);
});
test('world boom smoothing respects hard hull clearance and camera cuts reset recovery', () => {
  const boat = mooredLayout(0)[0];
  const target = {x: boat.x - 8, y: 1, z: boat.z};
  const original = {x: boat.x + 8, y: 1, z: boat.z};
  const wave = () => ({h: 0}); const follow = {fraction: 1};
  const safe = clearCameraObjects({...original}, target, true, 0, 1, wave);
  const smoothed = clearCameraObjects({...original}, target, true, 0, 1, wave, follow, 1 / 60);
  assert.ok(smoothed.x <= safe.x + 1e-10); assert.equal(smoothed.y, 1);
  follow.fraction = 0.01;
  const cut = clearCameraObjects({...original}, target, true, 0, 1, wave, follow, 1 / 60, true);
  assert.ok(Math.abs(cut.x - safe.x) < 1e-10);
});
