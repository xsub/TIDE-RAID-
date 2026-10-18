import {channel, chunkFeatures, START_Z, CHUNK_SIZE} from './world.js';

export function natureRandom(seed) {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
}

export function beachWidth(z, side) {
  return Math.max(3, 7 + 4 * Math.sin(z * 0.012 + side * 2) + 2 * Math.sin(z * 0.033));
}

export function coastHeight(x, z, distance) {
  const rise = Math.max(0, distance);
  const foothills = Math.sin(x * 0.012) * Math.sin(z * 0.007) * 0.5 + 0.5;
  return 1.1 + rise * 0.035 + foothills * Math.min(42, rise * 0.16)
    + Math.sin(x * 0.035 + z * 0.018) * Math.min(2.5, rise * 0.06);
}

export function islandHeight(fraction) {
  return 1.6 + 3.4 * Math.max(0, 1 - fraction * fraction);
}

export function natureLayout(index) {
  const layout = {trees: [], shrubs: [], rocks: [], grass: [], logs: [], flowers: [], birds: []};
  const random = (seed) => natureRandom(index * 997 + seed * 13.7);
  const start = START_Z - index * CHUNK_SIZE;
  for (let plant = 0; plant < 760; plant++) {
    const side = plant % 2 ? -1 : 1;
    const z = start - 2 - random(plant * 9 + 1) * (CHUNK_SIZE - 4);
    const banks = channel(z);
    const distance = plant < 300 ? 8 + random(plant * 9 + 2) ** 1.5 * 280 : (plant >= 650 && plant < 722 ? 12 : 1) + random(plant * 9 + 2) * 95;
    const x = (side < 0 ? banks.left : banks.right) + side * (beachWidth(z, side) + distance);
    const y = coastHeight(x, z, distance) - 0.35;
    const scale = 0.65 + random(plant * 9 + 3) * 0.75;
    const rotation = random(plant * 9 + 4) * Math.PI * 2;
    const patch = 0.5 + 0.5 * Math.sin(z * 0.027 + side * 3 + distance * 0.034);
    const item = {x, y, z, scale, rotation, shade: random(plant * 9 + 5)};
    if (plant < 300) {
      if (patch < 0.18) continue;
      const climate = 0.5 + 0.5 * Math.sin(z * 0.0018 + side);
      const species = climate > 0.8 && distance < 55 ? 'palm' : random(plant * 9 + 6) < climate * 0.65 ? 'broadleaf' : 'pine';
      layout.trees.push({...item, species});
    } else if (plant < 470) layout.shrubs.push(item);
    else if (plant < 650) layout.grass.push(item);
    else if (plant < 710) layout.rocks.push({...item, scale: scale * (patch > 0.75 ? 4 : 1.5)});
    else if (plant < 722) layout.logs.push(item);
    else layout.flowers.push(item);
  }
  for (const island of chunkFeatures(index).filter((feature) => feature.kind === 'island')) {
    for (let plant = 0; plant < 34; plant++) {
      const angle = random(8000 + plant * 3) * Math.PI * 2;
      const radius = island.radius * (0.28 + random(8001 + plant * 3) * 0.42);
      const x = island.x + Math.cos(angle) * radius;
      const z = island.z + Math.sin(angle) * radius;
      const item = {x, y: islandHeight(radius / (island.radius * 0.86)) - 0.35, z, scale: 0.6 + random(8002 + plant * 3) * 0.55, rotation: angle, shade: random(plant + 8700)};
      if (plant < 20) layout.trees.push({...item, species: plant % 3 === 0 ? 'palm' : 'broadleaf', island: true});
      else layout.shrubs.push({...item, island: true});
    }
  }
  for (let bird = 0; bird < 6; bird++) {
    const z = start - random(9000 + bird) * CHUNK_SIZE;
    layout.birds.push({x: channel(z).center + (random(9100 + bird) - 0.5) * 360, y: 24 + random(9200 + bird) * 24, z, scale: 1.5, rotation: random(9300 + bird) * Math.PI * 2, shade: 0.5});
  }
  return layout;
}
