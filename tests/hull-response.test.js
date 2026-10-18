import test from 'node:test';
import assert from 'node:assert/strict';
import {hullResponse} from '../src/hull-response.js';
import {createState, recover, step} from '../src/physics.js';
import {bodyInertia, contactImpulse} from '../src/collision.js';
import {applyRudder} from '../src/steering.js';
import {VESSEL_PROFILES} from '../src/vessel-profiles.js';
import {createTraffic} from '../src/traffic.js';
import {createReplayTape, runReplay} from '../src/replay.js';

test('hull shape and loading change support footprint, buoyancy and turn bank', () => {
  const sport = createState(); const cat = createState('boat-cat-42');
  sport.yawRate = -0.2; cat.yawRate = -0.2;
  const deepV = hullResponse(sport, 30); const twin = hullResponse(cat, 30);
  assert.ok(twin.contactWidth / cat.beam > deepV.contactWidth / sport.beam);
  assert.ok(Math.abs(twin.bank) < Math.abs(deepV.bank) / 2);
  const heavy = hullResponse({...sport, mass: sport.mass * 2}, 30);
  assert.equal(heavy.spring, deepV.spring / 2);
  assert.ok(heavy.pitchFrequency < deepV.pitchFrequency);
  assert.ok(hullResponse({...sport, foreLoad: 0.65}).foreLoad > deepV.foreLoad);
  assert.ok(hullResponse({...sport, cgHeight: 1.2}, 30).rollFrequency < deepV.rollFrequency);
});

test('mass-distribution yaw inertia consistently resists steering and contact impulses', () => {
  const light = {...createState(), yawInertiaFactor: 1};
  const distributed = {...light, yawInertiaFactor: 2};
  assert.equal(bodyInertia(distributed), bodyInertia(light) * 2);
  applyRudder(light, 1, 20, 1, 1 / 120); applyRudder(distributed, 1, 20, 1, 1 / 120);
  assert.ok(Math.abs(distributed.yawRate) < Math.abs(light.yawRate));
  for (const body of [light, distributed]) {body.vx = 10; body.vz = 0; body.yawRate = 0; contactImpulse(body, null, -1, 0, 0.1, 0, {x: body.x, z: body.z + 3});}
  assert.ok(Math.abs(distributed.yawRate) < Math.abs(light.yawRate));
});

test('every hull response remains stable in rough water and replays its fixed inputs exactly', () => {
  for (const model of Object.keys(VESSEL_PROFILES)) {
    const state = createState(model); recover(state, 0, 2);
    const traffic = createTraffic(state, 0); const tape = createReplayTape(state, traffic, 1200);
    let highest = -Infinity; let lowest = Infinity;
    for (let tick = 1; tick <= 1200; tick++) {
      const input = {throttle: true, turn: Math.sin(tick / 200) * 0.15};
      tape.record(input, tick / 120, 2);
      step(state, input, 1 / 120, tick / 120, 2);
      traffic.tick++;
      tape.seal(state, traffic);
      assert.ok(Object.values(state).every(Number.isFinite));
      assert.ok(Math.abs(state.roll) <= 0.4 && Math.abs(state.pitch) <= 0.45);
      highest = Math.max(highest, state.y); lowest = Math.min(lowest, state.y);
    }
    assert.ok(highest - lowest < 5, model);
    assert.deepEqual(runReplay(tape.export()), {state, traffic});
  }
});

test('previous-physics replay versions are rejected rather than silently replayed differently', () => {
  assert.throws(() => runReplay({version: 1, frames: []}), /Unsupported replay/);
});
