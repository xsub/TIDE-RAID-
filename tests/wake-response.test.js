import test from 'node:test';
import assert from 'node:assert/strict';
import {wakeResponse} from '../src/wake-response.js';
test('bounded wake forces affect trailing crossings, respect mass and replay exactly', () => {
  const ship = {x: 0, z: 0, heading: 0, speed: 15, active: true};
  const body = {x: 8, z: 32, heading: 0, mass: 1800, rollRate: 0, pitchRate: 0, vy: 0};
  const light = {...body}; const heavy = {...body, mass: 8000};
  wakeResponse(light, [ship], 2, 1 / 120); wakeResponse(heavy, [ship], 2, 1 / 120);
  assert.ok(light.wakeStrength > 0.5); assert.ok(Math.abs(light.rollRate) > Math.abs(heavy.rollRate));
  const replay = {...body}; wakeResponse(replay, [ship], 2, 1 / 120); assert.deepEqual(replay, light);
  const ahead = {...body, z: -32}; wakeResponse(ahead, [ship], 2, 1 / 120); assert.equal(ahead.rollRate, 0);
});
