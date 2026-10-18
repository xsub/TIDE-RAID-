import test from 'node:test';
import assert from 'node:assert/strict';
import {cameraGroundHeight, clearCameraTerrain, cameraDefaults} from '../src/camera-safety.js';
import {channel} from '../src/world.js';

test('external camera clears terrain at its eye and along the sightline', () => {
  const target = {x: 0, y: 1, z: 0}; const eye = {x: 24, y: 3, z: 0};
  let samples = 0;
  clearCameraTerrain(eye, target, (x) => {samples++; return x > 10 && x < 15 ? 8 : 0;}, 2);
  assert.equal(samples, 12);
  assert.ok(eye.y >= 18);
  assert.ok(1 + (eye.y - 1) * 0.5 >= 9.5);
  assert.equal(eye.x, 24); assert.equal(eye.z, 0);
});

test('terrain safety allows deep wreck cameras but never below the bed', () => {
  const eye = {x: 10, y: -20, z: 0};
  clearCameraTerrain(eye, {x: 0, y: -21, z: 0}, () => -30);
  assert.equal(eye.y, -20);
  clearCameraTerrain(eye, {x: 0, y: -21, z: 0}, () => -10);
  assert.ok(eye.y >= -8.5);
  const z = -1000; const banks = channel(z);
  assert.ok(cameraGroundHeight(banks.left - 100, z) > 0);
  assert.ok(cameraGroundHeight(banks.center, z) < 0);
});

test('reset restores camera framing without changing other preferences or the other view', () => {
  assert.deepEqual(cameraDefaults('pilot'), {pilotYaw: 0, pilotPitch: 0});
  for (const mode of ['chase', 'arcade', 'wreck']) {
    const settings = {cameraAngle: 170, cameraZoom: 8, manualCamera: true, cameraElevation: 80, cameraHeight: 400, pilotYaw: 70, volume: 0.4};
    Object.assign(settings, cameraDefaults(mode));
    assert.equal(settings.cameraAngle, 20); assert.equal(settings.cameraZoom, 1); assert.equal(settings.manualCamera, false);
    assert.equal(settings.pilotYaw, 70); assert.equal(settings.volume, 0.4);
  }
});
