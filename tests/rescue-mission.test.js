import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createActivity, tickActivity, activityTarget, activityText} from '../src/coastal-activity.js';
import {rescueSite, collideRescueBoat} from '../src/rescue-mission.js';
import {createRescueView} from '../src/rescue-view.js';
import {createState} from '../src/physics.js';
import {channel, chunkFeatures, chunkIndex, CHUNK_COUNT} from '../src/world.js';
import {waterDepth} from '../src/depth.js';
import {SERVICE_STATIONS} from '../src/voyage.js';

test('rescue sites repeat and clear terrain obstacles across the coast', () => {
  for (const z of [100, -1000, -5000, -10000, -17000]) {
    const state = {...createState('boat-offshore-44'), x: channel(z).center, z, depthScale: 2};
    const site = rescueSite(state); assert.ok(site); assert.deepEqual(site, rescueSite(state));
    assert.ok(waterDepth(site.x, site.z, state.depthScale) >= 3);
    const sector = chunkIndex(site.z);
    for (let index = Math.max(0, sector - 1); index <= Math.min(CHUNK_COUNT - 1, sector + 1); index++) for (const feature of chunkFeatures(index)) assert.ok(Math.hypot(site.x - feature.x, site.z - feature.z) >= feature.radius + 15);
    assert.ok(SERVICE_STATIONS.every((station) => Math.hypot(site.x - station.x, site.z - station.z) >= 50));
  }
});

test('rescue requires assistance before return, safe holds and one-time scoring', () => {
  const state = createState(); const mission = createActivity('rescue', state);
  assert.equal(mission.phase, 'assist'); const boat = {...mission.rescueBoat};
  const harbor = SERVICE_STATIONS[mission.target]; Object.assign(state, harbor, {speed: 0, collision: 0});
  tickActivity(mission, state, 5); assert.equal(mission.phase, 'assist');
  Object.assign(state, {x: boat.x + 9, z: boat.z});
  tickActivity(mission, state, 2); assert.equal(mission.hold, 2);
  tickActivity(mission, state, 1, true); assert.equal(mission.hold, 0);
  tickActivity(mission, {...state, speed: 2}, 5); assert.equal(mission.phase, 'assist');
  tickActivity(mission, {...state, collision: 0.5}, 5); assert.equal(mission.hold, 0);
  tickActivity(mission, state, 4); assert.equal(mission.phase, 'return'); assert.equal(mission.helped, true);
  assert.equal(activityTarget(mission), harbor); assert.match(activityText(mission, state), /CREW ABOARD/);
  tickActivity(mission, state, 10); assert.equal(mission.phase, 'return');
  Object.assign(state, harbor); tickActivity(mission, state, 2); assert.equal(mission.phase, 'done');
  const result = structuredClone(mission); tickActivity(mission, state, 60); assert.deepEqual(mission, result);
  assert.match(activityText(mission, state), /CREW SAFE AT HARBOR/); assert.deepEqual(mission.rescueBoat, boat);
});

test('rescue fixed-step progression is deterministic and ignores invalid elapsed time', () => {
  const run = () => {
    const state = createState(); const mission = createActivity('rescue', state);
    Object.assign(state, {x: mission.rescueBoat.x + 9, z: mission.rescueBoat.z, speed: 0, collision: 0});
    const before = structuredClone(mission); tickActivity(mission, state, NaN); assert.deepEqual(mission, before);
    for (let tick = 0; tick < 481; tick++) tickActivity(mission, state, 1 / 120);
    assert.equal(mission.phase, 'return'); Object.assign(state, SERVICE_STATIONS[mission.target]);
    for (let tick = 0; tick < 241; tick++) tickActivity(mission, state, 1 / 120);
    assert.equal(mission.phase, 'done'); return mission;
  };
  assert.deepEqual(run(), run());
});

test('an impossible draft fails safely without a target or mission progress', () => {
  const state = {...createState(), draft: 100}; const mission = createActivity('rescue', state);
  assert.equal(mission.phase, 'off'); assert.equal(mission.rescueBoat, undefined);
  assert.match(activityText(mission, state), /NO SAFE RESCUE SITE/);
  tickActivity(mission, state, 10); assert.equal(mission.elapsed, 0);
});

test('anchored rescue capsule resolves impacts and disappears after completion', () => {
  const player = createState(); const mission = createActivity('rescue', player);
  Object.assign(player, {x: mission.rescueBoat.x, z: mission.rescueBoat.z, vx: 4, vz: 0});
  const boat = {...mission.rescueBoat}; assert.equal(collideRescueBoat(player, mission), true);
  assert.ok(Object.values(player).every(Number.isFinite)); assert.deepEqual(mission.rescueBoat, boat);
  mission.phase = 'done'; assert.equal(collideRescueBoat(player, mission), false);
});

test('rescue view reuses one hull and two lamps without adding lights', () => {
  const scene = new THREE.Scene(); const view = createRescueView(scene); let loads = 0;
  const factory = () => {loads++; return new THREE.Group();}; view.setFactory(factory); view.setFactory(factory);
  const player = createState(); const mission = createActivity('rescue', player); const group = scene.children[0];
  const hull = group.children[2]; view.update(mission, player, 2, 4, true); assert.equal(group.visible, true);
  mission.helped = true; mission.phase = 'return'; view.update(mission, player, 3, 4, true);
  assert.equal(loads, 1); assert.equal(group.children[2], hull); assert.equal(group.children.length, 3);
  assert.ok(group.children.slice(0, 2).every((lamp) => lamp.visible));
  mission.phase = 'done'; view.update(mission, player, 4, 4, true); assert.equal(group.visible, false);
  assert.ok(scene.children.every((child) => !child.isLight));
});
