import {START_Z, CHUNK_COUNT, channel, chunkFeatures} from './world.js';

export const SERVICE_STATIONS = Object.freeze(Array.from({length: Math.ceil(CHUNK_COUNT / 6)}, (_, station) => {
  const index = station * 6;
  const side = index % 12 ? 1 : -1;
  for (const offset of [30, 65, -35, 100]) {
    const z = START_Z - index * 200 - 100 + offset;
    const banks = channel(z);
    const x = banks.center + side * (banks.width - 48);
    const features = [index - 1, index, index + 1].filter((sector) => sector >= 0 && sector < CHUNK_COUNT).flatMap(chunkFeatures);
    if (features.every((feature) => Math.hypot(x - feature.x, z - feature.z) > feature.radius + 25)) return Object.freeze({x, z, name: `Harbor ${station + 1}`});
  }
  const z = START_Z - index * 200 - 100;
  return Object.freeze({x: channel(z).center, z, name: `Harbor ${station + 1}`});
}));

export const createVoyage = () => ({hull: 1, fuel: 1, flooding: 0, mooring: 0, servicing: false, lastCollision: false, lastLanding: false});
export function voyageDrive(voyage) {return voyage.fuel > 0 && voyage.hull > 0 && voyage.flooding < 1;}
export function tickVoyage(voyage, state, input, rules, dt) {
  const realistic = rules.damageMode === 'realistic';
  if (state.collision > 0 && !voyage.lastCollision) voyage.hull -= Math.max(0, (state.impactEnergy ?? 0) / state.mass - 1) / (realistic ? 100 : 300);
  if (state.landing > 0 && !voyage.lastLanding) voyage.hull -= Math.max(0, (state.landingEnergy ?? 0) / state.mass - 4) / (realistic ? 500 : 1600);
  voyage.lastCollision = state.collision > 0; voyage.lastLanding = state.landing > 0;
  voyage.hull = Math.max(0, Math.min(1, voyage.hull - Math.max(0, state.grounded ?? 0) * state.speed * dt * (realistic ? 0.0008 : 0.0002)));
  if (rules.fuelMode !== 'off' && voyageDrive(voyage)) {
    const load = input.throttle || input.reverse ? input.boost ? 1 : 0.65 : 0.025;
    const capacity = 80 + state.length * 20;
    const burn = rules.fuelMode === 'realistic' ? state.power / 1000 * 0.32 / 0.74 / 3600 / capacity : 1 / 480;
    voyage.fuel = Math.max(0, voyage.fuel - burn * load * dt);
  }
  if (rules.fuelMode === 'off') voyage.fuel = 1;
  if (rules.sinkingMode === 'off') voyage.flooding = 0;
  else if (rules.sinkingMode === 'arcade') voyage.flooding = Math.min(1, voyage.flooding + (voyage.hull <= 0 ? dt / 12 : -dt / 6));
  else voyage.flooding = Math.min(1, voyage.flooding + (voyage.hull < 0.25 ? (0.25 - voyage.hull) * dt / 8 : -dt / 20));
  voyage.flooding = Math.max(0, voyage.flooding);
  const station = SERVICE_STATIONS.find((candidate) => Math.hypot(state.x - candidate.x, state.z - candidate.z) < 22);
  voyage.mooring = station && state.speed < 1.5 && !input.throttle && !input.reverse && voyage.flooding < 1 ? voyage.mooring + dt : 0;
  voyage.servicing = voyage.mooring >= 1.5;
  if (voyage.servicing) {
    voyage.hull = Math.min(1, voyage.hull + dt * 0.16);
    voyage.fuel = Math.min(1, voyage.fuel + dt * 0.2);
    voyage.flooding = Math.max(0, voyage.flooding - dt * 0.3);
  }
}
