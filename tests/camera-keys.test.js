import test from 'node:test';
import assert from 'node:assert/strict';
import {cameraKeyMotion} from '../src/camera-keys.js';

test('IJKL camera controls support simultaneous orbit/tilt, cancellation and mode restrictions', () => {
  const keys = new Set(['KeyI', 'KeyJ']);
  const motion = cameraKeyMotion(keys, {}, 'chase', 0.05);
  assert.ok(motion.orbit < 0 && motion.tilt > 0);
  assert.deepEqual(cameraKeyMotion(new Set(['KeyI', 'KeyJ', 'KeyK', 'KeyL']), {}, 'arcade', 0.05), {orbit: 0, tilt: 0});
  assert.deepEqual(cameraKeyMotion(keys, {}, 'pilot', 0.05), motion);
  assert.ok(cameraKeyMotion(keys, {}, 'wreck', 0.05).tilt > 0);
  assert.ok(cameraKeyMotion(keys, {}, 'wreck', 0.05).orbit < 0);
});

test('camera keys respect driving bindings and bounded frame-time-independent rates', () => {
  const keys = new Set(['KeyK', 'KeyL']);
  assert.deepEqual(cameraKeyMotion(keys, {throttle: 'KeyK', left: 'KeyL'}, 'chase', 0.05), {orbit: 0, tilt: 0});
  const fast = cameraKeyMotion(keys, {}, 'chase', 1 / 120);
  const slow = cameraKeyMotion(keys, {}, 'chase', 1 / 60);
  assert.equal(fast.orbit * 2, slow.orbit); assert.equal(fast.tilt * 2, slow.tilt);
  assert.deepEqual(cameraKeyMotion(keys, {}, 'chase', NaN), {orbit: 0, tilt: -0});
  assert.deepEqual(cameraKeyMotion(keys, {}, 'chase', 5), cameraKeyMotion(keys, {}, 'chase', 0.05));
});
