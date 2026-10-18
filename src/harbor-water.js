import {SERVICE_STATIONS} from './voyage.js';
let enabled = false;
export function setHarborShelter(value) {enabled = Boolean(value);}
export function harborWater(x, z) {
  if (!enabled) return {scale: 1, dx: 0, dz: 0};
  for (const station of SERVICE_STATIONS) {
    const deltaX = x - station.x; const deltaZ = z - station.z;
    if (Math.abs(deltaZ) >= 60) continue;
    const distance = Math.hypot(deltaX, deltaZ);
    if (distance >= 60) continue;
    const fraction = distance / 60;
    const derivative = 0.7 * 6 * fraction * (1 - fraction) / 60 / Math.max(0.001, distance);
    return {scale: 0.3 + 0.7 * fraction * fraction * (3 - 2 * fraction), dx: deltaX * derivative, dz: deltaZ * derivative};
  }
  return {scale: 1, dx: 0, dz: 0};
}
export const harborGLSL = `uniform float uHarborShelter;
void harborField(vec2 point, out float scale, out vec2 gradient) {
scale=1.0;gradient=vec2(0.0);if(uHarborShelter<0.5)return;
${SERVICE_STATIONS.map((station) => `{vec2 delta=point-vec2(${station.x.toFixed(6)},${station.z.toFixed(6)});float radius=length(delta);if(radius<60.0){float fraction=radius/60.0;scale=0.3+0.7*fraction*fraction*(3.0-2.0*fraction);gradient=delta*(0.7*6.0*fraction*(1.0-fraction)/60.0/max(0.001,radius));return;}}`).join('\n')}
}`;
