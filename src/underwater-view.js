import * as THREE from 'three';
import {sampleWave} from './waves.js';

export function createUnderwaterView(scene, host) {
  const tint = document.createElement('div');
  Object.assign(tint.style, {position: 'absolute', inset: '0', pointerEvents: 'none', background: 'linear-gradient(#063f5477,#026c6177)', opacity: '0'});
  tint.setAttribute('aria-hidden', 'true'); host.append(tint);
  const positions = new Float32Array(48 * 3); const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const pixels = new Uint8Array(32 * 32 * 4);
  for (let row = 0; row < 32; row++) for (let column = 0; column < 32; column++) {
    const radius = Math.hypot((column - 15.5) / 15.5, (row - 15.5) / 15.5);
    const index = (row * 32 + column) * 4;
    pixels.set([255, 255, 255, Math.round(Math.max(0, 1 - Math.abs(radius - 0.72) / 0.2) * 220)], index);
  }
  const map = new THREE.DataTexture(pixels, 32, 32); map.needsUpdate = true;
  const material = new THREE.PointsMaterial({color: 0xc1edf1, map, size: 0.12, transparent: true, depthWrite: false, opacity: 0, fog: true});
  const bubbles = new THREE.Points(geometry, material); bubbles.frustumCulled = false; bubbles.name = 'Driver underwater air haze'; scene.add(bubbles);
  const forward = new THREE.Vector3(); const across = new THREE.Vector3(); const up = new THREE.Vector3(0, 1, 0);
  return {update(time, camera, amount, air, roughness) {
    tint.style.opacity = amount.toFixed(3);
    bubbles.visible = amount > 0.01 && air > 0;
    if (!bubbles.visible) return;
    camera.getWorldDirection(forward); across.crossVectors(forward, up).normalize();
    material.opacity = amount * air * 0.6;
    for (let index = 0; index < 48; index++) {
      const distance = 1.5 + (index * 0.61803398875 % 1) * 7;
      const lateral = (index * 0.38196601125 % 1 - 0.5) * 7;
      const worldX = camera.position.x + forward.x * distance + across.x * lateral;
      const worldZ = camera.position.z + forward.z * distance + across.z * lateral;
      const height = camera.position.y - 2 + ((time * 0.7 + index * 0.37) % 5 + 5) % 5;
      const surface = sampleWave(worldX, worldZ, time, roughness).h;
      positions.set([worldX, height < surface - 0.03 ? height : -1000, worldZ], index * 3);
    }
    geometry.attributes.position.needsUpdate = true;
  }};
}
