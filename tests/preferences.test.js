import test from 'node:test';
import assert from 'node:assert/strict';
import {readPreferences, savePreferences, remap, readGamepad, advanceLesson} from '../src/preferences.js';

test('preferences validate ranges, recover from corruption and swap conflicting bindings', () => {
  const preferences = readPreferences(undefined);
  assert.equal(remap(preferences, 'throttle', 'KeyS'), true);
  assert.equal(preferences.bindings.brake, 'KeyW');
  assert.equal(remap(preferences, 'pause', 'Escape'), false);
  const store = new Map();
  const storage = {getItem: (key) => store.get(key), setItem: (key, value) => store.set(key, value)};
  assert.equal(savePreferences(storage, preferences), true);
  assert.deepEqual(readPreferences(storage), preferences);
  assert.equal(savePreferences(undefined, preferences), false);
  const bad = readPreferences({getItem: () => JSON.stringify({detail: -3, camera: 'bad', sensitivity: 100, bindings: {}})});
  assert.equal(bad.detail, 75);
  assert.equal(bad.camera, 'chase');
  assert.equal(bad.sensitivity, 1);
});

test('standard controller maps triggers and buttons, applies deadzone and tolerates disconnect', () => {
  assert.equal(readGamepad([null]).connected, false);
  const buttons = Array.from({length: 16}, () => ({pressed: false, value: 0}));
  buttons[7].value = 0.8;
  buttons[0].pressed = true;
  const pad = {connected: true, mapping: 'standard', axes: [0.1], buttons};
  assert.equal(readGamepad([pad]).turn, 0);
  assert.equal(readGamepad([pad]).throttle, true);
  assert.equal(readGamepad([pad]).boost, true);
  pad.axes[0] = -1;
  assert.equal(readGamepad([pad]).turn, -1);
  pad.connected = false;
  assert.equal(readGamepad([pad]).throttle, false);
});

test('driving hints advance from actions instead of elapsed time alone', () => {
  const lesson = {stage: 0, steering: 0};
  advanceLesson(lesson, {}, {speed: 0}, 0, 10);
  assert.equal(lesson.stage, 0);
  advanceLesson(lesson, {}, {speed: 6}, 0, 0.1);
  advanceLesson(lesson, {turn: 1}, {}, 0, 0.5);
  assert.equal(lesson.stage, 2);
  advanceLesson(lesson, {boost: true, throttle: true}, {}, 0, 0.1);
  advanceLesson(lesson, {}, {}, 1, 0.1);
  assert.equal(lesson.stage, 4);
});
