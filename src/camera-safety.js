import {channel} from './world.js';
import {beachWidth, coastHeight} from './nature.js';
import {seabedHeight} from './seabed.js';

export function cameraGroundHeight(x, z, depthScale = 1) {
  const banks = channel(z);
  const side = x < banks.left ? -1 : x > banks.right ? 1 : 0;
  if (!side) return seabedHeight(x, z, depthScale);
  const edge = side < 0 ? banks.left : banks.right;
  const distance = Math.abs(x - edge); const beach = beachWidth(z, side);
  return distance < beach ? -0.45 + distance / beach * 1.55 : coastHeight(x, z, distance - beach);
}

export function clearCameraTerrain(eye, target, terrain, waterFloor = -Infinity) {
  let height = Math.max(eye.y, waterFloor);
  for (let sample = 1; sample <= 12; sample++) {
    const fraction = sample / 12;
    const ground = terrain(target.x + (eye.x - target.x) * fraction, target.z + (eye.z - target.z) * fraction);
    height = Math.max(height, target.y + (ground + 1.5 - target.y) / fraction);
  }
  eye.y = height;
  return eye;
}

export function cameraDefaults(mode) {
  return mode === 'pilot' ? {pilotYaw: 0, pilotPitch: 0} : {cameraAngle: 20, cameraZoom: 1, manualCamera: false, cameraElevation: 30, cameraHeight: 15};
}
