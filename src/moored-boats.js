import {channel, chunkFeatures, chunkIndex, CHUNK_COUNT} from './world.js';
import {harborLayout} from './harbor-layout.js';
import {SERVICE_STATIONS} from './voyage.js';
import {waterDepth} from './depth.js';
import {capsulePair} from './capsule.js';
import {contactImpulse} from './collision.js';

export const MOORED_TYPES = Object.freeze([
  Object.freeze({model: 'boat-speed-a', length: 7.4, beam: 2.8}),
  Object.freeze({model: 'boat-speed-d', length: 7.4, beam: 2.8}),
  Object.freeze({model: 'boat-house-a', length: 9, beam: 3.4}),
]);
const layouts = new Map();
export function mooredLayout(index) {
  if (!Number.isInteger(index) || index < 0 || index >= CHUNK_COUNT) return [];
  if (layouts.has(index)) return layouts.get(index);
  const boats = []; const dock = harborLayout(index).docks[1]; const candidates = [];
  if (dock) for (const side of [-1, 1]) candidates.push({x: dock.x - dock.side * 16, z: dock.z + side * 7, tetherX: dock.x - dock.side * 2.5, tetherZ: dock.z + side * 7});
  for (const station of SERVICE_STATIONS) if (chunkIndex(station.z) === index) {
    const side = Math.sign(station.x - channel(station.z).center) || 1;
    for (const offset of [-44, 44]) candidates.push({x: station.x + side * 18, z: station.z + offset, tetherX: station.x + side * 23, tetherZ: station.z + offset, buoy: true});
  }
  for (const [slot, candidate] of candidates.entries()) {
    const type = MOORED_TYPES[(index + slot) % MOORED_TYPES.length];
    const banks = channel(candidate.z);
    if (waterDepth(candidate.x, candidate.z) < 2.5 || Math.abs(candidate.x - banks.center) < banks.width * 0.55) continue;
    if (SERVICE_STATIONS.some((station) => Math.hypot(candidate.x - station.x, candidate.z - station.z) < 40)) continue;
    let clear = true;
    for (let sector = Math.max(0, index - 1); sector <= Math.min(CHUNK_COUNT - 1, index + 1); sector++) {
      if (chunkFeatures(sector).some((feature) => Math.hypot(candidate.x - feature.x, candidate.z - feature.z) < feature.radius + 9)) clear = false;
      if (harborLayout(sector).docks.some((pier) => Math.abs(candidate.x - pier.x) < pier.width / 2 + 6 && Math.abs(candidate.z - pier.z) < pier.depth / 2 + 6)) clear = false;
    }
    if (!clear || boats.some((boat) => Math.hypot(candidate.x - boat.x, candidate.z - boat.z) < 12)) continue;
    boats.push(Object.freeze({...candidate, ...type, heading: slot % 2 ? Math.PI : 0, id: index * 4 + slot}));
  }
  Object.freeze(boats); layouts.set(index, boats); return boats;
}

export function collideMooredBoats(body) {
  const sector = chunkIndex(body.z); let hit = false;
  for (let index = Math.max(0, sector - 1); index <= Math.min(CHUNK_COUNT - 1, sector + 1); index++) for (const boat of mooredLayout(index)) {
    if (Math.hypot(body.x - boat.x, body.z - boat.z) > body.length + boat.length) continue;
    const contact = capsulePair(body, boat); if (!contact) continue;
    body.x += contact.normalX * (contact.depth + 0.000001); body.z += contact.normalZ * (contact.depth + 0.000001);
    contactImpulse(body, null, contact.normalX, contact.normalZ, 0.08, 0.2, contact);
    body.impactMaterial = 4; body.collision = 0.5; body.speed = Math.hypot(body.vx, body.vz); hit = true;
  }
  return hit;
}
