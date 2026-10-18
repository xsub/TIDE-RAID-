import test from 'node:test';
import assert from 'node:assert/strict';
import {createActivity, tickActivity} from '../src/coastal-activity.js';
import {SERVICE_STATIONS} from '../src/voyage.js';
test('delivery requires pickup then a different harbor and does not award twice', () => {
  const state = {...SERVICE_STATIONS[0], speed: 0}; const activity = createActivity('delivery', state);
  for (let tick = 0; tick < 241; tick++) tickActivity(activity, state, 1 / 120);
  assert.equal(activity.phase, 'deliver'); assert.equal(activity.target, 1);
  Object.assign(state, SERVICE_STATIONS[1]);
  for (let tick = 0; tick < 241; tick++) tickActivity(activity, state, 1 / 120);
  assert.equal(activity.phase, 'done'); const score = activity.score;
  tickActivity(activity, state, 100); assert.equal(activity.score, score);
});
test('docking resets its hold if throttle, speed or position is unsafe', () => {
  const state = {...SERVICE_STATIONS[0], speed: 0}; const activity = createActivity('docking', state);
  tickActivity(activity, state, 3); tickActivity(activity, state, 1, true); assert.equal(activity.hold, 0);
  tickActivity(activity, {...state, speed: 1}, 5); assert.equal(activity.phase, 'dock');
  tickActivity(activity, state, 5); assert.equal(activity.phase, 'done');
});
