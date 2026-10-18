import test from 'node:test';
import assert from 'node:assert/strict';
import {engineMix} from '../src/audio.js';

test('engine mix responds to load, boost and airborne revs while spray follows hull contact', () => {
  const idle = engineMix(0, false, false, false);
  const running = engineMix(45, true, false, false);
  const flying = engineMix(45, true, true, true);
  assert.ok(running.rpm > idle.rpm);
  assert.ok(running.cutoff > idle.cutoff);
  assert.ok(flying.rpm > running.rpm);
  assert.ok(flying.spray < running.spray);
  for (const speed of [-1, 0, 25, 100, 1000]) {
    const mix = engineMix(speed, true, false, true);
    assert.ok(Object.values(mix).every(Number.isFinite));
    assert.ok(mix.rpm <= 150);
    assert.ok(mix.motor < 0.15 && mix.spray < 0.1);
  }
});
