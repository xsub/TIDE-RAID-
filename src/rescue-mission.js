import {channel, chunkFeatures, chunkIndex, CHUNK_COUNT, START_Z, END_Z} from './world.js';
import {harborLayout} from './harbor-layout.js';
import {waterDepth} from './depth.js';
import {SERVICE_STATIONS} from './voyage.js';
import {capsulePair} from './capsule.js';
import {contactImpulse} from './collision.js';

export function rescueSite(state) {
  const clearance = Math.max(15, (state.length ?? 7.4) * 0.5 + 8);
  for (const offset of [280, 360, 440, 200, 520]) for (const lane of [-0.35, 0.35, 0, -0.6, 0.6]) {
    const z = Math.max(END_Z + 80, Math.min(START_Z - 30, state.z - offset));
    const banks = channel(z); const x = banks.center + lane * banks.width;
    const sector = chunkIndex(z); let safe = true;
    for (let index = Math.max(0, sector - 1); index <= Math.min(CHUNK_COUNT - 1, sector + 1); index++) {
      if (chunkFeatures(index).some((feature) => Math.hypot(x - feature.x, z - feature.z) < feature.radius + clearance)) safe = false;
      if (harborLayout(index).docks.some((dock) => Math.abs(x - dock.x) < dock.width / 2 + clearance && Math.abs(z - dock.z) < dock.depth / 2 + clearance)) safe = false;
    }
    if (!safe || Math.hypot(x - state.x, z - state.z) < 100 || SERVICE_STATIONS.some((station) => Math.hypot(x - station.x, z - station.z) < 50)) continue;
    if (waterDepth(x, z, state.depthScale) < Math.max(3, (state.draft ?? 1) + 1)) continue;
    return {x, z, heading: Math.atan((channel(z + 1).center - channel(z - 1).center) / 2), length: 7.4, beam: 2.8, name: 'Stranded runabout'};
  }
  return null;
}

export function createRescueMission(state) {
  const boat = rescueSite(state);
  if (!boat) return {mode: 'rescue', phase: 'off', notice: 'NO SAFE RESCUE SITE NEARBY · move farther into the channel and retry', elapsed: 0, hold: 0, score: 0};
  let home = 0;
  for (let index = 1; index < SERVICE_STATIONS.length; index++) if (Math.hypot(boat.x - SERVICE_STATIONS[index].x, boat.z - SERVICE_STATIONS[index].z) < Math.hypot(boat.x - SERVICE_STATIONS[home].x, boat.z - SERVICE_STATIONS[home].z)) home = index;
  return {mode: 'rescue', phase: 'assist', rescueBoat: boat, target: home, elapsed: 0, hold: 0, score: 0, helped: false};
}

export function tickRescue(activity, state, dt, blocked) {
  if (!['assist', 'return'].includes(activity.phase) || !Number.isFinite(dt) || dt <= 0) return;
  activity.elapsed += dt;
  const target = activity.phase === 'assist' ? activity.rescueBoat : SERVICE_STATIONS[activity.target];
  const radius = activity.phase === 'assist' ? 14 : 18;
  const safe = !blocked && !(state.collision > 0) && state.speed < 1 && Math.hypot(state.x - target.x, state.z - target.z) < radius;
  activity.hold = safe ? activity.hold + dt : 0;
  if (activity.hold < (activity.phase === 'assist' ? 4 : 2)) return;
  activity.hold = 0;
  if (activity.phase === 'assist') {activity.helped = true; activity.phase = 'return';}
  else {activity.phase = 'done'; activity.score = Math.max(150, Math.round(1500 - activity.elapsed * 0.4));}
}

export function collideRescueBoat(body, activity) {
  if (activity.mode !== 'rescue' || !['assist', 'return'].includes(activity.phase)) return false;
  const boat = activity.rescueBoat;
  if (Math.hypot(body.x - boat.x, body.z - boat.z) > body.length + boat.length) return false;
  const contact = capsulePair(body, boat); if (!contact) return false;
  body.x += contact.normalX * (contact.depth + 0.000001); body.z += contact.normalZ * (contact.depth + 0.000001);
  contactImpulse(body, null, contact.normalX, contact.normalZ, 0.08, 0.2, contact);
  body.impactMaterial = 4; body.collision = 0.5; body.speed = Math.hypot(body.vx, body.vz);
  return true;
}
