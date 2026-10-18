import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createUnderwaterParticles} from '../src/underwater-particles.js';
test('sediment remains bounded, deterministic, submerged and reuses its one batch', () => {
  const scene = new THREE.Scene(); const particles = createUnderwaterParticles(scene); const mesh = scene.children[0];
  const camera = new THREE.PerspectiveCamera(); camera.position.set(100, -15, -200);
  const buffer = mesh.geometry.attributes.position.array;
  particles.update(20, camera, 1, 1); const position = mesh.position.clone();
  particles.update(30, camera, 1, 0); particles.update(20, camera, 1, 1);
  assert.deepEqual(mesh.position, position); assert.equal(mesh.geometry.attributes.position.array, buffer);
  assert.equal(buffer.length, 384); assert.ok([...buffer].every(Number.isFinite));
  assert.ok(mesh.position.y + 10 < 0);
  particles.update(20, camera, 0, 1); assert.equal(mesh.visible, false);
});
