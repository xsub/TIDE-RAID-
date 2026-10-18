import test from 'node:test';
import assert from 'node:assert/strict';
import {bodyInertia, contactImpulse, hullContact} from '../src/collision.js';
import {createState, recover, step} from '../src/physics.js';
import {createTraffic, updateTraffic} from '../src/traffic.js';

const close = (actual,expected) => assert.ok(Math.abs(actual-expected)<1e-7,`${actual} != ${expected}`);
const kinetic = (body) => 0.5*body.mass*(body.vx**2+body.vz**2)+0.5*bodyInertia(body)*body.yawRate**2;
const angular = (body) => body.mass*(body.z*body.vx-body.x*body.vz)+bodyInertia(body)*body.yawRate;
const body = (mass=1400) => ({x:0,z:0,heading:0,vx:-10,vz:0,yawRate:0,mass});

test('centred normal hits do not spin, bow/stern impacts turn in opposite directions', () => {
  const centered=body(); contactImpulse(centered,null,1,0,0.12,0,{x:-1.4,z:0});
  close(centered.yawRate,0);
  const bow=body(); contactImpulse(bow,null,1,0,0.12,0,{x:-1,z:-3});
  const stern=body(); contactImpulse(stern,null,1,0,0.12,0,{x:-1,z:3});
  assert.ok(bow.yawRate<0 && stern.yawRate>0);
  close(bow.yawRate,-stern.yawRate);
  assert.ok(Math.abs(bow.vx)<10);
});

test('greater mass/inertia resists rotation from the same light vessel', () => {
  function impact(mass) {
    const first={...body(mass),vx:0};
    const second={...body(700),x:-2,vx:10};
    contactImpulse(first,second,1,0,0.12,0,{x:-1,z:-2});
    return Math.abs(first.yawRate);
  }
  assert.ok(impact(4200)<impact(1400));
});

test('off-centre frictional contacts conserve total angular/linear momentum and dissipate total energy', () => {
  for(let index=1;index<=100;index++) {
    const first={...body(1000+index*20),x:2,z:1,vz:4,yawRate:0.2};
    const second={...body(2400),x:-2,z:-1,vx:2,vz:-1,yawRate:-0.1};
    const before=kinetic(first)+kinetic(second);
    const momentumX=first.mass*first.vx+second.mass*second.vx;
    const momentumZ=first.mass*first.vz+second.mass*second.vz;
    const spin=angular(first)+angular(second);
    const result=contactImpulse(first,second,1,0,0.15,0.25,{x:0,z:0.5});
    assert.ok(result.impulse>0);
    close(first.mass*first.vx+second.mass*second.vx,momentumX);
    close(first.mass*first.vz+second.mass*second.vz,momentumZ);
    close(angular(first)+angular(second),spin);
    assert.ok(kinetic(first)+kinetic(second)<=before+1e-7);
    close(result.energyLost,before-kinetic(first)-kinetic(second));
  }
});

test('oriented hull support points distinguish bow/side and remain finite', () => {
  const vessel=body();
  close(hullContact(vessel,0,1).z,-3.7);
  close(hullContact(vessel,1,0).x,-1.4);
  vessel.heading=Math.PI/2;
  close(hullContact(vessel,1,0).x,-3.7);
  assert.ok(Object.values(hullContact(vessel,0,0)).every(Number.isFinite));
});

test('impact yaw integrates, damps, resets and replays deterministically at fixed steps', () => {
  function run() {
    const state=createState(); recover(state,0,0);
    const traffic=createTraffic(state,3);
    state.yawRate=1;
    const heading=state.heading;
    for(let tick=1;tick<=240;tick++) {
      step(state,{turn:0},1/120,tick/120,0);
      updateTraffic(traffic,state,1/120);
    }
    assert.ok(state.heading>heading);
    assert.ok(Math.abs(state.yawRate)<0.1);
    const result=structuredClone({state,traffic});
    recover(state,2,0);
    assert.equal(state.yawRate,0);
    return result;
  }
  assert.deepEqual(run(),run());
});
