import test from 'node:test';
import assert from 'node:assert/strict';
import {applyRudder} from '../src/steering.js';

const hull=(mass=1400)=>({mass,yawRate:0,length:7.4,beam:2.8});
test('rudder needs water flow and reverses torque in reverse',()=>{
  const stopped=hull();applyRudder(stopped,1,0,1,1/120);assert.equal(stopped.yawRate,0);
  const airborne=hull();applyRudder(airborne,1,30,0,1/120);assert.equal(airborne.yawRate,0);
  const forward=hull();const reverse=hull();
  applyRudder(forward,1,20,1,1/120);applyRudder(reverse,1,-20,1,1/120);
  assert.ok(forward.yawRate<0);assert.equal(forward.yawRate,-reverse.yawRate);
});
test('heavier hull resists rudder torque and release damps existing collision spin',()=>{
  const light=hull();const heavy=hull(4200);
  applyRudder(light,1,25,1,1/120);applyRudder(heavy,1,25,1,1/120);
  assert.ok(Math.abs(heavy.yawRate)<Math.abs(light.yawRate));
  const spinning={...hull(),yawRate:1};applyRudder(spinning,0,25,1,1);
  assert.ok(spinning.yawRate>0 && spinning.yawRate<0.1);
});
test('rudder integration is bounded and identical for identical inputs',()=>{
  function run(){const body=hull();for(let tick=0;tick<12000;tick++)applyRudder(body,Math.sin(tick/200),55,1,1/120);return body;}
  assert.deepEqual(run(),run());assert.ok(Math.abs(run().yawRate)<1);
});
