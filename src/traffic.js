import {channel, chunkFeatures, chunkIndex, resolveCollision, END_Z} from './world.js';
import {contactImpulse, bodyMass, VESSEL_MASS} from './collision.js';
import {capsulePair} from './capsule.js';
import {advanceHull} from './motion.js';

export const TRAFFIC_TYPES = [
  {model: 'boat-speed-a', length: 7.4, radius: 3.8, speed: 13},
  {model: 'boat-house-a', length: 11, radius: 5.6, speed: 8},
  {model: 'boat-tug-a', length: 12, radius: 6.1, speed: 6},
  {model: 'boat-speed-d', length: 7.4, radius: 3.8, speed: 11},
];
const LANES = [-0.55, -0.25, 0.25, 0.55];
const featureCache = new Map();
function featuresAt(index) {
  if (!featureCache.has(index)) featureCache.set(index, chunkFeatures(index));
  return featureCache.get(index);
}

function targetX(z, lane, radius) {
  const index = chunkIndex(z);
  const features = [index - 1, index, index + 1].filter((value) => value >= 0).flatMap(featuresAt);
  const banks = channel(z);
  const candidates = [lane, ...LANES.filter((candidate) => candidate !== lane), 0];
  const safe = candidates.find((fraction) => features.every((feature) => {
    const pathX = channel(feature.z).center + fraction * channel(feature.z).width;
    return Math.abs(feature.z - z) > 65 || Math.abs(pathX - feature.x) > feature.radius + radius + 10;
  })) ?? lane;
  return banks.center + safe * banks.width;
}

export function createTraffic(player, count = 18) {
  const traffic = {boats: [], overtakes: 0, serial: 0};
  for (let index = 0; index < count; index++) {
    const type = TRAFFIC_TYPES[index % TRAFFIC_TYPES.length];
    const z = player.z - 55 - index * 40;
    const lane = LANES[index % LANES.length];
    const x = targetX(z, lane, type.radius);
    traffic.boats.push({...type, beam: 2.8*type.length/7.4, mass: VESSEL_MASS[type.model], id: traffic.serial++, x, z, lane, vx: 0, vz: -type.speed,
      heading: 0, yawRate: 0, active: z > END_Z + 30, passed: false, contacted: false, gap: player.z - z});
  }
  return traffic;
}

export function collideTraffic(player, ship) {
  if (!ship.active) return false;
  const contact = capsulePair(player,ship);
  if (!contact) return false;
  const {normalX,normalZ} = contact;
  const playerShare = bodyMass(ship)/(bodyMass(player)+bodyMass(ship));
  const correction = contact.depth+0.000001;
  player.x += normalX*correction*playerShare;
  player.z += normalZ*correction*playerShare;
  ship.x -= normalX*correction*(1-playerShare);
  ship.z -= normalZ*correction*(1-playerShare);
  contact.x += normalX*correction*(playerShare-0.5);
  contact.z += normalZ*correction*(playerShare-0.5);
  contactImpulse(player,ship,normalX,normalZ,0.12,0.2,contact);
  player.collision = 0.5;
  player.speed = Math.hypot(player.vx, player.vz);
  ship.contacted = true;
  return true;
}

export function updateTraffic(traffic, player, dt) {
  let hit = false;
  for (const ship of traffic.boats) {
    if (!ship.active) continue;
    if (ship.z > player.z + 130) {
      ship.z = Math.max(END_Z + 30, player.z - 580 - ship.id % 5 * 35);
      if (ship.z >= player.z - 120) {ship.active = false; continue;}
      ship.id = traffic.serial++;
      ship.x = targetX(ship.z, ship.lane, ship.radius);
      ship.passed = false;
      ship.contacted = false;
      ship.gap = player.z - ship.z;
      ship.vx = 0; ship.vz = -ship.speed;
      ship.yawRate = 0;
    }
    const target = targetX(ship.z - 30, ship.lane, ship.radius);
    const targetVelocity = Math.max(-ship.speed,Math.min(ship.speed,(target-ship.x)*0.8));
    const acceleration = 3*dt;
    ship.vx += Math.max(-acceleration,Math.min(acceleration,targetVelocity-ship.vx));
    ship.vz += Math.max(-acceleration,Math.min(acceleration,-ship.speed-ship.vz));
    advanceHull(ship,dt,0,(body) => {
      resolveCollision(body);
      hit=collideTraffic(player,body)||hit;
    });
    const heading = Math.atan2(-ship.vx, -ship.vz);
    const difference = Math.atan2(Math.sin(heading - ship.heading), Math.cos(heading - ship.heading));
    ship.yawRate *= Math.exp(-1.6*dt);
    ship.heading += difference*Math.min(1,dt*3/(1+Math.abs(ship.yawRate)*5));
    hit = collideTraffic(player, ship) || hit;
    resolveCollision(ship);
    const gap = player.z - ship.z;
    if (!ship.passed && ship.gap > 0 && gap <= 0) {
      ship.passed = true;
      if (!ship.contacted && Math.abs(player.x - ship.x) < 100) traffic.overtakes++;
    }
    ship.gap = gap;
    if (ship.z <= END_Z + 10) ship.active = false;
  }
  if (hit) {
    resolveCollision(player);
    player.speed = Math.hypot(player.vx,player.vz);
  }
  return hit;
}
