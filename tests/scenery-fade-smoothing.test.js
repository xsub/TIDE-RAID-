import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createSceneryFade, smoothFadeValue} from '../src/scenery-fade.js';

const boat = {x: 0, y: 1, z: 0};
const eye = new THREE.Vector3(0, 6, 20);
test('fade strength eases on/off and respects selected strength without reallocating buffers', () => {
  const fade = createSceneryFade(); fade.update(eye, boat, false, 3, 0.5, 1 / 60);
  const history = fade.uniforms.uFadeEyes.value; const first = history[0];
  fade.update(eye, boat, true, 3, 0.5, 1 / 60);
  assert.ok(fade.uniforms.uFadeStrength.value > 0 && fade.uniforms.uFadeStrength.value < 0.5);
  for (let frame = 0; frame < 120; frame++) fade.update(eye, boat, true, 3, 0.5, 1 / 60);
  assert.ok(Math.abs(fade.uniforms.uFadeStrength.value - 0.5) < 1e-6);
  fade.update(eye, boat, false, 3, 0.5, 1 / 60);
  assert.ok(fade.uniforms.uFadeStrength.value > 0.4);
  for (let frame = 0; frame < 120; frame++) fade.update(eye, boat, false, 3, 0.5, 1 / 60);
  assert.equal(fade.uniforms.uFadeEnabled.value, 0);
  assert.equal(fade.uniforms.uFadeEyes.value, history); assert.equal(history[0], first);
});
test('camera motion leaves a short continuous trail and camera cuts clear stale sightlines', () => {
  const fade = createSceneryFade(); fade.update(eye, boat, true, 3, 1, 1 / 60);
  const moved = new THREE.Vector3(10, 6, 20);
  fade.update(moved, boat, true, 3, 1, 1 / 60);
  const history = fade.uniforms.uFadeEyes.value;
  assert.ok(history[0].x < 10 && history[0].x > history[3].x && history[3].x > 0);
  fade.update(moved, boat, true, 3, 1, 1 / 60, true);
  for (const point of history) assert.deepEqual(point.toArray(), moved.toArray());
  fade.update(moved, boat, false, 3, 1, 1 / 60, true);
  assert.equal(fade.uniforms.uFadeEnabled.value, 0);
});
test('stationary-input damping is frame-rate independent and repeated motion is deterministic', () => {
  let fast = 0; let slow = 0;
  for (let frame = 0; frame < 60; frame++) fast = smoothFadeValue(fast, 1, 1 / 60);
  for (let frame = 0; frame < 30; frame++) slow = smoothFadeValue(slow, 1, 1 / 30);
  assert.ok(Math.abs(fast - slow) < 1e-12);
  const run = () => {
    const fade = createSceneryFade();
    for (let frame = 0; frame < 60; frame++) fade.update(new THREE.Vector3(frame, 6, 20), boat, true, 3, 0.75, 1 / 60);
    return fade.uniforms.uFadeEyes.value.map((point) => point.toArray());
  };
  assert.deepEqual(run(), run());
  assert.equal(smoothFadeValue(0.4, 1, 0), 0.4);
  assert.equal(smoothFadeValue(0.4, 1, -1), 0.4);
});
test('shader has bounded temporal taps and feathered end caps rather than hard plane steps', () => {
  const material = createSceneryFade().patch(new THREE.MeshStandardMaterial());
  const shader = {uniforms: {}, vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader};
  material.onBeforeCompile(shader);
  assert.match(shader.fragmentShader, /fadeIndex < 4/);
  assert.match(shader.fragmentShader, /float fadeCaps = smoothstep/);
  assert.doesNotMatch(shader.fragmentShader, /step\(0.0, fadeAlong\)/);
});
