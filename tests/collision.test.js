import test from 'node:test';
import assert from 'node:assert/strict';
import {contactImpulse} from '../src/collision.js';
import {createState} from '../src/physics.js';
import {createTraffic, collideTraffic, updateTraffic} from '../src/traffic.js';

const energy = (body) => 0.5*body.mass*(body.vx**2+body.vz**2);
const close = (actual,expected) => assert.ok(Math.abs(actual-expected)<1e-7, `${actual} != ${expected}`);

test('two-body collision conserves momentum and dissipates restitution energy', () => {
  for (const mass of [700,1400,4200,12000]) {
    const first = {mass:1400,vx:-20,vz:0};
    const second = {mass,vx:3,vz:0};
    const momentum = first.mass*first.vx+second.mass*second.vx;
    const before = energy(first)+energy(second);
    const reducedMass = first.mass*mass/(first.mass+mass);
    const result = contactImpulse(first,second,1,0,0.2,0);
    close(first.mass*first.vx+second.mass*second.vx,momentum);
    close(first.vx-second.vx,23*0.2);
    close(result.energyLost,0.5*reducedMass*(1-0.2**2)*23**2);
    close(before-energy(first)-energy(second),result.energyLost);
  }
});

test('elastic equal masses exchange velocities and preserve kinetic energy', () => {
  const first={mass:1400,vx:-10,vz:2}; const second={mass:1400,vx:0,vz:2};
  const before=energy(first)+energy(second);
  const result=contactImpulse(first,second,1,0,1,0);
  close(first.vx,0); close(second.vx,-10);
  close(before,energy(first)+energy(second)); close(result.energyLost,0);
});

test('static impact obeys restitution while Coulomb friction limits sideways impulse', () => {
  const body={mass:1400,vx:-10,vz:20};
  const result=contactImpulse(body,null,1,0,0.1,0.2);
  close(body.vx,1);
  close(body.vz,17.8);
  assert.ok(result.energyLost>0);
  const separating={mass:1400,vx:3,vz:2};
  assert.equal(contactImpulse(separating,null,1,0).impulse,0);
  close(separating.vx,3); close(separating.vz,2);
});

test('glancing two-body impacts conserve both momentum axes and cannot create energy', () => {
  for(let index=1;index<=100;index++) {
    const angle=index*0.71; const normalX=Math.cos(angle); const normalZ=Math.sin(angle);
    const first={mass:1000+index*20,vx:-normalX*25+3,vz:-normalZ*25-2};
    const second={mass:3000,vx:3,vz:-2};
    const before=energy(first)+energy(second);
    const momentumX=first.mass*first.vx+second.mass*second.vx;
    const momentumZ=first.mass*first.vz+second.mass*second.vz;
    contactImpulse(first,second,normalX,normalZ,0.12,0.25);
    close(first.mass*first.vx+second.mass*second.vx,momentumX);
    close(first.mass*first.vz+second.mass*second.vz,momentumZ);
    assert.ok(energy(first)+energy(second)<=before+1e-7);
  }
});

test('traffic retains transferred momentum into the next simulation step', () => {
  const player=createState(); const traffic=createTraffic(player,1); const ship=traffic.boats[0];
  Object.assign(ship,{x:player.x,z:player.z-5,vx:0,vz:-8});
  player.vz=-40;
  collideTraffic(player,ship);
  assert.ok(ship.vz < -8);
  const velocity=ship.vz;
  player.x+=100;
  updateTraffic(traffic,player,1/120);
  assert.ok(Math.abs(ship.vz-velocity)<=3/120+1e-7);
});
