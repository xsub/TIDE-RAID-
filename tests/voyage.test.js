import test from 'node:test';
import assert from 'node:assert/strict';
import {createVoyage, tickVoyage, voyageDrive, SERVICE_STATIONS} from '../src/voyage.js';
import {createState} from '../src/physics.js';
import {readPreferences} from '../src/preferences.js';
import * as THREE from 'three';
import {createWearView} from '../src/voyage-view.js';
import {resolveHarborCollision} from '../src/harbor-layout.js';
import {channel, chunkFeatures, chunkIndex, CHUNK_COUNT} from '../src/world.js';
const rules = {damageMode: 'realistic', sinkingMode: 'realistic', fuelMode: 'realistic'};
const input = {throttle: true};

test('damage scales with energy and rules, ignores sustained contact and stays bounded', () => {
  const state = {...createState(), collision: 0.5, impactEnergy: 70000};
  const arcade = createVoyage(); const realistic = createVoyage();
  tickVoyage(arcade, state, input, {...rules, damageMode: 'arcade'}, 1 / 120);
  tickVoyage(realistic, state, input, rules, 1 / 120);
  assert.ok(realistic.hull < arcade.hull);
  const hull = realistic.hull;
  for (let frame = 0; frame < 50; frame++) tickVoyage(realistic, state, input, rules, 1 / 120);
  assert.equal(realistic.hull, hull);
  state.collision = 0; tickVoyage(realistic, state, input, rules, 1 / 120);
  state.collision = 1; state.impactEnergy = 1e9; tickVoyage(realistic, state, input, rules, 1 / 120);
  assert.equal(realistic.hull, 0);
});

test('optional sinking and fuel remain deterministic and bounded; no sinking stays afloat', () => {
  const run = () => {
    const voyage = createVoyage(); voyage.hull = 0;
    for (let frame = 0; frame < 4000; frame++) tickVoyage(voyage, {...createState(), y: 0}, input, rules, 1 / 120);
    return voyage;
  };
  assert.deepEqual(run(), run()); assert.equal(run().flooding, 1); assert.equal(voyageDrive(run()), false);
  const safe = createVoyage(); safe.hull = 0; safe.fuel = 0;
  tickVoyage(safe, createState(), input, {...rules, sinkingMode: 'off', fuelMode: 'off'}, 1);
  assert.equal(safe.flooding, 0); assert.equal(safe.fuel, 1);
  const arcade = createVoyage(); const realistic = createVoyage();
  for (let frame = 0; frame < 120; frame++) {
    tickVoyage(arcade, createState(), input, {...rules, fuelMode: 'arcade'}, 1 / 120);
    tickVoyage(realistic, createState(), input, rules, 1 / 120);
  }
  assert.ok(arcade.fuel < realistic.fuel && realistic.fuel < 1);
});

test('service stations repair and refuel only after a stopped, throttle-off mooring', () => {
  const state = {...createState(), ...SERVICE_STATIONS[0], speed: 0};
  const voyage = createVoyage(); voyage.hull = 0.2; voyage.fuel = 0.1; voyage.flooding = 0.2;
  tickVoyage(voyage, state, input, rules, 1); assert.equal(voyage.servicing, false);
  for (let frame = 0; frame < 1200; frame++) tickVoyage(voyage, state, {}, rules, 1 / 120);
  assert.equal(voyage.hull, 1); assert.equal(voyage.fuel, 1); assert.equal(voyage.flooding, 0);
  state.speed = 5; tickVoyage(voyage, state, {}, rules, 1 / 120); assert.equal(voyage.servicing, false);
});

test('voyage preferences validate and legacy saves use forgiving defaults', () => {
  const defaults = readPreferences(undefined);
  assert.equal(defaults.sinkingMode, 'off'); assert.equal(defaults.damageMode, 'arcade');
  const invalid = readPreferences({getItem: () => JSON.stringify({damageMode: 'bad', fuelMode: 4, sinkingMode: true})});
  assert.equal(invalid.damageMode, 'arcade'); assert.equal(invalid.fuelMode, 'arcade'); assert.equal(invalid.sinkingMode, 'off');
});

test('wear deforms only player-owned geometry and repairs restore the original', () => {
  const shared = new THREE.BoxGeometry(2, 1, 8);
  const original = shared.attributes.position.array.slice();
  const boat = new THREE.Group(); const mesh = new THREE.Mesh(shared, new THREE.MeshStandardMaterial()); boat.add(mesh);
  const view = createWearView(boat); const voyage = createVoyage(); voyage.hull = 0.1;
  view.update(voyage, createState(), true);
  assert.notDeepEqual(mesh.geometry.attributes.position.array, original);
  assert.deepEqual(shared.attributes.position.array, original);
  voyage.hull = 1; view.update(voyage, createState(), true);
  assert.deepEqual(mesh.geometry.attributes.position.array, original);
  assert.ok([...mesh.geometry.attributes.normal.array].every(Number.isFinite));
});

test('service pontoons are clear of obstacles and collide only in exploration', () => {
  for (const station of SERVICE_STATIONS) {
    const index = chunkIndex(station.z); const banks = channel(station.z);
    assert.ok(station.x > banks.left + 25 && station.x < banks.right - 25);
    const features = [index - 1, index, index + 1].filter((sector) => sector >= 0 && sector < CHUNK_COUNT).flatMap(chunkFeatures);
    assert.ok(features.every((feature) => Math.hypot(station.x - feature.x, station.z - feature.z) > feature.radius + 25));
  }
  const station = SERVICE_STATIONS[0];
  const state = {...createState(), x: station.x + 9, z: station.z, serviceDocks: 1};
  assert.equal(resolveHarborCollision(state), true);
});
