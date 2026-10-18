import test from 'node:test';
import assert from 'node:assert/strict';
import {dragPilotLook, smoothPilotLook} from '../src/pilot-look.js';
import {readPreferences, savePreferences} from '../src/preferences.js';

test('mouse sensitivity scales drag without altering defaults and stays bounded', () => {
  assert.equal(dragPilotLook(0, 0, 40, 0, 2).yaw, 20);
  assert.equal(dragPilotLook(0, 0, 40, 0, 0.5).yaw, 5);
  assert.deepEqual(dragPilotLook(0, 0, 40, 20, NaN), dragPilotLook(0, 0, 40, 20));
  assert.deepEqual(dragPilotLook(0, 0, 40, 20, 100), dragPilotLook(0, 0, 40, 20, 3));
});

test('look smoothing follows the short yaw arc and is responsive without overshoot', () => {
  const look = smoothPilotLook({yaw: 179, pitch: 0}, {yaw: -179, pitch: 40}, 1 / 60);
  assert.ok(look.yaw > 179 && look.yaw < 180);
  assert.ok(look.pitch > 0 && look.pitch < 40);
  let current = {yaw: 0, pitch: 0};
  for (let frame = 0; frame < 12; frame++) current = smoothPilotLook(current, {yaw: 90, pitch: 45}, 1 / 60);
  assert.ok(current.yaw > 87 && current.yaw <= 90);
  assert.deepEqual(smoothPilotLook(current, {yaw: 0, pitch: 0}, 1 / 60, 0), {yaw: 0, pitch: 0});
});

test('look smoothing is frame-rate independent for constant targets and reuses its output', () => {
  const run = (rate) => {
    const current = {yaw: 170, pitch: -20};
    for (let frame = 0; frame < rate / 2; frame++) assert.equal(smoothPilotLook(current, {yaw: -150, pitch: 50}, 1 / rate, 0.6, current), current);
    return current;
  };
  const slow = run(30); const fast = run(120);
  assert.ok(Math.abs(slow.yaw - fast.yaw) < 1e-9); assert.ok(Math.abs(slow.pitch - fast.pitch) < 1e-9);
  const unchanged = smoothPilotLook({yaw: 20, pitch: 5}, {yaw: 70, pitch: 50}, NaN);
  assert.deepEqual(unchanged, {yaw: 20, pitch: 5});
});

test('mouse sensitivity and smoothing migrate and persist independently of driving sensitivity', () => {
  const defaults = readPreferences(undefined);
  assert.equal(defaults.mouseLookSensitivity, 1); assert.equal(defaults.pilotLookSmoothing, 0.35);
  const invalid = readPreferences({getItem: () => JSON.stringify({mouseLookSensitivity: 10, pilotLookSmoothing: '0.5'})});
  assert.equal(invalid.mouseLookSensitivity, 1); assert.equal(invalid.pilotLookSmoothing, 0.35);
  let saved; const storage = {getItem: () => saved, setItem: (key, value) => {saved = value;}};
  savePreferences(storage, {...defaults, mouseLookSensitivity: 2.5, pilotLookSmoothing: 0, sensitivity: 0.75});
  const restored = readPreferences(storage);
  assert.equal(restored.mouseLookSensitivity, 2.5); assert.equal(restored.pilotLookSmoothing, 0); assert.equal(restored.sensitivity, 0.75);
});

test('mouse look supports both axes, wraps yaw and limits vertical tilt', () => {
  const look = dragPilotLook(0, 0, 80, -100);
  assert.equal(look.yaw, 20); assert.equal(look.pitch, 22);
  assert.equal(dragPilotLook(175, 0, 80, 0).yaw, -165);
  assert.equal(dragPilotLook(-175, 0, -80, 0).yaw, 165);
  assert.equal(dragPilotLook(0, 70, 0, -100).pitch, 75);
  assert.equal(dragPilotLook(0, -70, 0, 100).pitch, -75);
  assert.deepEqual(dragPilotLook(NaN, Infinity, NaN, Infinity), {yaw: 0, pitch: 0});
});

test('mouse look composes with existing keyboard angles without event-rate dependence', () => {
  const whole = dragPilotLook(30, 10, 100, 50);
  let split = {yaw: 30, pitch: 10};
  for (let index = 0; index < 10; index++) split = dragPilotLook(split.yaw, split.pitch, 10, 5);
  assert.ok(Math.abs(split.yaw - whole.yaw) < 1e-9); assert.ok(Math.abs(split.pitch - whole.pitch) < 1e-9);
});
