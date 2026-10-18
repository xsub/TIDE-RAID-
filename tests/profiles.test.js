import test from 'node:test';
import assert from 'node:assert/strict';
import {VESSEL_PROFILES,propulsionAcceleration} from '../src/vessel-profiles.js';
import {createState,recover,step} from '../src/physics.js';
import {PLAYER_BOATS} from '../src/player-boats.js';
test('every vessel has finite distinct dimensions, mass and power',()=>{
  assert.deepEqual(Object.keys(VESSEL_PROFILES).sort(),PLAYER_BOATS.map((entry)=>entry.model).sort());
  for(const model of Object.keys(VESSEL_PROFILES))assert.ok(Object.values(createState(model)).every(Number.isFinite));
  assert.ok(createState('boat-house-a').length>createState().length);
  assert.ok(createState('boat-tug-a').power<createState().power/10);
});
test('power-limited thrust decreases with speed and reverse is weaker than forward',()=>{
  const body=createState();
  assert.ok(propulsionAcceleration(body,{throttle:true},60,1,1/120)<propulsionAcceleration(body,{throttle:true},10,1,1/120));
  const reverse=propulsionAcceleration(body,{reverse:true},0,1,1/120);
  assert.ok(reverse<0 && Math.abs(reverse)<propulsionAcceleration(body,{throttle:true},0,1,1/120));
});
test('every full-size player hull stays finite during propulsion, turning and reverse',()=>{
  for(const model of Object.keys(VESSEL_PROFILES)) {
    const body=createState(model);recover(body,0,1);
    for(let tick=1;tick<=2400;tick++) {
      step(body,{throttle:tick<1200,reverse:tick>=1200,turn:Math.sin(tick/150)*0.2},1/120,tick/120,1);
      assert.ok(Object.values(body).every(Number.isFinite));assert.ok(body.speed<100);
    }
  }
});
