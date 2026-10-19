import test from 'node:test';
import assert from 'node:assert/strict';
import {createVoyage, startFloodingDrill, tickVoyage, SERVICE_STATIONS} from '../src/voyage.js';
import {createState} from '../src/physics.js';
import {resetSinking} from '../src/sinking.js';
test('explicit drill enables sinking and prevents harbor repair cancelling the breach', () => {
  const settings = {sinkingMode: 'off', damageMode: 'arcade', fuelMode: 'off'}; const voyage = createVoyage();
  startFloodingDrill(settings, voyage); assert.equal(settings.sinkingMode, 'arcade');
  const state = {...createState(), ...SERVICE_STATIONS[0], y: 0, speed: 0};
  for (let tick = 0; tick < 1200; tick++) tickVoyage(voyage, state, {}, settings, 1 / 120, 0);
  assert.equal(voyage.hull, 0); assert.equal(voyage.servicing, false); assert.ok(voyage.flooding > 0);
  resetSinking(voyage); assert.equal(voyage.drill, false); assert.equal(voyage.flooding, 0);
});
