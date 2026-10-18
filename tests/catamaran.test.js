import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCatamaran} from '../src/catamaran.js';
import {loadFleet} from '../src/fleet.js';
import {vesselProfile} from '../src/vessel-profiles.js';

test('catamaran has separate pointed bows, a low enclosed canopy and no antenna', () => {
  const model = createCatamaran();
  model.updateMatrixWorld(true);
  const ray = (position) => new THREE.Raycaster(new THREE.Vector3(...position), new THREE.Vector3(0, -1, 0)).intersectObject(model);
  assert.equal(ray([0, 4, -3.8]).length, 0);
  assert.ok(ray([-1.18, 4, -3.8]).length > 0);
  assert.ok(ray([1.18, 4, -3.8]).length > 0);
  const bounds = new THREE.Box3().setFromObject(model);
  assert.ok(bounds.max.y < 1.7);
  assert.ok(model.children.length <= 5);
  assert.equal(model.userData.helmEnclosed, true);
  model.traverse((child) => {
    if (!child.isMesh) return;
    assert.ok([...child.geometry.attributes.normal.array].every(Number.isFinite));
    child.geometry.dispose(); child.material.dispose();
  });
});

test('new racing catamaran loads at its handling profile length', async () => {
  const factory = await loadFleet();
  const model = factory('boat-cat-42', vesselProfile('boat-cat-42').length);
  const bounds = new THREE.Box3().setFromObject(model);
  assert.ok(Math.abs(bounds.max.z - bounds.min.z - 9.4) < 0.001);
});
