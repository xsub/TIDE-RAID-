import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleWave, components, waveGLSL} from '../src/waves.js';
import {createState, step} from '../src/physics.js';
import {channel, chunkFeatures, resolveCollision, CHUNK_COUNT, CHUNK_SIZE, START_Z, END_Z} from '../src/world.js';

test('wave gradients and surface velocity match numerical derivatives', () => {
  const epsilon = 0.0001;
  for (const [x, z, time] of [[0, 0, 0], [125, -500, 3], [-600, -4500, 92]]) {
    const wave = sampleWave(x, z, time, 1.8);
    const dx = (sampleWave(x + epsilon, z, time, 1.8).h - sampleWave(x - epsilon, z, time, 1.8).h) / (2 * epsilon);
    const dz = (sampleWave(x, z + epsilon, time, 1.8).h - sampleWave(x, z - epsilon, time, 1.8).h) / (2 * epsilon);
    const dt = (sampleWave(x, z, time + epsilon, 1.8).h - sampleWave(x, z, time - epsilon, 1.8).h) / (2 * epsilon);
    assert.ok(Math.abs(wave.dx - dx) < 1e-7);
    assert.ok(Math.abs(wave.dz - dz) < 1e-7);
    assert.ok(Math.abs(wave.dt - dt) < 1e-7);
  }
  assert.deepEqual(sampleWave(300, 200, 10, 0), {h: 0, dx: 0, dz: 0, dt: 0});
  for (const component of components) for (const value of component) assert.ok(waveGLSL.includes(value.toFixed(6)));
});

test('entire river is deterministic, wide and has two passages around every island', () => {
  let originalArea = 0;
  let expandedArea = 0;
  for (let z = -600; z < 240; z++) originalArea += 86 + 26 * Math.sin(z * 0.009) + 16 * Math.sin(z * 0.027 + 1.2);
  for (let z = END_Z; z < START_Z; z++) expandedArea += channel(z).width * 2;
  assert.ok(expandedArea / originalArea > 99 && expandedArea / originalArea < 102);
  assert.equal(CHUNK_COUNT * CHUNK_SIZE, START_Z - END_Z);
  for (let index = 0; index < CHUNK_COUNT; index++) {
    assert.deepEqual(chunkFeatures(index), chunkFeatures(index));
    const nearby = [...chunkFeatures(index), ...(index + 1 < CHUNK_COUNT ? chunkFeatures(index + 1) : [])];
    for (const feature of chunkFeatures(index)) {
      const banks = channel(feature.z);
      assert.ok(feature.x - feature.radius - banks.left > 20);
      assert.ok(banks.right - feature.x - feature.radius > 20);
      for (const other of nearby) {
        if (other.x === feature.x && other.z === feature.z) continue;
        assert.ok(Math.hypot(feature.x - other.x, feature.z - other.z) > feature.radius + other.radius + 5.6);
      }
    }
  }
});

test('obstacle center and chunk seams resolve without NaN or penetration', () => {
  for (let index = 0; index < CHUNK_COUNT; index++) {
    for (const feature of chunkFeatures(index)) {
      const state = {x: feature.x, z: feature.z, vx: 10, vz: -20};
      assert.equal(resolveCollision(state), true);
      assert.ok(Math.hypot(state.x - feature.x, state.z - feature.z) >= feature.radius + 2.79);
      assert.ok(Object.values(state).every(Number.isFinite));
    }
    const z = START_Z - index * CHUNK_SIZE;
    assert.ok(Math.abs(channel(z - 0.001).left - channel(z + 0.001).left) < 0.01);
  }
});

test('hull stays finite and near the surface over prolonged calm and rough runs', () => {
  for (const swell of [0, 1, 2]) {
    const state = createState();
    for (let tick = 0; tick < 120 * 90; tick++) {
      step(state, {throttle: true, brake: false, turn: Math.sin(tick / 200) * 0.4, boost: tick > 1000}, 1 / 120, tick / 120, swell);
      assert.ok(Object.values(state).every(Number.isFinite));
      assert.ok(state.y > -6 && state.y < 30, `height ${state.y} at swell ${swell}`);
      assert.ok(state.speed < 100);
    }
    assert.ok(state.z < 100);
  }
});

test('right steering turns the bow and thrust right; rest settles at buoyant equilibrium', () => {
  const state = createState();
  for (let tick = 0; tick < 1200; tick++) step(state, {turn: 0}, 1 / 120, tick / 120, 0);
  assert.ok(Math.abs(state.vy) < 0.01);
  const startX = state.x;
  for (let tick = 0; tick < 480; tick++) step(state, {throttle: true, turn: tick > 180 ? 0.3 : 0}, 1 / 120, 10 + tick / 120, 0);
  assert.ok(state.heading < 0);
  assert.ok(state.x > startX + 3);
});
