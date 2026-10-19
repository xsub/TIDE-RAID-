import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {mooredLayout, collideMooredBoats, MOORED_TYPES} from '../src/moored-boats.js';
import {createMooredView, MAX_MOORED_BOATS} from '../src/moored-view.js';
import {CHUNK_COUNT, channel} from '../src/world.js';
import {SERVICE_STATIONS} from '../src/voyage.js';
import {waterDepth} from '../src/depth.js';
import {createState} from '../src/physics.js';
import {rescueSite} from '../src/rescue-mission.js';

test('moored layouts are cached, bounded and leave channel and service approaches clear', () => {
  let total = 0;
  for (let index = 0; index < CHUNK_COUNT; index++) {
    const boats = mooredLayout(index); assert.equal(boats, mooredLayout(index)); assert.ok(boats.length <= 4); total += boats.length;
    for (const boat of boats) {
      assert.ok(Object.isFrozen(boat)); assert.ok(waterDepth(boat.x, boat.z) >= 2.5);
      const banks = channel(boat.z); assert.ok(Math.abs(boat.x - banks.center) >= banks.width * 0.55);
      assert.ok(SERVICE_STATIONS.every((station) => Math.hypot(boat.x - station.x, boat.z - station.z) >= 40));
      for (const other of boats) if (boat !== other) assert.ok(Math.hypot(boat.x - other.x, boat.z - other.z) >= 12);
    }
  }
  assert.ok(total > 20); assert.deepEqual(mooredLayout(-1), []);
});

test('moored boats use anchored capsule contacts without drifting or corrupting physics', () => {
  const boat = Array.from({length: CHUNK_COUNT}, (_, index) => mooredLayout(index)).flat()[0];
  const body = {...createState(), x: boat.x, z: boat.z, vx: 4, vz: 0}; const original = {...boat};
  assert.equal(collideMooredBoats(body), true); assert.deepEqual(boat, original); assert.ok(Object.values(body).every(Number.isFinite));
  assert.equal(collideMooredBoats({...body, x: channel(boat.z).center, z: boat.z}), false);
});

test('moored renderer bounds instances, shares assets and reuses buffers across time and travel', () => {
  const scene = new THREE.Scene(); const view = createMooredView(scene); let loads = 0;
  const geometry = new THREE.BoxGeometry(1, 1, 1); const material = new THREE.MeshStandardMaterial();
  view.setFactory(() => {loads++; const group = new THREE.Group(); group.add(new THREE.Mesh(geometry, material)); return group;});
  view.setFactory(() => {throw new Error('must reuse existing templates');});
  assert.equal(loads, MOORED_TYPES.length);
  const boat = Array.from({length: CHUNK_COUNT}, (_, index) => mooredLayout(index)).flat()[0];
  const player = {...createState(), x: boat.x, z: boat.z}; view.update(player, 1, 4, true);
  const group = scene.children[0]; const batches = group.children.filter((child) => child.isInstancedMesh && child.geometry === geometry);
  const buffers = batches.map((batch) => batch.instanceMatrix.array);
  const count = batches.reduce((sum, batch) => sum + batch.count, 0); assert.ok(count > 0 && count <= MAX_MOORED_BOATS);
  const matrices = buffers.map((buffer) => buffer.slice());
  view.update({...player, z: -5000}, 2, 4, true); view.update(player, 1, 4, true);
  batches.forEach((batch, index) => {assert.equal(batch.instanceMatrix.array, buffers[index]); assert.deepEqual(buffers[index], matrices[index]); assert.equal(batch.material, material); assert.ok(batch.count <= 6);});
  assert.ok(group.children.every((child) => !child.isLight && !child.castShadow));
  view.update(player, 3, 4, false); assert.equal(group.visible, false);
});

test('rescue placement avoids existing marina boats', () => {
  for (const z of [100, -1000, -5000]) {
    const state = {...createState(), z, x: channel(z).center}; const site = rescueSite(state); assert.ok(site);
    for (let index = 0; index < CHUNK_COUNT; index++) for (const boat of mooredLayout(index)) assert.ok(Math.hypot(site.x - boat.x, site.z - boat.z) > 15 + boat.length / 2);
  }
});
