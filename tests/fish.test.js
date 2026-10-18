import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createFish} from '../src/fish.js';
import {waterDepth} from '../src/depth.js';
import {createState} from '../src/physics.js';

test('traffic changes fish poses without changing deterministic replay across update schedules', () => {
  const camera = new THREE.PerspectiveCamera(); const state = {...createState(), depthScale: 2};
  camera.position.set(state.x, -5, state.z);
  const group = new THREE.Group(); const fish = createFish(group); const mesh = group.children[0];
  fish.update(state, camera, 10);
  const matrix = new THREE.Matrix4(); mesh.getMatrixAt(0, matrix);
  const position = new THREE.Vector3().setFromMatrixPosition(matrix);
  const ships = [{x: position.x - 2, z: position.z, y: position.y, vx: 4, vz: 0, active: true}];
  fish.update(state, camera, 10.05, ships); const fleeing = mesh.instanceMatrix.array.slice();
  const otherGroup = new THREE.Group(); const other = createFish(otherGroup);
  other.update(state, camera, 10.051, ships);
  assert.deepEqual(otherGroup.children[0].instanceMatrix.array, fleeing);
  const calmGroup = new THREE.Group(); const calm = createFish(calmGroup);
  calm.update(state, camera, 10.05);
  assert.notDeepEqual(calmGroup.children[0].instanceMatrix.array, fleeing);
  assert.ok(mesh.count <= 48 && [...fleeing].every(Number.isFinite));
});

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
