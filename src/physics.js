import {sampleWave} from './waves.js';
import {START_Z, channel, chunkFeatures, chunkIndex} from './world.js';
import {settleContacts} from './contacts.js';
import {advanceHull} from './motion.js';
import {applyRudder} from './steering.js';
import {vesselProfile,propulsionAcceleration} from './vessel-profiles.js';
import {applyShallows} from './depth.js';

export function channelHeading(z) {
  return Math.atan((channel(z + 1).center - channel(z - 1).center) / 2);
}

export function createState(model='boat-speed-c') {
  return {...vesselProfile(model),x: channel(START_Z - 20).center, z: START_Z - 20, y: 1.5,
    vx: 0, vz: 0, vy: 0, heading: channelHeading(START_Z - 20), pitch: 0, roll: 0,
    airtime: 0, longestJump: 0, landing: 0, collision: 0, speed: 0, impactEnergy: 0, yawRate: 0, depth: 20, grounded: 0, shallowFactor: 1};
}

export function recover(state, time, roughness = 1) {
  const banks = channel(state.z);
  const features = chunkFeatures(chunkIndex(state.z));
  const candidates = [0, -0.35, 0.35, -0.65, 0.65];
  const offset = candidates.find((fraction) => features.every((feature) => Math.hypot(banks.center + banks.width * fraction - feature.x, state.z - feature.z) > feature.radius + 6)) ?? 0;
  Object.assign(state, {x: banks.center + banks.width * offset,
    vx: 0, vz: 0, vy: 0, speed: 0, heading: channelHeading(state.z),
    pitch: 0, roll: 0, airtime: 0, collision: 0, landing: 0, impactEnergy: 0, yawRate: 0});
  state.y = sampleWave(state.x, state.z, time, roughness).h + 0.6;
}

export function step(state, input, dt, time, roughness = 1, resolveTraffic = null) {
  const speed = Math.hypot(state.vx, state.vz);
  const cosine = Math.cos(state.heading);
  const sine = Math.sin(state.heading);
  let support = 0;
  let front = 0;
  let back = 0;
  let left = 0;
  let right = 0;
  const contactWidth=state.beam*0.32; const contactLength=state.length*0.257;
  for (const [localX, localZ] of [[-contactWidth,-contactLength],[contactWidth,-contactLength],[-contactWidth,contactLength],[contactWidth,contactLength]]) {
    const worldX = state.x + localX * cosine + localZ * sine;
    const worldZ = state.z - localX * sine + localZ * cosine;
    const wave = sampleWave(worldX, worldZ, time, roughness);
    const hullHeight = state.y - 0.6 - localZ * state.pitch + localX * state.roll;
    const immersion = wave.h - hullHeight;
    const relative = wave.dt + wave.dx * state.vx + wave.dz * state.vz - state.vy;
    const force = immersion > -0.08 ? Math.min(28, Math.max(0, immersion * 48 + relative * 4.5)) : 0;
    support += force;
    if (localZ < 0) front += force; else back += force;
    if (localX < 0) left += force; else right += force;
  }
  support *= 0.25;
  const wet = Math.min(1, support / 9.81);
  const forwardBefore = -sine * state.vx - cosine * state.vz;
  const thrust = propulsionAcceleration(state,input,forwardBefore,wet,dt);
  state.vx -= sine * thrust * wet * dt;
  state.vz -= cosine * thrust * wet * dt;
  const forward = -sine * state.vx - cosine * state.vz;
  const lateral = cosine * state.vx - sine * state.vz;
  const grip = 1 - Math.exp(-state.lateralGrip * wet * dt);
  state.vx -= cosine * lateral * grip;
  state.vz += sine * lateral * grip;
  const drag = Math.exp(-((0.1 + speed * state.waterDrag) * wet + 0.025) * dt);
  state.vx *= drag;
  state.vz *= drag;
  applyShallows(state,dt);
  applyRudder(state,input.turn,forward,wet,dt);
  const planing = Math.min(speed / state.planingSpeed, 1) * wet * state.shallowFactor;
  state.vy += (support * (1 + planing * state.planingLift) - 9.81) * dt;
  state.vy = Math.max(-12, Math.min(3.0, state.vy));
  let impact=false;
  advanceHull(state,dt,0,(body) => {
    impact=settleContacts(body,resolveTraffic)||impact;
  });
  state.y += state.vy * dt;
  const pitchTarget = Math.max(-0.45, Math.min(0.45, (front - back) / 110 + planing * 0.045));
  const rollTarget = Math.max(-0.4, Math.min(0.4, (right - left) / 100 - input.turn * speed * 0.002));
  state.pitch += (pitchTarget - state.pitch) * (1 - Math.exp(-4 * dt));
  state.roll += (rollTarget - state.roll) * (1 - Math.exp(-4 * dt));
  state.landing = Math.max(0, state.landing - dt);
  state.collision = Math.max(0, state.collision - dt);
  if (wet < 0.03) state.airtime += dt;
  else {
    if (state.airtime > 0.18) {
      state.longestJump = Math.max(state.longestJump, state.airtime);
      state.landing = 0.65;
    }
    state.airtime = 0;
  }
  if (impact) state.collision = 0.5;
  state.speed = Math.hypot(state.vx, state.vz);
}
