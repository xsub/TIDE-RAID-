import test from 'node:test';
import assert from 'node:assert/strict';
import {clearanceWarning} from '../src/clearance-warning.js';
import {readPreferences} from '../src/preferences.js';

test('alarm preferences migrate and validate saved threshold and mute independently', () => {
  const read = (saved) => readPreferences({getItem: () => JSON.stringify(saved)});
  assert.equal(read({}).shallowThreshold, 1);
  assert.equal(read({}).shallowMuted, false);
  assert.equal(read({shallowThreshold: 2.5, shallowMuted: true}).shallowThreshold, 2.5);
  assert.equal(read({shallowThreshold: 2.5, shallowMuted: true}).shallowMuted, true);
  for (const shallowThreshold of [-1, 0, 5.1, '2', null]) assert.equal(read({shallowThreshold}).shallowThreshold, 1);
  assert.equal(read({shallowMuted: 'true'}).shallowMuted, false);
});

test('clearance alarm triggers at threshold and releases with hysteresis', () => {
  assert.equal(clearanceWarning(false, 1, 1).active, true);
  assert.equal(clearanceWarning(false, 1.1, 1).active, false);
  assert.equal(clearanceWarning(true, 1.1, 1).active, true);
  assert.equal(clearanceWarning(true, 1.16, 1).active, false);
  assert.equal(clearanceWarning(false, 2, 3).active, true);
});

test('clearance alarm rejects missing readings and disabled warnings', () => {
  for (const clearance of [null, undefined, NaN, Infinity]) assert.equal(clearanceWarning(true, clearance, 1).active, false);
  assert.equal(clearanceWarning(true, 0, 1, false).active, false);
  assert.equal(clearanceWarning(false, 0.5, NaN).active, true);
});

test('clearance alarm urgency and cadence remain bounded through ground contact', () => {
  const edge = clearanceWarning(false, 1, 1);
  const contact = clearanceWarning(false, -2, 1);
  assert.equal(edge.urgency, 0);
  assert.equal(contact.urgency, 1);
  assert.ok(contact.period < edge.period);
  assert.ok(contact.period >= 0.9 && edge.period <= 1.6);
});
