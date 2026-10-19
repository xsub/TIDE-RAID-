import test from 'node:test';
import assert from 'node:assert/strict';
import {wakeResponse} from '../src/wake-response.js';
import {wakeSound} from '../src/wake-sound.js';

test('wake crossings produce bounded events once per entry with hysteresis and cooldown', () => {
  const body = {x: 8, z: 32, vx: 15, vz: 0, heading: 0, mass: 1800, rollRate: 0, pitchRate: 0, vy: 0, airtime: 0};
  const ships = [{x: 0, z: 0, heading: 0, speed: 15, active: true}];
  wakeResponse(body, ships, 1, 1 / 120); assert.equal(body.wakeEvent, 1); assert.ok(body.wakeImpact > 0 && body.wakeImpact <= 1);
  for (let tick = 1; tick < 120; tick++) wakeResponse(body, ships, 1 + tick / 120, 1 / 120);
  assert.equal(body.wakeEvent, 1);
  body.x = 40; wakeResponse(body, ships, 2.1, 1 / 120);
  body.x = 8; wakeResponse(body, ships, 2.2, 1 / 120); assert.equal(body.wakeEvent, 2);
  body.x = 40; wakeResponse(body, ships, 2.3, 1 / 120);
  body.x = 8; wakeResponse(body, ships, 2.4, 1 / 120); assert.equal(body.wakeEvent, 2);
  body.airtime = 1; wakeResponse(body, ships, 3, 1 / 120); assert.equal(body.wakeEvent, 2);
});

test('wake water sound is quiet, short, impact-sensitive and bounded for malformed inputs', () => {
  assert.equal(wakeSound(0).gain, 0); assert.equal(wakeSound(NaN).gain, 0);
  assert.ok(wakeSound(0.9, 30).gain > wakeSound(0.1, 30).gain);
  assert.ok(wakeSound(100, 100).gain <= 0.028); assert.ok(wakeSound(100, 100).duration <= 0.31);
});
test('bounded wake forces affect trailing crossings, respect mass and replay exactly', () => {
  const ship = {x: 0, z: 0, heading: 0, speed: 15, active: true};
  const body = {x: 8, z: 32, heading: 0, mass: 1800, rollRate: 0, pitchRate: 0, vy: 0};
  const light = {...body}; const heavy = {...body, mass: 8000};
  wakeResponse(light, [ship], 2, 1 / 120); wakeResponse(heavy, [ship], 2, 1 / 120);
  assert.ok(light.wakeStrength > 0.5); assert.ok(Math.abs(light.rollRate) > Math.abs(heavy.rollRate));
  const replay = {...body}; wakeResponse(replay, [ship], 2, 1 / 120); assert.deepEqual(replay, light);
  const ahead = {...body, z: -32}; wakeResponse(ahead, [ship], 2, 1 / 120); assert.equal(ahead.rollRate, 0);
});
