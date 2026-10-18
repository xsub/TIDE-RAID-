import test from 'node:test';
import assert from 'node:assert/strict';
import {createTraffic, updateTraffic, collideTraffic} from '../src/traffic.js';
import {createState} from '../src/physics.js';
import {channel, resolveCollision} from '../src/world.js';
import {capsulePair} from '../src/capsule.js';

test('traffic is deterministic, slower than the racer and stays clear of banks and obstacles', () => {
  const player = createState();
  const traffic = createTraffic(player);
  assert.deepEqual(traffic, createTraffic(player));
  assert.equal(traffic.boats.length, 18);
  assert.ok(new Set(traffic.boats.map((ship) => ship.model)).size >= 4);
  for (let tick = 0; tick < 3600; tick++) {
    player.z -= 35 / 60;
    player.x = channel(player.z).center;
    updateTraffic(traffic, player, 1 / 60);
    if (tick % 60 === 0) for (const ship of traffic.boats) {
      assert.ok([ship.x, ship.z, ship.vx, ship.vz, ship.heading].every(Number.isFinite));
      assert.ok(ship.speed < 20);
      const projected = {...ship};
      resolveCollision(projected, ship.radius);
      assert.ok(Math.hypot(projected.x - ship.x, projected.z - ship.z) < 0.00001);
    }
  }
  assert.ok(traffic.serial > 18);
  assert.equal(traffic.boats.length, 18);
});

test('boat impacts separate hulls without NaN, slow closing velocity and mark an unclean pass', () => {
  const player = createState();
  const ship = {...createTraffic(player).boats[0], x: player.x, z: player.z - 5, vz: -8, vx: 0};
  player.vz = -40;
  assert.equal(collideTraffic(player, ship), true);
  assert.equal(capsulePair(player,ship),null);
  assert.ok(player.vz > -40);
  assert.equal(ship.contacted, true);
  player.x = ship.x; player.z = ship.z;
  assert.equal(collideTraffic(player, ship), true);
  assert.ok(Number.isFinite(player.x));
});

test('a clean overtake counts once; a collided boat does not award a clean pass', () => {
  const player = {...createState(), z: 100, x: channel(100).center};
  const traffic = createTraffic(player, 1);
  const ship = traffic.boats[0];
  Object.assign(ship, {x: player.x + 30, z: 100, speed: 0, gap: 1, contacted: false, passed: false});
  player.z = 99;
  updateTraffic(traffic, player, 1 / 120);
  assert.equal(traffic.overtakes, 1);
  updateTraffic(traffic, player, 1 / 120);
  assert.equal(traffic.overtakes, 1);
  Object.assign(ship, {gap: 1, passed: false, contacted: true});
  updateTraffic(traffic, player, 1 / 120);
  assert.equal(traffic.overtakes, 1);
});
