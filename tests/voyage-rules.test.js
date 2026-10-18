import test from 'node:test';
import assert from 'node:assert/strict';
import {createVoyage, applyVoyageRule, sinkingStatus, tickVoyage} from '../src/voyage.js';
import {createState, recover, step} from '../src/physics.js';
import {floodedHandling, settleFloodedHull} from '../src/sinking.js';
import {sampleWave} from '../src/waves.js';
import {propulsionResponse} from '../src/propulsion-response.js';

test('live voyage rule changes preserve hull, fuel and flooding unless explicitly disabled', () => {
  const voyage = createVoyage(); voyage.hull = 0.05; voyage.fuel = 0.4; voyage.flooding = 0.6; voyage.sinking.water.fill(0.6);
  const settings = {sinkingMode: 'arcade'};
  for (const [name, value] of [['damageMode', 'realistic'], ['fuelMode', 'realistic'], ['sinkingMode', 'realistic']]) {
    assert.equal(applyVoyageRule(settings, voyage, name, value), true);
    assert.equal(voyage.hull, 0.05); assert.equal(voyage.fuel, 0.4); assert.equal(voyage.flooding, 0.6);
  }
  assert.equal(applyVoyageRule(settings, voyage, 'sinkingMode', 'invalid'), false);
  applyVoyageRule(settings, voyage, 'sinkingMode', 'off'); assert.equal(voyage.flooding, 0); assert.equal(voyage.hull, 0.05);
  assert.match(sinkingStatus(voyage, 'off'), /SINKING OFF/);
  assert.match(sinkingStatus(voyage, 'realistic'), /BREACHED/);
});

test('current exploration propulsion and doubled swell still allow a damaged catamaran to sink', () => {
  const run = () => {
    const state = {...createState('boat-cat-42'), depthScale: 2}; recover(state, 0, 2);
    const voyage = createVoyage(); voyage.hull = 0.05;
    const rules = {damageMode: 'realistic', sinkingMode: 'realistic', fuelMode: 'off'};
    for (let tick = 1; tick <= 7200; tick++) {
      const dry = {mass: state.mass, draft: state.draft, cgHeight: state.cgHeight, power: state.power, planingTrim: state.planingTrim};
      const propulsion = propulsionResponse(state, {}); const flooded = floodedHandling(voyage, state);
      Object.assign(state, {mass: flooded.mass, draft: flooded.draft, cgHeight: flooded.cgHeight, power: dry.power * propulsion.power * flooded.power, planingTrim: propulsion.trim});
      step(state, {turn: 0}, 1 / 120, tick / 120, 2, null, flooded.buoyancy); Object.assign(state, dry);
      const surface = sampleWave(state.x, state.z, tick / 120, 2).h;
      tickVoyage(voyage, state, {}, rules, 1 / 120, surface); settleFloodedHull(state, voyage, surface, 1 / 120);
    }
    assert.equal(voyage.flooding, 1); assert.ok(state.y < -5); assert.match(sinkingStatus(voyage, 'realistic'), /FULLY FLOODED/);
    return {state, voyage};
  };
  assert.deepEqual(run(), run());
});
