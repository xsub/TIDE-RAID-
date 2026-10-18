import test from 'node:test';
import assert from 'node:assert/strict';
import {setHarborShelter, harborWater} from '../src/harbor-water.js';
import {SERVICE_STATIONS} from '../src/voyage.js';
import {sampleWave} from '../src/waves.js';
test('harbors smoothly shelter shared wave heights and retain analytic slopes', () => {
  const station = SERVICE_STATIONS[0]; setHarborShelter(false);
  const open = sampleWave(station.x, station.z, 2, 2);
  setHarborShelter(true);
  try {
    assert.equal(harborWater(station.x, station.z).scale, 0.3);
    assert.ok(Math.abs(sampleWave(station.x, station.z, 2, 2).h - open.h * 0.3) < 1e-9);
    const x = station.x + 20; const epsilon = 0.001;
    const derivative = (sampleWave(x + epsilon, station.z, 2, 2).h - sampleWave(x - epsilon, station.z, 2, 2).h) / (2 * epsilon);
    assert.ok(Math.abs(derivative - sampleWave(x, station.z, 2, 2).dx) < 0.002);
  } finally {setHarborShelter(false);}
  assert.equal(harborWater(station.x, station.z).scale, 1);
});
