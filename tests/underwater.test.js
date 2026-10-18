import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {underwaterBlend, underwaterAudio} from '../src/underwater-model.js';
import {createUnderwaterView} from '../src/underwater-view.js';

test('submersion follows actual eye depth, eases in/out and does not activate in other views', () => {
  assert.equal(underwaterBlend(0, -1, true, 1 / 60), 0);
  assert.equal(underwaterBlend(0, 3, false, 1 / 60), 0);
  let amount = 0;
  for (let frame = 0; frame < 120; frame++) amount = underwaterBlend(amount, 2, true, 1 / 60);
  assert.ok(amount > 0.99);
  for (let frame = 0; frame < 120; frame++) amount = underwaterBlend(amount, -1, true, 1 / 60);
  assert.ok(amount < 0.01);
  assert.ok(Number.isFinite(underwaterBlend(NaN, NaN, true, NaN)));
});

test('underwater sound progressively loses high frequencies and restores full mix on exit', () => {
  assert.deepEqual(underwaterAudio(0), {cutoff: 6500, gain: 1});
  assert.ok(Math.abs(underwaterAudio(1).cutoff - 420) < 1e-8);
  assert.equal(underwaterAudio(1).gain, 0.6);
  assert.ok(underwaterAudio(0.5).cutoff < underwaterAudio(0.2).cutoff);
  assert.deepEqual(underwaterAudio(NaN), underwaterAudio(0));
});

test('underwater bubble haze reuses one fixed buffer and hides when air runs out or eye surfaces', () => {
  const previous = globalThis.document;
  globalThis.document = {createElement: () => ({style: {}, setAttribute() {}})};
  try {
    const scene = new THREE.Scene(); const host = {append() {}};
    const view = createUnderwaterView(scene, host); const bubbles = scene.children[0];
    const vertices = bubbles.geometry.attributes.position.array;
    const camera = new THREE.PerspectiveCamera(); camera.position.set(0, -3, 0); camera.updateMatrixWorld();
    view.update(1, camera, 1, 0.5, 1);
    const first = vertices.slice(); view.update(1, camera, 1, 0.5, 1); assert.deepEqual(vertices, first);
    assert.equal(vertices.length, 48 * 3); assert.ok([...vertices].every(Number.isFinite));
    assert.equal(bubbles.geometry.attributes.position.array, vertices);
    view.update(2, camera, 0, 1, 1); assert.equal(bubbles.visible, false);
    view.update(2, camera, 1, 0, 1); assert.equal(bubbles.visible, false);
  } finally {if (previous === undefined) delete globalThis.document; else globalThis.document = previous;}
});
