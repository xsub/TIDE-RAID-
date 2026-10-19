import {chunkIndex, chunkFeatures, CHUNK_COUNT} from './world.js';
import {natureLayout} from './nature.js';
import {harborLayout} from './harbor-layout.js';
import {mooredLayout} from './moored-boats.js';
import {cameraGroundHeight} from './camera-safety.js';

const sectors = new Map();
const axes = ['x', 'z'];
export function cameraObstacleLayout(index) {
  if (sectors.has(index)) return sectors.get(index);
  const bounds = [];
  const add = (kind, x, z, width, depth, bottom, top) => bounds.push(Object.freeze({kind, minX: x - width / 2, maxX: x + width / 2, minZ: z - depth / 2, maxZ: z + depth / 2, bottom, top}));
  const nature = natureLayout(index);
  for (const tree of nature.trees) add('tree', tree.x, tree.z, tree.scale * 10, tree.scale * 10, tree.y, tree.y + tree.scale * 19);
  for (const rock of nature.rocks) add('rock', rock.x, rock.z, rock.scale * 4, rock.scale * 4, rock.y - rock.scale * 2, rock.y + rock.scale * 2);
  for (const feature of chunkFeatures(index)) if (feature.kind === 'rock') add('rock', feature.x, feature.z, feature.radius * 2.4, feature.radius * 2.4, -feature.radius, feature.radius * 1.5);
  const harbor = harborLayout(index);
  for (const house of harbor.buildings) {
    const ground = cameraGroundHeight(house.x, house.z);
    add('building', house.x, house.z, house.width + 5, house.depth + 2, ground - 1, ground + house.height + 5.1);
  }
  for (const tower of harbor.lighthouses) {
    const ground = cameraGroundHeight(tower.x, tower.z);
    add('lighthouse', tower.x, tower.z, 12, 12, ground - 1, ground + 24);
  }
  for (const dock of harbor.docks) add('dock', dock.x, dock.z, dock.width, dock.depth, -3.2, 2.7);
  const result = Object.freeze(bounds); sectors.set(index, result); return result;
}

export function clearCameraBounds(eye, target, bounds, margin = 0.8, forceAbove = false) {
  for (const box of bounds) {
    if (Math.max(eye.x, target.x) < box.minX - margin || Math.min(eye.x, target.x) > box.maxX + margin || Math.max(eye.z, target.z) < box.minZ - margin || Math.min(eye.z, target.z) > box.maxZ + margin) continue;
    let enter = 0; let exit = 1;
    for (const axis of axes) {
      const delta = eye[axis] - target[axis];
      const low = box[axis === 'x' ? 'minX' : 'minZ'] - margin;
      const high = box[axis === 'x' ? 'maxX' : 'maxZ'] + margin;
      if (Math.abs(delta) < 1e-9) {
        if (target[axis] < low || target[axis] > high) {exit = -1; break;}
      } else {
        const first = (low - target[axis]) / delta; const second = (high - target[axis]) / delta;
        enter = Math.max(enter, Math.min(first, second)); exit = Math.min(exit, Math.max(first, second));
      }
    }
    if (enter > exit) continue;
    const firstHeight = target.y + (eye.y - target.y) * enter;
    const lastHeight = target.y + (eye.y - target.y) * exit;
    if ((!forceAbove && Math.max(firstHeight, lastHeight) < box.bottom - margin) || Math.min(firstHeight, lastHeight) > box.top + margin) continue;
    if (enter > 0.001) eye.y = Math.max(eye.y, target.y + (box.top + margin - target.y) / enter);
    else if (exit >= 1) eye.y = Math.max(eye.y, box.top + margin);
  }
  return eye;
}

export function clearCameraObjects(eye, target, exploring, time, swell, wave) {
  const first = Math.max(0, Math.min(chunkIndex(eye.z - 32), chunkIndex(target.z - 32)) - 1);
  const last = Math.min(CHUNK_COUNT - 1, Math.max(chunkIndex(eye.z + 32), chunkIndex(target.z + 32)) + 1);
  const initialHeight = eye.y;
  for (let pass = 0; pass < 2; pass++) {
    if (pass && eye.y === initialHeight) break;
    for (let index = first; index <= last; index++) {
      clearCameraBounds(eye, target, cameraObstacleLayout(index), 0.8, pass > 0);
      if (exploring) for (const boat of mooredLayout(index)) {
        if (boat.x + boat.beam < Math.min(eye.x, target.x) || boat.x - boat.beam > Math.max(eye.x, target.x) || boat.z + boat.length < Math.min(eye.z, target.z) || boat.z - boat.length > Math.max(eye.z, target.z)) continue;
        const surface = wave(boat.x, boat.z, time, swell).h;
        clearCameraBounds(eye, target, [{minX: boat.x - boat.beam / 2 - 0.4, maxX: boat.x + boat.beam / 2 + 0.4, minZ: boat.z - boat.length / 2 - 0.4, maxZ: boat.z + boat.length / 2 + 0.4, bottom: surface - 1.5, top: surface + (boat.model === 'boat-house-a' ? 5 : 2.5)}], 0.8, pass > 0);
      }
    }
  }
  return eye;
}
