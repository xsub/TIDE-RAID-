import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {setWavelength, getWavelength, waterMeshPolicy} from '../src/wave-settings.js';
import {sampleWave, components, waveGLSL} from '../src/waves.js';
import {sampleBoundary} from '../src/water-boundary.js';
import {channel} from '../src/world.js';
import {readPreferences, savePreferences} from '../src/preferences.js';
import {createWater} from '../src/scenery.js';

test('longer waves preserve amplitude coefficients and reduce open-water slope energy', () => {
  const z = -1500; const banks = channel(z);
  const x = Array.from({length: 80}, (_, index) => banks.left + (banks.right - banks.left) * index / 79).find((point) => sampleBoundary(point, z).distance > 30);
  const energy = (length) => {
    setWavelength(length); let height = 0; let slope = 0;
    for (let tick = 0; tick < 4000; tick++) {const wave = sampleWave(x, z, tick * 0.1 * Math.sqrt(length), 4); height += wave.h ** 2; slope += wave.dx ** 2 + wave.dz ** 2;}
    return {height, slope};
  };
  try {
    const short = energy(1); const broad = energy(3);
    assert.ok(broad.height / short.height > 0.85 && broad.height / short.height < 1.15);
    assert.ok(broad.slope < short.slope / 5);
    assert.equal(components[0][0], 0.22); assert.ok(waveGLSL.includes('uWavelength'));
  } finally {setWavelength(1);}
});

test('wave derivatives match finite differences at long wavelengths including shore reflections', () => {
  try {
    setWavelength(2.5); const x = channel(-3000).left + 8; const z = -3000; const time = 5; const epsilon = 0.00001;
    const wave = sampleWave(x, z, time, 4);
    const derivative = (axis) => {
      const before = [x, z, time]; const after = [x, z, time]; before[axis] -= epsilon; after[axis] += epsilon;
      return (sampleWave(...after, 4).h - sampleWave(...before, 4).h) / (epsilon * 2);
    };
    for (const [index, name] of ['dx', 'dz', 'dt'].entries()) assert.ok(Math.abs(wave[name] - derivative(index)) < 1e-5);
  } finally {setWavelength(1);}
});

test('water refinement is bounded, cached, reflected in GPU settings and relaxes for broad waves', () => {
  const scene = new THREE.Scene(); const water = createWater(scene); const tiles = scene.children[0].children;
  try {
    setWavelength(1); water.setDetail(100);
    water.update(0, 0, 1, 4, 0, 0, {baseSwell: 4});
    assert.equal(tiles[12].geometry.attributes.position.count, 257 ** 2);
    const geometry = tiles[12].geometry;
    water.update(0, 0, 2, 3.9, 0, 0, {baseSwell: 4}); assert.equal(tiles[12].geometry, geometry);
    setWavelength(2); water.update(0, 0, 3, 4, 0, 0, {baseSwell: 4});
    assert.equal(tiles[12].geometry.attributes.position.count, 129 ** 2);
    assert.equal(tiles[12].material.uniforms.uWavelength.value, 2);
    assert.equal(waterMeshPolicy(0, 4, 1).segments, 46);
    assert.equal(waterMeshPolicy(0, 2, 1).segments, 10);
  } finally {setWavelength(1);}
});

test('wavelength preference validates, persists and defaults to original waves', () => {
  assert.equal(readPreferences(undefined).wavelength, 1);
  assert.equal(readPreferences({getItem: () => JSON.stringify({wavelength: 9})}).wavelength, 1);
  let saved; const storage = {getItem: () => saved, setItem: (key, value) => {saved = value;}};
  savePreferences(storage, {...readPreferences(undefined), wavelength: 2.5}); assert.equal(readPreferences(storage).wavelength, 2.5);
  assert.equal(setWavelength(NaN), 1); assert.equal(getWavelength(), 1);
});
