import test from 'node:test';
import assert from 'node:assert/strict';
import {createReplayTape,runReplay,stateChecksum,finitePhysicsState} from '../src/replay.js';
import {createState,step} from '../src/physics.js';
import {createTraffic,updateTraffic,collideTraffic} from '../src/traffic.js';
test('recorded fixed-step physics and traffic replay exactly through checksum checkpoints',()=>{
  const state=createState();const traffic=createTraffic(state);
  const tape=createReplayTape(state,traffic);
  for(let tick=1;tick<=600;tick++) {
    const input={turn:Math.sin(tick/80)*0.3,throttle:true,boost:tick>300};
    tape.record(input,tick/120,1);
    step(state,input,1/120,tick/120,1,(body)=>{let hit=false;for(const ship of traffic.boats)hit=collideTraffic(body,ship)||hit;return hit;});
    updateTraffic(traffic,state,1/120);tape.seal(state,traffic);
  }
  const recording=JSON.parse(JSON.stringify(tape.export()));
  assert.deepEqual(runReplay(recording),{state,traffic});
  recording.frames[200][0]=1;
  assert.throws(()=>runReplay(recording),/checksum/);
});
test('replay storage is bounded and invalid state/input is rejected',()=>{
  const body=createState();const tape=createReplayTape(body,createTraffic(body),2);
  for(let index=0;index<3;index++)tape.record({turn:0},index/120,1);
  const recording=tape.export();assert.equal(recording.frames.length,2);assert.equal(recording.truncated,true);
  recording.frames[0][0]=Infinity;assert.throws(()=>runReplay(recording),/Invalid replay/);
  assert.equal(finitePhysicsState({...body,vx:NaN}),false);
  assert.equal(stateChecksum(body,{}),stateChecksum(body,{}));
});
