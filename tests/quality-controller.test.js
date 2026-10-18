import test from 'node:test';
import assert from 'node:assert/strict';
import {createQualityController} from '../src/quality-controller.js';
test('adaptive quality reacts to sustained frames, respects bounds and ignores pauses', () => {
  const controller = createQualityController();
  assert.equal(controller.update('auto', 30, false), 1.25);
  let ratio;
  for (let frame = 0; frame < 2000; frame++) ratio = controller.update('auto', 30, true);
  assert.equal(ratio, 0.65);
  for (let frame = 0; frame < 10000; frame++) ratio = controller.update('auto', 10, true);
  assert.equal(ratio, 1.5);
  assert.equal(controller.update('low', 30, true), 0.8);
  assert.equal(controller.update('custom', NaN, true), 1.75);
});
test('automatic quality does not oscillate on a single slow frame', () => {
  const controller = createQualityController(); controller.update('auto', 16, true);
  assert.equal(controller.update('auto', 80, true), 1.25);
  assert.equal(controller.update('auto', 2000, true), 1.25);
});
