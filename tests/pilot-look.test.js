import test from 'node:test';
import assert from 'node:assert/strict';
import {dragPilotLook} from '../src/pilot-look.js';

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
