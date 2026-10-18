import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {loadFleet} from '../src/fleet.js';
import {vesselProfile, propulsionAcceleration} from '../src/vessel-profiles.js';
import {VESSEL_MASS} from '../src/collision.js';

test('express cruisers have distinct dimensions, mass and propulsion response', () => {
  const fast = vesselProfile('boat-express-37'); const heavy = vesselProfile('boat-offshore-44');
  assert.ok(fast.length > vesselProfile('boat-speed-c').length);
  assert.ok(heavy.length > fast.length && heavy.mass > fast.mass && heavy.draft > fast.draft);
  assert.ok(heavy.yawInertiaFactor > fast.yawInertiaFactor);
  assert.ok(propulsionAcceleration(fast, {throttle: true}, 15, 1, 1 / 120) > propulsionAcceleration(heavy, {throttle: true}, 15, 1, 1 / 120));
  const terminal = (profile) => {
    let speed = 0;
    for (let tick = 0; tick < 120 * 180; tick++) speed += (propulsionAcceleration(profile, {throttle: true}, speed, 1, 1 / 120) - (0.125 + speed * profile.waterDrag) * speed) / 120;
    return speed;
  };
  const fastSpeed = terminal(fast); const heavySpeed = terminal(heavy);
  assert.ok(fastSpeed > heavySpeed && heavySpeed > fastSpeed * 0.75);
  assert.ok(heavySpeed > 20);
  assert.equal(VESSEL_MASS['boat-express-37'], fast.mass); assert.equal(VESSEL_MASS['boat-offshore-44'], heavy.mass);
});

test('both new cruisers fit their profiles and retain compact shared rendering batches', async () => {
  const factory = await loadFleet();
  for (const model of ['boat-express-37', 'boat-offshore-44']) {
    const profile = vesselProfile(model); const boat = factory(model, profile.length);
    const bounds = new THREE.Box3().setFromObject(boat);
    assert.ok(Math.abs(bounds.max.z - bounds.min.z - profile.length) < 0.001);
    assert.ok(Math.abs(bounds.max.x - bounds.min.x - profile.beam) < 0.35);
    let batches = 0;
    boat.traverse((child) => {if (child.isMesh) {batches++; assert.ok([...child.geometry.attributes.position.array].every(Number.isFinite));}});
    assert.ok(batches <= 10);
  }
});
