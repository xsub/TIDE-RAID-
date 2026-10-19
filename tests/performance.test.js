import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createFrameStats} from '../src/performance.js';
import {createSpray} from '../src/spray.js';

test('frame statistics use real uncapped intervals, roll over and reset', () => {
  const stats = createFrameStats(4);
  assert.equal(stats.read().fps, 0);
  for (const value of [10, 10, 10, 10]) stats.sample(value);
  assert.equal(stats.read().fps, 100);
  stats.sample(100);
  assert.deepEqual(stats.read(), {fps: 1000 / 32.5, frameMs: 32.5, p95Ms: 100});
  for (const value of [0, -1, NaN, Infinity, 1001]) stats.sample(value);
  assert.equal(stats.read().p95Ms, 100);
  stats.reset();
  assert.equal(stats.read().fps, 0);
});

test('spray replays exactly after reset and stays bounded', () => {
  const previous = globalThis.devicePixelRatio;
  globalThis.devicePixelRatio = 1;
  try {
    const scene = new THREE.Scene();
    const spray = createSpray(scene);
    const state = {x: 0, z: 0, speed: 30, heading: 0.2, airtime: 0};
    function run() {
      for (let tick = 1; tick <= 240; tick++) spray.update({...state, z: -tick / 4}, tick / 120, 1 / 120, 1);
      return Object.fromEntries(Object.entries(scene.children[0].geometry.attributes).map(([name, attribute]) => [name, Array.from(attribute.array)]));
    }
    const first = run();
    spray.reset();
    assert.deepEqual(run(), first);
    assert.equal(first.aBirth.length, 384);
    scene.children[0].geometry.dispose();
    scene.children[0].material.dispose();
  } finally {
    if (previous === undefined) delete globalThis.devicePixelRatio;
    else globalThis.devicePixelRatio = previous;
  }
});

test('wake spray reuses the existing pool, emits once per event and resets deterministically', () => {
  const previous = globalThis.devicePixelRatio; globalThis.devicePixelRatio = 1;
  try {
    const scene = new THREE.Scene(); const spray = createSpray(scene); const geometry = scene.children[0].geometry;
    const state = {x: 0, z: 0, speed: 0, heading: 0, airtime: 0, beam: 3, length: 8, wakeEvent: 1, wakeImpact: 0.7, wakeSide: 1};
    spray.update(state, 1, 1 / 120, 2); const birth = geometry.attributes.aBirth.array; const positions = geometry.attributes.position.array;
    const first = positions.slice(); const count = [...birth].filter((time) => time === 1).length;
    assert.ok(count >= 12 && count <= 44); assert.equal(birth.length, 384);
    spray.update(state, 2, 1 / 120, 2); assert.equal([...birth].filter((time) => time === 2).length, 0);
    spray.reset(); spray.update(state, 1, 1 / 120, 2); assert.deepEqual(positions, first);
    spray.reset(); spray.update({...state, airtime: 1}, 1, 1 / 120, 2); assert.ok([...birth].every((time) => time === -100));
    spray.update(state, 2, 1 / 120, 2); assert.ok([...birth].every((time) => time === -100));
  } finally {if (previous === undefined) delete globalThis.devicePixelRatio; else globalThis.devicePixelRatio = previous;}
});
