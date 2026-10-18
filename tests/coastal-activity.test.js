import test from 'node:test';
import assert from 'node:assert/strict';
import {createActivity, tickActivity, LIGHTHOUSE_ROUTE, activityTarget} from '../src/coastal-activity.js';
import {SERVICE_STATIONS} from '../src/voyage.js';

test('lighthouse tour uses real landmarks, distinct targets and awards after exactly three visits', () => {
  assert.ok(LIGHTHOUSE_ROUTE.length > 3);
  const state = {...LIGHTHOUSE_ROUTE[0], speed: 10}; const activity = createActivity('lighthouse', state);
  tickActivity(activity, state, 1, true); assert.equal(activity.visited, 0);
  for (let visit = 0; visit < 3; visit++) {Object.assign(state, activityTarget(activity)); tickActivity(activity, state, 1);}
  assert.equal(activity.phase, 'done'); assert.equal(activity.visited, 3);
  tickActivity(activity, state, 1); assert.equal(activity.visited, 3);
});
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
