import test from 'node:test';
import assert from 'node:assert/strict';
import {depthReadings} from '../src/depth-gauge.js';
const state = {x: 0, y: 0.6, z: 0, heading: 0, length: 8, beam: 3, draft: 1, pitch: 0, roll: 0};

test('depth gauge distinguishes river depth, keel clearance and actual camera submersion', () => {
  const result = depthReadings(state, {y: -3}, 0.2, 0.4, () => 10);
  assert.equal(result.river, 10.2); assert.equal(result.clearance, 9);
  assert.equal(result.cameraDepth, 3.4); assert.equal(result.status, 'CLEAR');
  assert.equal(depthReadings(state, {y: 4}, 0, 0, () => 10).cameraDepth, 0);
});
test('flooding, sinking, heel and the shallowest hull sample reduce estimated clearance', () => {
  assert.ok(depthReadings(state, {y: 0}, 0, 0, () => 10, 1.5).clearance < 9);
  assert.equal(depthReadings({...state, y: -8.5}, {y: -7}, 0, 0, () => 10).status, 'GROUND CONTACT');
  assert.equal(depthReadings(state, {y: 0}, 0, 0, () => 1.2).status, 'LOW CLEARANCE');
  assert.ok(depthReadings({...state, roll: 0.2}, {y: 0}, 0, 0, () => 10).clearance < 9);
  assert.equal(depthReadings(state, {y: 0}, 0, 0, (x, z) => z < -1 ? 0.5 : 10).status, 'GROUND CONTACT');
});
test('missing or invalid readings remain unavailable instead of showing a false safe depth', () => {
  const result = depthReadings(state, {y: NaN}, 0, 0, () => NaN);
  assert.equal(result.river, null); assert.equal(result.clearance, null); assert.equal(result.cameraDepth, null); assert.equal(result.status, 'DEPTH UNAVAILABLE');
});
