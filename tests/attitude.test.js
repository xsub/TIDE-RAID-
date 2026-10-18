import test from 'node:test';
import assert from 'node:assert/strict';
import {dampedAttitude} from '../src/attitude.js';
import {createState,step,recover} from '../src/physics.js';
test('critical attitude damping converges without overshoot and is timestep consistent',()=>{
  let angle=0;let rate=0;
  for(let tick=0;tick<120;tick++){const next=dampedAttitude(angle,rate,0.3,5,1/120);assert.ok(next.angle>=angle && next.angle<0.3);angle=next.angle;rate=next.rate;}
  const exact=dampedAttitude(0,0,0.3,5,1);
  assert.ok(Math.abs(angle-exact.angle)<1e-12);assert.ok(Math.abs(rate-exact.rate)<1e-12);
});
test('landing energy scales with entry velocity squared and resets on rescue',()=>{
  function land(velocity){const body=createState();recover(body,0,0);body.y=0.5;body.vy=-velocity;body.airtime=0.3;step(body,{turn:0},1/120,0,0);return body;}
  const slow=land(2);const fast=land(4);
  assert.ok(slow.landingEnergy>0);assert.equal(fast.landingEnergy,slow.landingEnergy*4);
  recover(fast,0,0);assert.equal(fast.landingEnergy,0);assert.equal(fast.pitchRate,0);assert.equal(fast.rollRate,0);
});
