import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readPreferences, savePreferences} from '../src/preferences.js';
import {createSceneryFade, sceneryFadeMask} from '../src/scenery-fade.js';
import {clearCameraBounds} from '../src/camera-obstacles.js';

const eye = new THREE.Vector3(0, 6, 20); const boat = {x: 0, y: 1, z: 0};
test('legacy settings seed both kinds while explicit per-kind values persist independently', () => {
  const migrated = readPreferences({getItem: () => JSON.stringify({sceneryFadeAmount: 0.35, sceneryFadeInSpeed: 0.25, sceneryFadeOutSpeed: 3})});
  for (const kind of ['tree', 'building']) {
    assert.equal(migrated[`${kind}FadeAmount`], 0.35);
    assert.equal(migrated[`${kind}FadeInSpeed`], 0.25); assert.equal(migrated[`${kind}FadeOutSpeed`], 3);
  }
  let saved; const storage = {getItem: () => saved, setItem: (key, value) => {saved = value;}};
  savePreferences(storage, {...migrated, treeFadeAmount: 0, buildingFadeAmount: 0.75, treeFadeInSpeed: 2, buildingFadeOutSpeed: 0.5});
  const restored = readPreferences(storage);
  assert.equal(restored.treeFadeAmount, 0); assert.equal(restored.buildingFadeAmount, 0.75);
  assert.equal(restored.treeFadeInSpeed, 2); assert.equal(restored.buildingFadeOutSpeed, 0.5);
  const invalid = readPreferences({getItem: () => JSON.stringify({treeFadeAmount: -1, buildingFadeInSpeed: '2'})});
  assert.equal(invalid.treeFadeAmount, 1); assert.equal(invalid.buildingFadeInSpeed, 1);
});
test('tree and building shaders bind isolated histories and strength uniforms', () => {
  const fade = createSceneryFade();
  for (const masked of [false, true]) {
    const material = fade.patch(new THREE.MeshStandardMaterial(), masked);
    const shader = {uniforms: {}, vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader};
    material.onBeforeCompile(shader);
    assert.equal(shader.uniforms.uFadeStrength, (masked ? fade.buildingUniforms : fade.uniforms).uFadeStrength);
  }
  const profiles = {treeFadeAmount: 0.25, buildingFadeAmount: 0.75, treeFadeInSpeed: 1, treeFadeOutSpeed: 3, buildingFadeInSpeed: 0.25, buildingFadeOutSpeed: 0.5};
  fade.update(eye, boat, true, 3, 1, 0, true, 1, 1, 1, profiles);
  assert.equal(fade.uniforms.uFadeStrength.value, 0.25); assert.equal(fade.buildingUniforms.uFadeStrength.value, 0.75);
  assert.notEqual(fade.uniforms.uFadeEyes.value, fade.buildingUniforms.uFadeEyes.value);
  const treeHistory = fade.uniforms.uFadeEyes.value; const houseHistory = fade.buildingUniforms.uFadeEyes.value;
  fade.update(new THREE.Vector3(10, 6, 20), boat, true, 3, 1, 1 / 60, false, 1, 1, 1, profiles);
  assert.ok(treeHistory[0].x > houseHistory[0].x);
  assert.equal(fade.uniforms.uFadeEyes.value, treeHistory); assert.equal(fade.buildingUniforms.uFadeEyes.value, houseHistory);
  fade.update(eye, boat, false, 3, 1, 0, true, 1, 1, 1, profiles);
  assert.equal(fade.uniforms.uFadeEnabled.value, 0); assert.equal(fade.buildingUniforms.uFadeEnabled.value, 0);
});
test('zero strength keeps only the selected kind solid without weakening lens contact', () => {
  const preferences = {sceneryFading: true, sceneryFadeAmount: 1, treeFadeAmount: 0, buildingFadeAmount: 1};
  const mask = sceneryFadeMask(preferences, 'chase'); assert.equal(mask, 2);
  assert.equal(sceneryFadeMask(preferences, 'pilot'), 0);
  const target = {x: 0, y: 2, z: 0};
  for (const kind of ['tree', 'building']) {
    const box = {kind, minX: 4, maxX: 8, minZ: -3, maxZ: 3, bottom: 0, top: 20};
    assert.equal(clearCameraBounds({x: 20, y: 3, z: 0}, target, [box], 0.8, mask).x === 20, kind === 'building');
    assert.ok(clearCameraBounds({x: 7, y: 3, z: 0}, target, [box], 0.8, mask).x < 3.2);
  }
});
