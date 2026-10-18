import test from 'node:test';
import assert from 'node:assert/strict';
import {landingSound} from '../src/landing-sound.js';

test('water landings suppress tiny contacts and scale short, quiet splashes with energy', () => {
  assert.equal(landingSound(0).gain, 0);
  assert.equal(landingSound(79).gain, 0);
  assert.deepEqual(landingSound(NaN), landingSound(0));
  let previous = 0;
  for (const energy of [100, 1000, 10000, 1e9]) {
    const mix = landingSound(energy, 70);
    assert.ok(mix.gain >= previous && mix.gain <= 0.045);
    assert.ok(mix.duration <= 0.44 && mix.duration >= 0.16);
    assert.ok(Object.values(mix).every(Number.isFinite));
    previous = mix.gain;
  }
  assert.ok(landingSound(5000, 50).duration > landingSound(5000, 0).duration);
});
