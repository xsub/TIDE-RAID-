import test from 'node:test';
import assert from 'node:assert/strict';
import {trafficIntent} from '../src/traffic-intent.js';
import {createTraffic,updateTraffic} from '../src/traffic.js';
import {createState} from '../src/physics.js';
import {capsulePair} from '../src/capsule.js';
test('following traffic brakes for predicted encounters but ignores distant vessels',()=>{
  const ship={x:0,z:0,vx:0,vz:-13,length:7.4,id:0};
  const ahead={x:0,z:-20,vx:0,vz:-6,length:12};
  const intent=trafficIntent(ship,[ship,ahead]);
  assert.ok(intent.speedFactor<1);assert.ok(intent.offset!==0);
  assert.deepEqual(trafficIntent(ship,[{...ahead,x:200}]),{speedFactor:1,offset:0});
  assert.deepEqual(trafficIntent(ship,[ahead]),intent);
});
test('traffic-to-traffic contacts separate without changing nominal cruise settings',()=>{
  const player=createState();player.x+=150;
  const traffic=createTraffic(player,2);const first=traffic.boats[0];const second=traffic.boats[1];
  Object.assign(second,{x:first.x,z:first.z+3});const cruise=first.speed;
  updateTraffic(traffic,player,1/120);
  assert.equal(capsulePair(first,second),null);assert.equal(first.speed,cruise);assert.equal(second.contacted,true);
});
