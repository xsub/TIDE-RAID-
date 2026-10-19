import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_SWELL, MAX_SWELL, TRIAL_SWELL, clampSwell} from '../src/swell.js';
import {sampleWave} from '../src/waves.js';
import {createState, step} from '../src/physics.js';

test('exploration starts at 4x maximum swell while trials remain unchanged', () => {
  assert.equal(DEFAULT_SWELL, 4); assert.equal(MAX_SWELL, 4); assert.equal(TRIAL_SWELL, 1);
  assert.equal(clampSwell(10), 4); assert.equal(clampSwell(-1), 0); assert.equal(clampSwell(NaN), 4);
  const old = sampleWave(100, -1000, 3, 2); const maximum = sampleWave(100, -1000, 3, MAX_SWELL);
  for (const name of ['h', 'dx', 'dz', 'dt']) assert.equal(maximum[name], old[name] * 2);
});

test('maximum swell remains finite and deterministic at fixed simulation steps', () => {
  const run = () => {
    const state = {...createState(), depthScale: 2};
    for (let tick = 0; tick < 1200; tick++) step(state, {throttle: true, turn: 0}, 1 / 120, tick / 120, MAX_SWELL);
    for (const value of Object.values(state)) if (typeof value === 'number') assert.ok(Number.isFinite(value));
    return state;
  };
  assert.deepEqual(run(), run());
});
