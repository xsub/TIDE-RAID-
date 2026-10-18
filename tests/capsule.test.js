import test from 'node:test';
import assert from 'node:assert/strict';
import {capsulePair,capsuleCircle,capsuleBox} from '../src/capsule.js';
import {collideTraffic,createTraffic,updateTraffic} from '../src/traffic.js';
import {createState,step,recover} from '../src/physics.js';

const hull=(x=0,z=0,heading=0) => ({x,z,heading,length:7.4,beam:2.8,vx:0,vz:0,mass:1400,yawRate:0,active:true});

test('capsules distinguish bow reach and narrow side clearance at every orientation', () => {
  const first=hull();
  assert.equal(capsulePair(first,hull(3,0)),null);
  assert.ok(capsulePair(first,hull(0,7)));
  assert.equal(capsulePair(first,hull(0,7.5)),null);
  assert.ok(capsulePair(first,hull(3,0,Math.PI/2)));
  assert.ok(capsuleCircle(first,{x:0,z:-4,radius:0.5}));
  assert.equal(capsuleCircle(first,{x:2,z:0,radius:0.5}),null);
});

test('capsule pairs separate deterministically including parallel, crossed and coincident spines', () => {
  for(const heading of [0,0.1,Math.PI/2,Math.PI]) for(const position of [[0,0],[0,2],[1,1],[2.6,0]]) {
    const first=hull(); const second=hull(...position,heading);
    const before=capsulePair(first,second);
    if(!before) continue;
    assert.ok(Object.values(before).every(Number.isFinite));
    assert.equal(collideTraffic(first,second),true);
    assert.equal(capsulePair(first,second),null,JSON.stringify({heading,position}));
    assert.ok([first.x,first.z,second.x,second.z,first.yawRate,second.yawRate].every(Number.isFinite));
  }
});

test('capsule-circle correction clears bow, sides and exact-centre overlap', () => {
  for(let index=0;index<100;index++) {
    const vessel=hull(Math.sin(index)*2,Math.cos(index)*2,index*0.37);
    const obstacle={x:0,z:0,radius:5};
    const contact=capsuleCircle(vessel,obstacle);
    if(!contact) continue;
    vessel.x+=contact.normalX*(contact.depth+1e-6);
    vessel.z+=contact.normalZ*(contact.depth+1e-6);
    assert.equal(capsuleCircle(vessel,obstacle),null);
  }
});

test('capsule-box correction handles corners, containment, crossing and tangency', () => {
  const box={x:0,z:0,width:4,depth:6};
  for(let index=0;index<300;index++) {
    const vessel=hull(Math.sin(index)*5,Math.cos(index*0.71)*6,index*0.29);
    const contact=capsuleBox(vessel,box);
    if(!contact) continue;
    assert.ok(Object.values(contact).every(Number.isFinite));
    vessel.x+=contact.normalX*(contact.depth+1e-6);
    vessel.z+=contact.normalZ*(contact.depth+1e-6);
    assert.equal(capsuleBox(vessel,box),null,`case ${index}`);
  }
  assert.equal(capsuleBox(hull(3.4,0),box),null);
});

test('zero-length spines remain valid circular capsules', () => {
  const first={...hull(),length:2.8}; const second={...hull(2,0),length:2.8};
  assert.ok(capsulePair(first,second));
  assert.ok(capsuleBox(first,{x:0,z:0,width:1,depth:1}));
});

test('capsule gameplay replay remains identical with fixed simulation input', () => {
  function run() {
    const state=createState();recover(state,0,1);
    const traffic=createTraffic(state,6);
    for(let tick=1;tick<=1800;tick++) {
      step(state,{throttle:true,turn:Math.sin(tick/150)*0.2},1/120,tick/120,1);
      updateTraffic(traffic,state,1/120);
    }
    return {state,traffic};
  }
  assert.deepEqual(run(),run());
});
