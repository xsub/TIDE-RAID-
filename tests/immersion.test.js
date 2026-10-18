import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {immersionStep} from '../src/immersion.js';
import {createSeagrass} from '../src/seagrass.js';

test('waterline veil triggers once per crossing and rejects surface chatter', () => {
  let state = immersionStep(undefined, -1, 0);
  assert.equal(state.pulse, 0);
  state = immersionStep(state, 0.2, 0.016);
  assert.equal(state.pulse, 1); assert.equal(state.submerged, true);
  for (let frame = 0; frame < 60; frame++) state = immersionStep(state, frame % 2 ? -0.1 : 0.1, 1 / 60);
  assert.equal(state.pulse, 0); assert.equal(state.submerged, true);
  state = immersionStep(state, -0.2, 0.016);
  assert.equal(state.pulse, 1); assert.equal(state.submerged, false);
  assert.ok(Number.isFinite(immersionStep(state, NaN, NaN).pulse));
});

test('seagrass is deterministic, bounded, finite and reuses its instanced buffers', () => {
  const group = new THREE.Group(); const grass = createSeagrass(group); const mesh = group.children[0];
  grass.rebuild(0, 0, 2);
  assert.ok(mesh.count > 0 && mesh.count <= 1536);
  const buffer = mesh.instanceMatrix.array; const original = buffer.slice();
  grass.animate(20); assert.deepEqual(buffer, original);
  grass.rebuild(2, 1, 2); grass.rebuild(0, 0, 2);
  assert.equal(mesh.instanceMatrix.array, buffer); assert.deepEqual(buffer, original);
  assert.ok([...buffer].every(Number.isFinite));
  assert.equal(mesh.castShadow, false); assert.equal(mesh.geometry.attributes.position.count, 10);
});
