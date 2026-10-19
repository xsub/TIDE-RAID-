import test from 'node:test';
import assert from 'node:assert/strict';
import {applyRudder} from '../src/steering.js';
import {createState, recover, step} from '../src/physics.js';

function turnAt(model, forward, input, wet = 1) {
  const state = createState(model); let angle = 0;
  for (let tick = 0; tick < 600; tick++) {applyRudder(state, 1, forward, wet, 1 / 120, input); angle += state.yawRate / 120;}
  return Math.abs(angle);
}

test('both cruisers make useful powered turns while the larger offshore turns more slowly', () => {
  for (const speed of [0, 5, 20]) {
    const express = turnAt('boat-express-37', speed, {throttle: true});
    const offshore = turnAt('boat-offshore-44', speed, {throttle: true});
    assert.ok(express > 0.5); assert.ok(offshore > 0.3); assert.ok(express > offshore);
  }
  assert.equal(turnAt('boat-express-37', 0, {}), 0);
  assert.equal(turnAt('boat-offshore-44', 20, {throttle: true}, 0), 0);
});

test('outboard steering reverses with thrust and does not bypass lost engine power', () => {
  const forward = createState('boat-express-37'); const reverse = createState('boat-express-37');
  applyRudder(forward, 1, 0, 1, 1 / 120, {throttle: true});
  applyRudder(reverse, 1, 0, 1, 1 / 120, {reverse: true});
  assert.ok(forward.yawRate < 0 && reverse.yawRate > 0);
  const stopped = {...createState('boat-offshore-44'), power: 0};
  applyRudder(stopped, 1, 0, 1, 1 / 120, {throttle: true}); assert.equal(stopped.yawRate, 0);
});

test('actual hull integration turns both cruisers in both directions deterministically', () => {
  const run = (model, turn) => {
    const state = {...createState(model), depthScale: 2}; recover(state, 0, 0);
    const heading = state.heading;
    for (let tick = 0; tick < 960; tick++) step(state, {throttle: true, turn: tick < 480 ? 0 : turn}, 1 / 120, tick / 120, 0);
    assert.ok(Object.values(state).every(Number.isFinite));
    return {state, angle: state.heading - heading};
  };
  for (const model of ['boat-express-37', 'boat-offshore-44']) {
    const right = run(model, 1); const left = run(model, -1);
    assert.ok(right.angle < -0.2); assert.ok(left.angle > 0.2);
    assert.deepEqual(right, run(model, 1));
  }
});
