import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readPreferences, savePreferences} from '../src/preferences.js';
import {createSceneryFade, sceneryFadeActive} from '../src/scenery-fade.js';
import {clearCameraBounds} from '../src/camera-obstacles.js';

test('fade settings default to existing appearance and reject malformed saved values', () => {
  for (const saved of [{}, {sceneryFading: 'false', sceneryFadeAmount: -1}, {sceneryFadeAmount: 2}, {sceneryFadeAmount: '0.5'}, {sceneryFadeAmount: null}]) {
    const preferences = readPreferences({getItem: () => JSON.stringify(saved)});
    assert.equal(preferences.sceneryFading, true); assert.equal(preferences.sceneryFadeAmount, 1);
  }
});

test('fade toggle and strength persist independently including zero', () => {
  let stored;
  const storage = {getItem: () => stored, setItem: (key, value) => {stored = value;}};
  for (const amount of [0, 0.35, 1]) {
    savePreferences(storage, {...readPreferences(storage), sceneryFading: false, sceneryFadeAmount: amount});
    const preferences = readPreferences(storage);
    assert.equal(preferences.sceneryFading, false); assert.equal(preferences.sceneryFadeAmount, amount);
  }
});

test('off, zero and pilot restore solid scenery avoidance', () => {
  const box = {kind: 'tree', minX: 4, maxX: 8, minZ: -3, maxZ: 3, bottom: 0, top: 20};
  const target = {x: 0, y: 2, z: 0};
  for (const [enabled, amount, mode, expected] of [[true, 1, 'chase', true], [true, 0.25, 'wreck', true], [false, 1, 'arcade', false], [true, 0, 'chase', false], [true, 1, 'pilot', false]]) {
    const active = sceneryFadeActive({sceneryFading: enabled, sceneryFadeAmount: amount}, mode);
    assert.equal(active, expected);
    const eye = clearCameraBounds({x: 20, y: 3, z: 0}, target, [box], 0.8, active);
    assert.equal(eye.x === 20, expected);
  }
});

test('strength changes reuse shader uniforms without recompilation', () => {
  const fade = createSceneryFade(); const material = fade.patch(new THREE.MeshStandardMaterial());
  const hook = material.onBeforeCompile; const version = material.version;
  const strength = fade.uniforms.uFadeStrength;
  const eye = new THREE.Vector3(0, 3, 10); const boat = {x: 0, y: 1, z: 0};
  for (const amount of [0, 0.25, 0.75, 1]) {
    fade.update(eye, boat, true, 3, amount);
    assert.equal(strength.value, amount);
    assert.equal(fade.uniforms.uFadeEnabled.value, amount > 0 ? 1 : 0);
    assert.equal(material.onBeforeCompile, hook); assert.equal(material.version, version);
  }
});
