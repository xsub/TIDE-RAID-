import {channel, START_Z, CHUNK_SIZE, CHUNK_COUNT, chunkIndex} from './world.js';
import {contactImpulse} from './collision.js';
import {capsuleBox} from './capsule.js';

export function harborLayout(index) {
  const buildings = [];
  const docks = [];
  const lighthouses = [];
  const side = index % 2 ? 1 : -1;
  const centerZ = START_Z - index * CHUNK_SIZE - 100;
  if (index % 3 === 0) {
    for (let house = 0; house < 8; house++) {
      const z = centerZ + (house % 4 - 1.5) * 21;
      const banks = channel(z);
      buildings.push({x: (side < 0 ? banks.left : banks.right) + side * (30 + Math.floor(house / 4) * 26), z,
        width: 9 + house % 3, depth: 10, height: 6 + house % 3, side, style: (house + index) % 4});
    }
    const banks = channel(centerZ);
    const edge = side < 0 ? banks.left : banks.right;
    docks.push({x: edge - side * 2, z: centerZ, width: 24, depth: 6, side},
      {x: edge - side * 12, z: centerZ, width: 5, depth: 22, side});
  }
  if (index % 5 === 1 || index === 0) {
    const z = centerZ + 66;
    const banks = channel(z);
    lighthouses.push({x: (side < 0 ? banks.left : banks.right) + side * 20, z, side});
  }
  return {buildings, docks, lighthouses};
}

export function reservedHarborSpace(x, z, index, layout = harborLayout(index)) {
  const {buildings, lighthouses, docks} = layout;
  return buildings.some((house) => Math.abs(x - house.x) < house.width / 2 + 7 && Math.abs(z - house.z) < house.depth / 2 + 6)
    || lighthouses.some((tower) => Math.hypot(x - tower.x, z - tower.z) < 12)
    || docks.some((dock) => Math.abs(x - dock.x) < dock.width / 2 + 4 && Math.abs(z - dock.z) < dock.depth / 2 + 4);
}

export function resolveHarborCollision(state) {
  const sector = chunkIndex(state.z);
  let hit = false;
  for (let index = Math.max(0, sector - 1); index <= Math.min(CHUNK_COUNT - 1, sector + 1); index++) {
    for (const dock of harborLayout(index).docks) {
      const contact = capsuleBox(state,dock);
      if (!contact) continue;
      state.x += contact.normalX*(contact.depth+1e-6);
      state.z += contact.normalZ*(contact.depth+1e-6);
      contactImpulse(state,null,contact.normalX,contact.normalZ,0.08,0.3,contact);
      state.collision = 0.5;
      state.speed = Math.hypot(state.vx, state.vz);
      hit = true;
    }
  }
  return hit;
}
