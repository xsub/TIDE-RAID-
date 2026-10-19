import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readPreferences, savePreferences} from '../src/preferences.js';
import {createSceneryFade} from '../src/scenery-fade.js';

const eye = new THREE.Vector3(0, 6, 20);
const boat = {x: 0, y: 1, z: 0};
test('fade speed migrates safely and persists independently of toggle and amount', () => {
  for (const value of [undefined, null, '2', -1, 0, 4]) {
    assert.equal(readPreferences({getItem: () => JSON.stringify({sceneryFadeSpeed: value})}).sceneryFadeSpeed, 1);
  }
  let saved;
  const storage = {getItem: () => saved, setItem: (key, value) => {saved = value;}};
  for (const speed of [0.25, 1, 3]) {
    savePreferences(storage, {...readPreferences(storage), sceneryFading: false, sceneryFadeAmount: 0.35, sceneryFadeSpeed: speed});
    const preferences = readPreferences(storage);
    assert.equal(preferences.sceneryFadeSpeed, speed);
    assert.equal(preferences.sceneryFading, false); assert.equal(preferences.sceneryFadeAmount, 0.35);
  }
});

test('higher speed accelerates fading away, restoration and sightline tracking', () => {
  const result = (speed) => {
    const fade = createSceneryFade(); fade.update(eye, boat, false, 3, 0.75, 1 / 60, true, speed);
    fade.update(new THREE.Vector3(10, 6, 20), boat, true, 3, 0.75, 1 / 60, false, speed);
    const fadeIn = fade.uniforms.uFadeStrength.value;
    const tracking = fade.uniforms.uFadeEyes.value[3].x;
    fade.update(eye, boat, true, 3, 0.75, 1 / 60, true, speed);
    fade.update(eye, boat, false, 3, 0.75, 1 / 60, false, speed);
    return {fadeIn, tracking, remaining: fade.uniforms.uFadeStrength.value};
  };
  const slow = result(0.25); const normal = result(1); const fast = result(3);
  assert.ok(slow.fadeIn < normal.fadeIn && normal.fadeIn < fast.fadeIn);
  assert.ok(slow.tracking < normal.tracking && normal.tracking < fast.tracking);
  assert.ok(slow.remaining > normal.remaining && normal.remaining > fast.remaining);
  assert.deepEqual(result(3), fast);
});

test('speed changes retain history buffers and camera cuts still reset immediately', () => {
  const fade = createSceneryFade(); fade.update(eye, boat, true, 3, 1, 1 / 60, true);
  const history = fade.uniforms.uFadeEyes.value;
  const moved = new THREE.Vector3(10, 6, 20);
  fade.update(moved, boat, true, 3, 0.5, 0, false, 3);
  assert.equal(history[0].x, 0); assert.equal(fade.uniforms.uFadeStrength.value, 1);
  fade.update(moved, boat, false, 3, 0.5, 1 / 60, true, 0.25);
  assert.equal(fade.uniforms.uFadeEnabled.value, 0);
  assert.equal(fade.uniforms.uFadeEyes.value, history);
  for (const position of history) assert.equal(position.x, 10);
});

test('fade timing remains frame-rate independent at every speed', () => {
  for (const speed of [0.25, 1, 3]) {
    const run = (frames) => {
      const fade = createSceneryFade(); fade.update(eye, boat, false, 3, 1, 0, true, speed);
      for (let frame = 0; frame < frames; frame++) fade.update(eye, boat, true, 3, 1, 0.5 / frames, false, speed);
      return fade.uniforms.uFadeStrength.value;
    };
    assert.ok(Math.abs(run(30) - run(60)) < 1e-12);
  }
});
