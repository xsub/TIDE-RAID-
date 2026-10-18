import {START_Z, CHUNK_COUNT, channel, chunkFeatures} from './world.js';
import {createSinking, tickSinking, pumpSinking, resetSinking} from './sinking.js';

export function applyVoyageRule(settings, voyage, name, value) {
  const choices = name === 'damageMode' ? ['arcade', 'realistic'] : ['fuelMode', 'sinkingMode'].includes(name) ? ['off', 'arcade', 'realistic'] : [];
  if (!choices.includes(value)) return false;
  settings[name] = value;
  if (name === 'sinkingMode' && value === 'off') resetSinking(voyage);
  return true;
}

export function sinkingStatus(voyage, mode) {
  if (mode === 'off') return 'SINKING OFF · choose Arcade / Realistic to enable';
  if (voyage.flooding >= 0.99) return 'FULLY FLOODED · H to recover · Wreck view to inspect';
  if (voyage.flooding > 0.001) return `${mode.toUpperCase()} · FLOODING ${(voyage.flooding * 100).toFixed(1)}% · ${voyage.sinking.ingress.toFixed(1)} L/s`;
  const threshold = mode === 'arcade' ? 0.12 : 0.3;
  return voyage.hull < threshold ? `${mode.toUpperCase()} · BREACHED · ingress requires a submerged opening` : `${mode.toUpperCase()} · WATERTIGHT · leaks below ${Math.round(threshold * 100)}% hull · use Flooding Drill to practice`;
}

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

export const createVoyage = () => ({hull: 1, fuel: 1, flooding: 0, sinking: createSinking(), mooring: 0, servicing: false, lastCollision: false, lastLanding: false});
export function voyageDrive(voyage) {return voyage.fuel > 0 && voyage.hull > 0 && voyage.flooding < 0.75;}
export function tickVoyage(voyage, state, input, rules, dt, waterHeight = 0) {
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
  tickSinking(voyage, state, rules.sinkingMode, dt, waterHeight);
  const station = SERVICE_STATIONS.find((candidate) => Math.hypot(state.x - candidate.x, state.z - candidate.z) < 22);
  voyage.mooring = station && state.speed < 1.5 && !input.throttle && !input.reverse && voyage.flooding < 1 ? voyage.mooring + dt : 0;
  voyage.servicing = voyage.mooring >= 1.5;
  if (voyage.servicing) {
    voyage.hull = Math.min(1, voyage.hull + dt * 0.16);
    voyage.fuel = Math.min(1, voyage.fuel + dt * 0.2);
    pumpSinking(voyage, dt);
  }
}
