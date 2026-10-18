import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createVoyage, tickVoyage} from '../src/voyage.js';
import {tickSinking, resetSinking, floodedHandling, settleFloodedHull, leakRate} from '../src/sinking.js';
import {createState, recover, step} from '../src/physics.js';
import {VESSEL_PROFILES} from '../src/vessel-profiles.js';
import {sampleWave} from '../src/waves.js';
import {createSinkingBubbles} from '../src/sinking-bubbles.js';

test('leak rate scales with damage, submersion and water speed, not a fixed sinking timer', () => {
  const state = {...createState(), speed: 0};
  for (const mode of ['arcade', 'realistic']) {
    const threshold = mode === 'arcade' ? 0.12 : 0.3;
    const mild = leakRate(threshold * 0.8, 0.6, 0, state, mode);
    const severe = leakRate(threshold * 0.2, 0.6, 0, state, mode);
    assert.ok(severe > mild * 2);
    assert.ok(leakRate(0, 1.2, 0, state, mode) > leakRate(0, 0.3, 0, state, mode));
    assert.ok(leakRate(0, 0.6, 0, {...state, speed: 30}, mode) > leakRate(0, 0.6, 0, state, mode));
    assert.equal(leakRate(0, 0, 0, {...state, speed: 60}, mode), 0);
    assert.equal(leakRate(1, 1, 0, state, mode), 0);
    assert.ok(leakRate(0, 0.6, 0.8, state, mode) < leakRate(0, 0.6, 0, state, mode));
  }
});

test('critical flooding reaches engine cutoff sooner with worse damage in both modes', () => {
  const state = {...createState(), y: 0};
  const cutoff = (mode, hull) => {
    const voyage = createVoyage(); voyage.hull = hull;
    for (let tick = 0; tick < 120000; tick++) {
      tickSinking(voyage, state, mode, 1 / 120);
      if (voyage.flooding >= 0.75) return tick / 120;
    }
    return Infinity;
  };
  assert.ok(cutoff('realistic', 0.02) < cutoff('realistic', 0.2));
  assert.ok(cutoff('arcade', 0.01) < cutoff('arcade', 0.08));
});

test('four compartments flood unevenly under pressure and do not magically drain after damage stops', () => {
  const voyage = createVoyage(); voyage.hull = 0.05;
  const state = {...createState(), y: 0};
  for (let index = 0; index < 120; index++) tickSinking(voyage, state, 'realistic', 1 / 120);
  assert.ok(voyage.sinking.water[2] > voyage.sinking.water[1]);
  assert.ok(voyage.sinking.list > 0 && voyage.sinking.trim > 0);
  const flood = voyage.flooding; voyage.hull = 1;
  tickSinking(voyage, state, 'realistic', 1);
  assert.equal(voyage.flooding, flood);
  const afloat = createVoyage(); afloat.hull = 0;
  tickSinking(afloat, {...state, y: 10}, 'realistic', 1); assert.equal(afloat.flooding, 0);
  tickSinking(voyage, state, 'off', 1); assert.equal(voyage.flooding, 0); assert.deepEqual(voyage.sinking.water, [0, 0, 0, 0]);
});

test('every hull floods, loses flotation and settles within bounded depth deterministically', () => {
  function run(model) {
    const state = createState(model); recover(state, 0, 1);
    const voyage = createVoyage(); voyage.hull = 0;
    for (let tick = 1; tick <= 6000; tick++) {
      const flooded = floodedHandling(voyage, state);
      const dryMass = state.mass; const dryDraft = state.draft; const dryCG = state.cgHeight;
      state.mass = flooded.mass; state.draft = flooded.draft; state.cgHeight = flooded.cgHeight;
      step(state, {turn: 0}, 1 / 120, tick / 120, 1, null, flooded.buoyancy);
      state.mass = dryMass; state.draft = dryDraft; state.cgHeight = dryCG;
      const surface = sampleWave(state.x, state.z, tick / 120, 1).h;
      tickVoyage(voyage, state, {}, {damageMode: 'realistic', fuelMode: 'off', sinkingMode: 'realistic'}, 1 / 120, surface);
      settleFloodedHull(state, voyage, surface, 1 / 120);
      assert.ok(Object.values(state).every(Number.isFinite));
      assert.ok(state.y >= -Math.min(80, state.depth) - 1e-8);
    }
    assert.equal(voyage.flooding, 1); assert.ok(state.y < -1, model);
    assert.equal(floodedHandling(voyage, state).power, 0);
    return {state, voyage};
  }
  for (const model of Object.keys(VESSEL_PROFILES)) run(model);
  assert.deepEqual(run('boat-speed-c'), run('boat-speed-c'));
});

test('air bubbles use a bounded reusable pool, rise/pop, replay and reset', () => {
  const scene = new THREE.Scene(); const bubbles = createSinkingBubbles(scene);
  const mesh = scene.children[0]; const positions = mesh.geometry.attributes.position.array;
  const voyage = createVoyage(); voyage.flooding = 0.6;
  const state = {...createState(), y: -1};
  const run = () => {
    for (let tick = 1; tick <= 240; tick++) bubbles.update(state, voyage, 1 / 120, tick / 120, 1, true);
    return positions.slice();
  };
  const first = run(); assert.ok(mesh.geometry.attributes.bubbleAlpha.array.some((alpha) => alpha > 0));
  assert.equal(positions.length, 192 * 3); assert.equal(mesh.geometry.attributes.position.array, positions);
  assert.ok([...positions].every(Number.isFinite));
  bubbles.reset(); assert.ok(mesh.geometry.attributes.bubbleAlpha.array.every((alpha) => alpha === 0));
  assert.deepEqual(run(), first);
  resetSinking(voyage); assert.equal(voyage.flooding, 0);
  bubbles.reset(); bubbles.update(state, voyage, 1 / 120, 3, 1, false); assert.equal(mesh.visible, false);
});
