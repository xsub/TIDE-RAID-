import test from 'node:test';
import assert from 'node:assert/strict';
import {waterDepth,applyShallows} from '../src/depth.js';
import {createState} from '../src/physics.js';
import {channel} from '../src/world.js';
test('depth is deterministic, bounded and shallower near banks',()=>{
  const banks=channel(180);
  assert.ok(waterDepth(banks.left+5,180)<waterDepth(banks.center,180));
  assert.equal(waterDepth(banks.left+5,180),waterDepth(banks.left+5,180));
  assert.ok(waterDepth(banks.left-100,180)>=0.05);
});
test('ground friction only removes kinetic energy and deeper draft grounds sooner',()=>{
  const light=createState();const deep=createState('boat-tug-a');
  for(const body of [light,deep]){body.x=channel(180).left+8;body.heading=0;body.vx=5;body.vz=-10;applyShallows(body,1/120);assert.ok(body.vx**2+body.vz**2<=125);}
  assert.ok(deep.grounded>light.grounded);
});
test('grounding cannot reverse velocity or generate invalid state while stopped',()=>{
  const body=createState();body.x=channel(180).left+1;body.vx=0;body.vz=0;
  for(let tick=0;tick<1000;tick++)applyShallows(body,1/120);
  assert.equal(body.vx,0);assert.equal(body.vz,0);assert.ok(Object.values(body).every(Number.isFinite));
});
