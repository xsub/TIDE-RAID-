import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createFish} from '../src/fish.js';
import {waterDepth} from '../src/depth.js';
import {createState} from '../src/physics.js';

test('fish schools reuse a bounded deterministic instance buffer and remain above the bed', () => {
  const group = new THREE.Group(); const fish = createFish(group); const mesh = group.children[0];
  const camera = new THREE.PerspectiveCamera(); const state = {...createState(), depthScale: 2};
  camera.position.set(state.x, -5, state.z);
  fish.update(state, camera, 10);
  assert.ok(mesh.count > 0 && mesh.count <= 48);
  const buffer = mesh.instanceMatrix.array; const original = buffer.slice(); const version = mesh.instanceMatrix.version;
  fish.update(state, camera, 10.001); assert.equal(mesh.instanceMatrix.version, version);
  fish.update(state, camera, 20); fish.update(state, camera, 10);
  assert.equal(mesh.instanceMatrix.array, buffer); assert.deepEqual(buffer, original);
  const matrix = new THREE.Matrix4(); const position = new THREE.Vector3();
  for (let index = 0; index < mesh.count; index++) {
    mesh.getMatrixAt(index, matrix); position.setFromMatrixPosition(matrix);
    assert.ok(position.y >= -waterDepth(position.x, position.z, 2) + 0.79);
  }
  assert.ok([...buffer].every(Number.isFinite)); assert.equal(mesh.castShadow, false);
});
