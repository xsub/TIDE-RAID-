import {chunkIndex, chunkFeatures, CHUNK_COUNT} from './world.js';
import {natureLayout} from './nature.js';
import {harborLayout} from './harbor-layout.js';
import {mooredLayout} from './moored-boats.js';
import {cameraGroundHeight} from './camera-safety.js';

const sectors = new Map();
const axes = ['x', 'y', 'z'];
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

export function clearCameraBounds(eye, target, bounds, margin = 0.8) {
  for (const box of bounds) {
    if (Math.max(eye.x, target.x) < box.minX - margin || Math.min(eye.x, target.x) > box.maxX + margin || Math.max(eye.z, target.z) < box.minZ - margin || Math.min(eye.z, target.z) > box.maxZ + margin) continue;
    let enter = 0; let exit = 1;
    for (const axis of axes) {
      const delta = eye[axis] - target[axis];
      const low = box[axis === 'x' ? 'minX' : axis === 'y' ? 'bottom' : 'minZ'] - margin;
      const high = box[axis === 'x' ? 'maxX' : axis === 'y' ? 'top' : 'maxZ'] + margin;
      if (Math.abs(delta) < 1e-9) {
        if (target[axis] < low || target[axis] > high) {exit = -1; break;}
      } else {
        const first = (low - target[axis]) / delta; const second = (high - target[axis]) / delta;
        enter = Math.max(enter, Math.min(first, second)); exit = Math.min(exit, Math.max(first, second));
      }
    }
    if (enter > exit) continue;
    if (enter > 0) {
      const distance = Math.hypot(eye.x - target.x, eye.y - target.y, eye.z - target.z);
      const fraction = Math.max(0, enter - 0.001 / Math.max(0.001, distance));
      for (const axis of axes) eye[axis] = target[axis] + (eye[axis] - target[axis]) * fraction;
    } else if (exit >= 1) {
      const faces = [
        ['x', box.minX - margin], ['x', box.maxX + margin],
        ['y', box.bottom - margin], ['y', box.top + margin],
        ['z', box.minZ - margin], ['z', box.maxZ + margin],
      ];
      let nearest = faces[0];
      for (const face of faces) if (Math.abs(eye[face[0]] - face[1]) < Math.abs(eye[nearest[0]] - nearest[1])) nearest = face;
      eye[nearest[0]] = nearest[1];
    }
  }
  return eye;
}

export function smoothCameraBoom(previous, desired, limit, elapsed) {
  const duration = Math.max(0, Math.min(0.1, elapsed));
  return Math.min(limit, previous + (desired - previous) * (1 - Math.exp(-(desired < previous ? 14 : 2.5) * duration)));
}

export function clearCameraObjects(eye, target, exploring, time, swell, wave, follow = null, elapsed = 0, reset = false) {
  const first = Math.max(0, Math.min(chunkIndex(eye.z - 32), chunkIndex(target.z - 32)) - 1);
  const last = Math.min(CHUNK_COUNT - 1, Math.max(chunkIndex(eye.z + 32), chunkIndex(target.z + 32)) + 1);
  const desired = {...eye}; const safe = {...eye};
  for (let pass = follow ? 0 : 1; pass < 2; pass++) {
    const candidate = pass ? safe : desired;
    const margin = pass ? 0.8 : 3;
    for (let index = first; index <= last; index++) {
      clearCameraBounds(candidate, target, cameraObstacleLayout(index), margin);
      if (exploring) for (const boat of mooredLayout(index)) {
        if (boat.x + boat.beam < Math.min(eye.x, target.x) || boat.x - boat.beam > Math.max(eye.x, target.x) || boat.z + boat.length < Math.min(eye.z, target.z) || boat.z - boat.length > Math.max(eye.z, target.z)) continue;
        const surface = wave(boat.x, boat.z, time, swell).h;
        clearCameraBounds(candidate, target, [{minX: boat.x - boat.beam / 2 - 0.4, maxX: boat.x + boat.beam / 2 + 0.4, minZ: boat.z - boat.length / 2 - 0.4, maxZ: boat.z + boat.length / 2 + 0.4, bottom: surface - 1.5, top: surface + (boat.model === 'boat-house-a' ? 5 : 2.5)}], margin);
      }
    }
  }
  const distance = Math.hypot(eye.x - target.x, eye.y - target.y, eye.z - target.z);
  const fraction = (point) => distance > 0.00001 ? Math.min(1, Math.hypot(point.x - target.x, point.y - target.y, point.z - target.z) / distance) : 1;
  const limit = fraction(safe);
  if (follow) {
    const projected = axes.reduce((total, axis) => total + (safe[axis] - target[axis]) * (eye[axis] - target[axis]), 0) / Math.max(0.00000001, distance * distance);
    if (axes.some((axis) => Math.abs(safe[axis] - target[axis] - (eye[axis] - target[axis]) * projected) > 0.001) || (distance < 0.00001 && Math.hypot(safe.x - eye.x, safe.y - eye.y, safe.z - eye.z) > 0.001)) {
      follow.fraction = 1; Object.assign(eye, safe); return eye;
    }
    follow.fraction = reset ? limit : smoothCameraBoom(follow.fraction ?? 1, fraction(desired), limit, elapsed);
    for (const axis of axes) eye[axis] = target[axis] + (eye[axis] - target[axis]) * follow.fraction;
  } else Object.assign(eye, safe);
  return eye;
}
