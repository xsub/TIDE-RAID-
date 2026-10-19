import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readPreferences, savePreferences} from '../src/preferences.js';
import {createSceneryFade} from '../src/scenery-fade.js';

const eye = new THREE.Vector3(0, 6, 20); const boat = {x: 0, y: 1, z: 0};
function response(fadeIn, fadeOut, enabled, frames = 1, master = 1) {
  const fade = createSceneryFade(); fade.update(eye, boat, !enabled, 3, 0.75, 0, true);
  for (let frame = 0; frame < frames; frame++) fade.update(new THREE.Vector3(10, 6, 20), boat, enabled, 3, 0.75, 0.1 / frames, false, master, fadeIn, fadeOut);
  return {strength: fade.uniforms.uFadeStrength.value, history: fade.uniforms.uFadeEyes.value.map((point) => point.x)};
}
test('directional speeds migrate independently without altering the existing master', () => {
  const old = readPreferences({getItem: () => JSON.stringify({sceneryFadeSpeed: 2})});
  assert.equal(old.sceneryFadeSpeed, 2); assert.equal(old.sceneryFadeInSpeed, 1); assert.equal(old.sceneryFadeOutSpeed, 1);
  for (const value of [null, '2', -1, 0, 4]) {
    const preferences = readPreferences({getItem: () => JSON.stringify({sceneryFadeInSpeed: value, sceneryFadeOutSpeed: value})});
    assert.equal(preferences.sceneryFadeInSpeed, 1); assert.equal(preferences.sceneryFadeOutSpeed, 1);
  }
  let saved; const storage = {getItem: () => saved, setItem: (key, value) => {saved = value;}};
  savePreferences(storage, {...old, sceneryFading: false, sceneryFadeAmount: 0.35, sceneryFadeInSpeed: 0.25, sceneryFadeOutSpeed: 3});
  const loaded = readPreferences(storage);
  assert.equal(loaded.sceneryFadeInSpeed, 0.25); assert.equal(loaded.sceneryFadeOutSpeed, 3);
  assert.equal(loaded.sceneryFadeSpeed, 2); assert.equal(loaded.sceneryFading, false); assert.equal(loaded.sceneryFadeAmount, 0.35);
});
test('hide and restoration strength rates are independent', () => {
  assert.ok(response(1, 3, true).strength > response(1, 0.25, true).strength);
  assert.equal(response(3, 1, true).strength, response(0.25, 1, true).strength);
  assert.ok(response(3, 1, false).strength < response(0.25, 1, false).strength);
  assert.equal(response(1, 3, false).strength, response(1, 0.25, false).strength);
});
test('leading response and trailing restoration use their selected rates', () => {
  const normal = response(1, 1, true); const hide = response(1, 3, true); const restore = response(3, 1, true);
  assert.ok(hide.history[0] > normal.history[0]); assert.equal(hide.history[3], normal.history[3]);
  assert.ok(restore.history[3] > normal.history[3]); assert.equal(restore.history[0], normal.history[0]);
  assert.deepEqual(response(0.25, 3, true), response(0.25, 3, true));
});
test('directional timing stays frame-rate independent and master speed still scales both', () => {
  for (const enabled of [true, false]) {
    assert.ok(Math.abs(response(0.25, 3, enabled, 6).strength - response(0.25, 3, enabled, 12).strength) < 1e-12);
  }
  assert.ok(response(1, 1, true, 1, 3).strength > response(1, 1, true, 1, 1).strength);
  assert.ok(response(1, 1, false, 1, 3).strength < response(1, 1, false, 1, 1).strength);
});
