import test from 'node:test';
import assert from 'node:assert/strict';
import {propulsionResponse} from '../src/propulsion-response.js';
import {createState} from '../src/physics.js';
test('propulsion loses grip airborne and trim follows throttle, planing and loading', () => {
  const state = {...createState(), speed: 30};
  const cruise = propulsionResponse(state, {throttle: true});
  assert.equal(cruise.power, 1);
  assert.ok(propulsionResponse({...state, airtime: 0.4}, {throttle: true}).power < 0.2);
  assert.ok(cruise.trim > propulsionResponse(state, {}).trim);
  assert.ok(cruise.trim > propulsionResponse({...state, speed: 0}, {throttle: true}).trim);
  assert.equal(state.planingTrim, 0.045);
});
