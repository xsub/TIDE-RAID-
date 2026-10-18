import {sampleWave} from './waves.js';
import {START_Z, channel, resolveCollision} from './world.js';

export function createState() {
  return {x: channel(START_Z - 20).center, z: START_Z - 20, y: 1.5,
    vx: 0, vz: 0, vy: 0, heading: 0, pitch: 0, roll: 0,
    airtime: 0, longestJump: 0, landing: 0, collision: 0, speed: 0};
}

export function step(state, input, dt, time, roughness = 1) {
  const speed = Math.hypot(state.vx, state.vz);
  const cosine = Math.cos(state.heading);
  const sine = Math.sin(state.heading);
  let support = 0;
  let front = 0;
  let back = 0;
  let left = 0;
  let right = 0;
  for (const [localX, localZ] of [[-0.9, -1.9], [0.9, -1.9], [-0.9, 1.9], [0.9, 1.9]]) {
    const worldX = state.x + localX * cosine + localZ * sine;
    const worldZ = state.z - localX * sine + localZ * cosine;
    const wave = sampleWave(worldX, worldZ, time, roughness);
    const hullHeight = state.y - 0.6 - localZ * state.pitch + localX * state.roll;
    const immersion = wave.h - hullHeight;
    const relative = wave.dt + wave.dx * state.vx + wave.dz * state.vz - state.vy;
    const force = immersion > -0.18 ? Math.min(65, Math.max(0, immersion * 24 + relative * 3.8)) : 0;
    support += force;
    if (localZ < 0) front += force; else back += force;
    if (localX < 0) left += force; else right += force;
  }
  const wet = Math.min(1, support / 9.81);
  const thrust = (input.throttle ? (input.boost ? 29 : 20) : 0) - (input.brake ? 18 : 0);
  state.vx -= sine * thrust * wet * dt;
  state.vz -= cosine * thrust * wet * dt;
  const forward = -sine * state.vx - cosine * state.vz;
  const lateral = cosine * state.vx - sine * state.vz;
  const grip = 1 - Math.exp(-2.6 * wet * dt);
  state.vx -= cosine * lateral * grip;
  state.vz += sine * lateral * grip;
  const drag = Math.exp(-((0.1 + speed * 0.0045) * wet + 0.025) * dt);
  state.vx *= drag;
  state.vz *= drag;
  state.heading -= input.turn * Math.min(speed / 18, 1) * 0.9 * wet * dt * (forward < -1 ? -1 : 1);
  const planing = Math.min(speed / 45, 1) * wet;
  state.vy += (support * (1 + planing * 0.12) - 9.81) * dt;
  state.vy = Math.max(-35, Math.min(25, state.vy));
  state.x += state.vx * dt;
  state.z += state.vz * dt;
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
  if (resolveCollision(state)) state.collision = 0.5;
  state.speed = Math.hypot(state.vx, state.vz);
}
