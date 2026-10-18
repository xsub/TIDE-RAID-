import test from 'node:test';
import assert from 'node:assert/strict';
import {CARGO, SLOTS, createCargoGame, cargoBalance, seaState, moveCargo, unloadCargo, undoCargo, startCrossing, tickCargo} from '../src/cargo-model.js';

function loadedGame() {
  const game = createCargoGame();
  for (let index = 0; index < 12; index++) moveCargo(game, index, index * 2);
  for (let index = 12; index < 18; index++) moveCargo(game, index, (index - 12) * 2 + 1);
  return game;
}
test('loading enforces support, unique cargo, unblocked lifting and reversible moves', () => {
  const game = createCargoGame();
  assert.equal(moveCargo(game, 0, 1), false);
  assert.equal(moveCargo(game, 0, 0), true); assert.equal(moveCargo(game, 1, 1), true);
  assert.equal(moveCargo(game, 0, 2), false); assert.equal(unloadCargo(game, 0), false);
  assert.equal(unloadCargo(game, 1), true); assert.equal(moveCargo(game, 0, 2), true);
  assert.equal(game.board.filter((id) => id === 0).length, 1);
  assert.equal(undoCargo(game), true); assert.equal(game.board[0], 0);
  for (const [id, target] of [[-1, 0], [99, 0], [2, -1], [2, 24], [NaN, 2]]) assert.equal(moveCargo(game, id, target), false);
  assert.equal(startCrossing(game), false);
});
test('top-heavy and asymmetric plans reduce margin and create list/trim', () => {
  const low = Array(24).fill(null); const high = Array(24).fill(null);
  low[0] = 0; high[1] = 0;
  assert.ok(cargoBalance(high).gm < cargoBalance(low).gm);
  assert.ok(cargoBalance(low).list < 0); assert.ok(cargoBalance(low).trim < 0);
  const mirrored = Array(24).fill(null); mirrored[4] = 0;
  assert.equal(cargoBalance(mirrored).list, -cargoBalance(low).list);
});
test('three-second sea moves need a crane window, support and a move budget', () => {
  const game = loadedGame(); assert.equal(startCrossing(game), true);
  assert.equal(moveCargo(game, 12, 13), false);
  game.time = 23; assert.equal(moveCargo(game, 12, 13), true);
  assert.equal(game.board[1], 12); assert.equal(game.moves, 3);
  assert.equal(moveCargo(game, 13, 15), false);
  for (let index = 0; index < 361; index++) tickCargo(game, 1 / 120);
  assert.equal(game.pending, null); assert.equal(game.board[13], 12); assert.equal(game.board[1], null);
  game.time = 53; game.roll = 0.4; assert.equal(moveCargo(game, 13, 15), false);
});
test('crossing runs deterministically through changing seas and reaches a terminal state', () => {
  const run = () => {
    const game = loadedGame(); startCrossing(game);
    for (let tick = 0; tick < 11000; tick++) tickCargo(game, 1 / 120);
    return game;
  };
  assert.deepEqual(run(), run()); assert.equal(run().phase, 'arrived');
  assert.equal(run().time, 90); assert.ok(run().integrity > 0.5);
  assert.ok(seaState(65).amplitude > seaState(35).amplitude); assert.ok(seaState(35).amplitude > seaState(0).amplitude);
  assert.equal(seaState(23).crane, true); assert.equal(seaState(31).crane, false);
  const game = run(); const time = game.time; tickCargo(game, 1 / 120); assert.equal(game.time, time);
});
test('unsafe loading causes more heel and damage and can fail without producing invalid numbers', () => {
  const game = createCargoGame();
  const available = SLOTS.map((slot, index) => ({...slot, index})).sort((first, second) => first.column - second.column || first.tier - second.tier);
  for (let index = 0; index < CARGO.length; index++) moveCargo(game, index, available[index].index);
  assert.equal(startCrossing(game), true);
  for (let tick = 0; tick < 11000; tick++) tickCargo(game, 1 / 120);
  assert.ok(game.peakRoll > 0.35); assert.ok(game.integrity < 1);
  assert.ok([game.roll, game.rollRate, game.pitch, game.time, game.integrity].every(Number.isFinite));
});

test('failure is terminal, invalid time steps cannot advance, and crane budget cannot be bypassed', () => {
  const game = loadedGame(); startCrossing(game); game.time = 23; game.moves = 0;
  assert.equal(moveCargo(game, 12, 13), false);
  const time = game.time; tickCargo(game, Infinity); tickCargo(game, -1); tickCargo(game, 1);
  assert.equal(game.time, time);
  game.roll = 1.1; game.integrity = 0.00001; tickCargo(game, 1 / 120);
  assert.equal(game.phase, 'failed'); const snapshot = structuredClone(game); tickCargo(game, 1 / 120); assert.deepEqual(game, snapshot);
});

test('departure rejects duplicate cargo and unsupported stacks', () => {
  const duplicate = loadedGame(); duplicate.board[0] = duplicate.board[2]; assert.equal(startCrossing(duplicate), false);
  const unsupported = loadedGame(); unsupported.board[12] = null; unsupported.board[13] = 6; assert.equal(startCrossing(unsupported), false);
});
