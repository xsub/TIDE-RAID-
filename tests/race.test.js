import test from 'node:test';
import assert from 'node:assert/strict';
import {createRace, gates, tickCountdown, updateRace, recoverRace, useBoost, readBest, saveBest, formatTime} from '../src/race.js';

test('countdown gates the clock and ordered checkpoints prevent shortcuts', () => {
  const race = createRace('countdown');
  tickCountdown(race, 2);
  assert.equal(race.phase, 'countdown');
  assert.equal(updateRace(race, {}, {}, 1), false);
  assert.equal(race.elapsed, 0);
  tickCountdown(race, 1);
  assert.equal(race.phase, 'racing');
  const last = gates.at(-1);
  updateRace(race, {x: last.x, z: last.z + 1}, {x: last.x, z: last.z - 1}, 1);
  assert.equal(race.next, 0);
  for (const gate of gates) updateRace(race, {x: gate.x, z: gate.z + 1, collision: 0}, {x: gate.x, z: gate.z - 1, collision: 0}, 20);
  assert.equal(race.phase, 'finished');
  assert.equal(race.result.medal, 'GOLD');
  const time = race.elapsed;
  updateRace(race, {}, {}, 10);
  assert.equal(race.elapsed, time);
});

test('missed gate needs recrossing and rescue moves behind it with a penalty', () => {
  const race = createRace('racing');
  const gate = gates[0];
  const state = {x: gate.x + gate.halfWidth + 10, z: gate.z - 10, collision: 0};
  updateRace(race, {...state, z: gate.z + 10}, state, 1);
  assert.equal(race.next, 0);
  recoverRace(race, state);
  assert.ok(state.z > gate.z);
  assert.equal(race.penalty, 5);
  assert.equal(state.x, gate.x + gate.halfWidth + 10);
});

test('impact penalties count once per contact and boost depletes/recharges', () => {
  const race = createRace('racing');
  const state = {x: 0, z: 0, collision: 0.5};
  updateRace(race, {...state, collision: 0}, state, 0.1);
  updateRace(race, state, state, 0.1);
  assert.equal(race.penalty, 2);
  for (let index = 0; index < 510; index++) useBoost(race, true, true, 1 / 120);
  assert.ok(race.boost < 0.01);
  assert.equal(race.boostLocked, true);
  assert.equal(useBoost(race, true, true, 1 / 120), false);
  for (let index = 0; index < 1200; index++) useBoost(race, false, true, 1 / 120);
  assert.ok(race.boost > 0.99);
  const charge = race.boost;
  assert.equal(useBoost(race, true, false, 0.1), false);
  assert.ok(race.boost >= charge);
});

test('personal best tolerates unavailable/corrupt storage and never overwrites faster time', () => {
  const store = new Map();
  const storage = {getItem: (key) => store.get(key), setItem: (key, value) => store.set(key, value)};
  assert.equal(readBest(storage), null);
  assert.deepEqual(saveBest(storage, 125), {best: 125, saved: true});
  assert.equal(saveBest(storage, 140).best, 125);
  assert.equal(saveBest(storage, 120).best, 120);
  assert.equal(readBest({getItem: () => '{invalid'}), null);
  assert.equal(saveBest({getItem() {throw Error();}, setItem() {throw Error();}}, 130).saved, false);
  assert.equal(formatTime(59.999), '1:00.00');
});
