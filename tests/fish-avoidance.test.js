import test from 'node:test';
import assert from 'node:assert/strict';
import {fishEscape} from '../src/fish-avoidance.js';

test('fish flee away from both player and traffic, anticipating approaching hulls', () => {
  const boat = {x: 0, z: 0, vx: 12, vz: 0, beam: 3};
  const approaching = fishEscape(15, -2, 2, boat);
  const departing = fishEscape(15, -2, 2, {...boat, vx: -12});
  assert.ok(approaching.x > 0 && approaching.z > 0);
  assert.ok(approaching.strength > departing.strength);
  assert.deepEqual(fishEscape(15, -2, 2, null, [boat]), approaching);
  assert.equal(fishEscape(15, -2, 2, null, [{...boat, active: false}]).strength, 0);
});

test('escape is bounded, reusable, deterministic and has a fixed traffic scan budget', () => {
  const boat = {x: 0, z: 0}; const output = {};
  assert.equal(fishEscape(0, 0, 0, boat, [], output), output);
  assert.ok(output.x > 0 && Number.isFinite(output.z));
  const fleet = Array.from({length: 100}, () => boat);
  const result = fishEscape(1, -1, 1, boat, fleet);
  assert.ok(Math.hypot(result.x, result.z) <= 1.000001);
  assert.deepEqual(result, fishEscape(1, -1, 1, boat, fleet.slice(0, 32)));
  assert.deepEqual(result, fishEscape(1, -1, 1, boat, fleet));
  assert.equal(fishEscape(100, -2, 100, boat).strength, 0);
  assert.equal(fishEscape(1, -40, 1, boat).strength, 0);
  assert.equal(fishEscape(1, 0, 1, {x: NaN, z: 0}).strength, 0);
});

test('proximity fades continuously to zero at the response boundary', () => {
  const boat = {x: 0, z: 0, beam: 0};
  assert.equal(fishEscape(10, 0, 0, boat).strength, 0);
  assert.ok(fishEscape(9.99, 0, 0, boat).strength < 0.00001);
  assert.ok(fishEscape(2, 0, 0, boat).strength > fishEscape(6, 0, 0, boat).strength);
});
