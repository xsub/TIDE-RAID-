import test from 'node:test';
import assert from 'node:assert/strict';
import {waterDepth, applyShallows} from '../src/depth.js';
import {seabedHeight} from '../src/seabed.js';
import {channel} from '../src/world.js';
import {createState} from '../src/physics.js';
import {readPreferences} from '../src/preferences.js';

test('depth parameter deepens open water while physics and seabed share the same bounded depth', () => {
  const state = createState();
  const original = waterDepth(state.x, state.z);
  assert.ok(waterDepth(state.x, state.z, 2) > original);
  for (const depthScale of [0.5, 1, 2, 4]) {
    state.depthScale = depthScale; applyShallows(state, 1 / 120);
    assert.ok(state.depth > 0 && state.depth <= 80);
    assert.equal(seabedHeight(state.x, state.z, depthScale), -waterDepth(state.x, state.z, depthScale));
    const banks = channel(state.z);
    assert.ok(Math.abs(waterDepth(banks.left - 10, state.z, depthScale) - 0.05) < 1e-9);
  }
  assert.equal(waterDepth(state.x, state.z, NaN), original);
});

test('exploration defaults deeper and rejects invalid saved depth factors', () => {
  assert.equal(readPreferences(undefined).riverDepth, 2);
  for (const riverDepth of [-1, 5, '2', null]) assert.equal(readPreferences({getItem: () => JSON.stringify({riverDepth})}).riverDepth, 2);
  assert.equal(readPreferences({getItem: () => JSON.stringify({riverDepth: 3})}).riverDepth, 3);
});
