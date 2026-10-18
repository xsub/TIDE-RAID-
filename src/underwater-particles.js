import * as THREE from 'three';
export function createUnderwaterParticles(scene) {
  const positions = new Float32Array(128 * 3);
  for (let index = 0; index < 128; index++) positions.set([((index * 0.61803398875) % 1 - 0.5) * 28, ((index * 0.38196601125) % 1 - 0.5) * 20, ((index * 0.754877666) % 1 - 0.5) * 28], index * 3);
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({color: 0xb8d9b3, size: 0.04, transparent: true, opacity: 0.2, depthWrite: false, fog: true});
  const points = new THREE.Points(geometry, material); points.name = 'Suspended underwater sediment'; points.frustumCulled = false; scene.add(points);
  return {update(time, camera, amount, sun) {
    points.visible = amount > 0.01;
    if (!points.visible) return;
    points.position.set(Math.round(camera.position.x / 8) * 8 + Math.sin(time * 0.08), Math.min(-11, Math.round(camera.position.y / 8) * 8), Math.round(camera.position.z / 8) * 8);
    material.opacity = amount * (0.08 + Math.max(0, Math.min(1, sun)) * 0.18);
  }};
}
