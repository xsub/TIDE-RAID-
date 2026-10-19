import * as THREE from 'three';

export function createRain(scene) {
  const count = 480;
  const positions = new Float32Array(count * 6);
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({color: 0xb7d5e4, transparent: true, opacity: 0.35, depthWrite: false});
  const rain = new THREE.LineSegments(geometry, material); rain.frustumCulled = false; scene.add(rain);
  return {update(time, state, weather) {
    rain.visible = weather.rain > 0;
    if (!rain.visible) return;
    rain.position.set(state.x, 0, state.z);
    material.opacity = (0.22 + weather.daylight * 0.2) * weather.rain;
    const driftX = Math.cos(weather.windAngle) * weather.wind;
    const driftZ = Math.sin(weather.windAngle) * weather.wind;
    for (let index = 0; index < count; index++) {
      const phase = index * 0.61803398875 % 1;
      const height = ((phase * 80 - time * 32) % 80 + 80) % 80;
      const lateral = ((index * 19.37 + time * driftX * 12) % 160 + 160) % 160 - 80;
      const longitudinal = ((index * 31.71 + time * driftZ * 12) % 160 + 160) % 160 - 80;
      positions.set([lateral, height, longitudinal, lateral - driftX * 0.7, height + 1.7, longitudinal - driftZ * 0.7], index * 6);
    }
    geometry.attributes.position.needsUpdate = true;
  }};
}
