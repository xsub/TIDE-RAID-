import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createScenery} from '../src/scenery.js';

test('streaming enriched scenery retains shared assets and unloads old terrain/instances', () => {
  const scene = new THREE.Scene();
  const scenery = createScenery(scene);
  scenery.update(180, 0);
  let instance;
  let terrain;
  scene.children[0].traverse((child) => {
    if (child.isInstancedMesh && !instance) instance = child;
    else if (child.isMesh && !terrain) terrain = child;
  });
  let sharedDisposed = false;
  let instanceDisposed = false;
  let terrainDisposed = false;
  instance.geometry.addEventListener('dispose', () => {sharedDisposed = true;});
  instance.addEventListener('dispose', () => {instanceDisposed = true;});
  terrain.geometry.addEventListener('dispose', () => {terrainDisposed = true;});
  for (const z of [-1000, -4000, -8000, -12000, -18000, 180]) {
    const count = scenery.update(z, 10);
    assert.ok(count <= 7);
    assert.equal(scene.children.length, count);
  }
  assert.equal(instanceDisposed, true);
  assert.equal(terrainDisposed, true);
  assert.equal(sharedDisposed, false);
});
