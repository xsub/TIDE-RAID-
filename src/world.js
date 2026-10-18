import {contactImpulse} from './collision.js';
import {hullCapsule, capsuleCircle} from './capsule.js';

export const WORLD_SIZE = 18800;
export const START_Z = 200;
export const END_Z = START_Z - WORLD_SIZE;
export const CHUNK_SIZE = 200;
export const CHUNK_COUNT = WORLD_SIZE / CHUNK_SIZE;

export function channel(z) {
  const center = 650 * Math.sin((z - START_Z) * 0.0009)
    + 210 * Math.sin((z - START_Z) * 0.0031);
  const width = 200 + 30 * Math.sin(z * 0.005) + 18 * Math.sin(z * 0.013);
  return {center, width, left: center - width, right: center + width};
}

export function chunkIndex(z) {
  return Math.max(0, Math.min(CHUNK_COUNT - 1, Math.floor((START_Z - z) / CHUNK_SIZE)));
}

const featureLayouts=new Map();
export function chunkFeatures(index) {
  if(featureLayouts.has(index))return featureLayouts.get(index);
  const features = [];
  const start = START_Z - index * CHUNK_SIZE;
  const random = (seed) => {
    const value = Math.sin(index * 127.1 + seed * 311.7 + 17.3) * 43758.5453;
    return value - Math.floor(value);
  };
  for (let slot = 0; slot < 5; slot++) {
    const z = start - 30 - slot * 36;
    const {center, width} = channel(z);
    const kind = slot === 2 ? 'island' : slot % 2 === 0 ? 'sandbank' : 'rock';
    const radius = kind === 'island' ? 25 + random(slot) * 14 : kind === 'sandbank' ? 12 : 5 + random(slot) * 5;
    const x = center + (slot === 2 ? Math.sin(index * 2.3) * width * 0.25 : (random(slot + 8) - 0.5) * width * 1.55);
    if (index === 0 && z > 60) continue;
    features.push({x, z, radius, kind});
  }
  const separated = [];
  features.sort((first, second) => Number(second.kind === 'island') - Number(first.kind === 'island'));
  for (const feature of features) {
    if (separated.every((other) => Math.hypot(feature.x - other.x, feature.z - other.z) > feature.radius + other.radius + 12)) separated.push(feature);
  }
  if(Number.isInteger(index) && index>=0 && index<CHUNK_COUNT) {
    for(const feature of separated)Object.freeze(feature);
    Object.freeze(separated);featureLayouts.set(index,separated);
  }
  return separated;
}

export function resolveCollision(state) {
  let hit = false;
  for (const end of [0,1]) {
    const capsule = hullCapsule(state);
    const x = end ? capsule.bx : capsule.ax; const z = end ? capsule.bz : capsule.az;
    const banks = channel(z);
    if (x < banks.left+capsule.radius || x > banks.right-capsule.radius) {
      const corrected = Math.max(banks.left+capsule.radius,Math.min(banks.right-capsule.radius,x));
      state.x += corrected-x;
      const side = x < banks.center ? -1 : 1;
      const normalZ = 0.15*Math.cos(z*0.005)+0.234*Math.cos(z*0.013)+side*(0.585*Math.cos((z-START_Z)*0.0009)+0.651*Math.cos((z-START_Z)*0.0031));
      contactImpulse(state,null,-side,normalZ,0.08,0.35,{x:corrected+side*capsule.radius,z});
      state.impactMaterial=2;
      hit = true;
    }
  }
  const current = chunkIndex(state.z);
  for (let index = Math.max(0, current - 1); index <= Math.min(CHUNK_COUNT - 1, current + 1); index++) {
    for (const feature of chunkFeatures(index)) {
      const contact = capsuleCircle(state,feature);
      if (!contact) continue;
      state.x += contact.normalX*(contact.depth+1e-6);
      state.z += contact.normalZ*(contact.depth+1e-6);
      contactImpulse(state,null,contact.normalX,contact.normalZ,feature.kind === 'rock' ? 0.15 : 0.03,feature.kind === 'rock' ? 0.25 : 0.5,contact);
      state.impactMaterial=feature.kind==='rock' ? 1 : 2;
      hit = true;
    }
  }
  state.z = Math.max(END_Z + 5, Math.min(START_Z + 8, state.z));
  return hit;
}
