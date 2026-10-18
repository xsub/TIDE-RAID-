import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {harborLayout, reservedHarborSpace, resolveHarborCollision} from '../src/harbor-layout.js';
import {natureLayout} from '../src/nature.js';
import {createVessel, VESSEL_STYLES} from '../src/vessels.js';
import {channel, CHUNK_COUNT} from '../src/world.js';

test('villages are deterministic, inland and vegetation respects their clearings', () => {
  let villages = 0;
  let towers = 0;
  for (let index = 0; index < CHUNK_COUNT; index++) {
    const layout = harborLayout(index);
    assert.deepEqual(layout, harborLayout(index));
    if (layout.buildings.length) villages++;
    towers += layout.lighthouses.length;
    for (const house of layout.buildings) {
      const banks = channel(house.z);
      assert.ok(house.x + house.width / 2 < banks.left || house.x - house.width / 2 > banks.right);
    }
    for (const plant of natureLayout(index).trees.filter((item) => !item.island)) assert.equal(reservedHarborSpace(plant.x, plant.z, index), false);
    for (const dock of layout.docks) assert.ok(Math.abs(dock.x - channel(dock.z).center) > channel(dock.z).width - 20);
  }
  assert.ok(villages > 20 && towers > 10);
});

test('docks resolve impacts, including exact-center contact, while the main channel stays clear', () => {
  const dock = harborLayout(0).docks[0];
  const state = {x: dock.x, z: dock.z, vx: 30, vz: -10, collision: 0, speed: 0};
  assert.equal(resolveHarborCollision(state), true);
  assert.ok(Object.values(state).every(Number.isFinite));
  assert.equal(state.collision, 0.5);
  const center = {x: channel(dock.z).center, z: dock.z, vx: 0, vz: -30, collision: 0, speed: 30};
  assert.equal(resolveHarborCollision(center), false);
});

test('detailed vessel variants have finite geometry, smooth hulls and compact material batches', () => {
  for (const style of Object.values(VESSEL_STYLES)) {
    const vessel = createVessel(style);
    const bounds = new THREE.Box3().setFromObject(vessel);
    assert.ok(bounds.max.z - bounds.min.z > 7);
    if (style === 'sail') assert.ok(bounds.max.y > 13);
    assert.ok(vessel.children.length < 13);
    vessel.traverse((child) => {
      if (!child.isMesh) return;
      assert.ok(child.geometry.attributes.position.array.every(Number.isFinite));
      assert.ok(child.geometry.attributes.normal.array.every(Number.isFinite));
      assert.equal(child.material.flatShading, false);
      child.geometry.dispose(); child.material.dispose();
    });
  }
});
