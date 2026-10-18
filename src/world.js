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

export function chunkFeatures(index) {
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
  return separated;
}

export function resolveCollision(state, radius = 2.8) {
  const banks = channel(state.z);
  let hit = false;
  if (state.x < banks.left + radius || state.x > banks.right - radius) {
    state.x = Math.max(banks.left + radius, Math.min(banks.right - radius, state.x));
    state.vx *= -0.25;
    state.vz *= 0.8;
    hit = true;
  }
  const current = chunkIndex(state.z);
  for (let index = Math.max(0, current - 1); index <= Math.min(CHUNK_COUNT - 1, current + 1); index++) {
    for (const feature of chunkFeatures(index)) {
      const deltaX = state.x - feature.x;
      const deltaZ = state.z - feature.z;
      const distance = Math.hypot(deltaX, deltaZ);
      const clearance = feature.radius + radius;
      if (distance >= clearance) continue;
      const normalX = distance > 0.001 ? deltaX / distance : 1;
      const normalZ = distance > 0.001 ? deltaZ / distance : 0;
      state.x = feature.x + normalX * clearance;
      state.z = feature.z + normalZ * clearance;
      const inward = state.vx * normalX + state.vz * normalZ;
      if (inward < 0) {
        state.vx -= inward * normalX * 1.25;
        state.vz -= inward * normalZ * 1.25;
      }
      state.vx *= 0.65;
      state.vz *= 0.65;
      hit = true;
    }
  }
  state.z = Math.max(END_Z + 5, Math.min(START_Z + 8, state.z));
  return hit;
}
