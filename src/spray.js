import * as THREE from 'three';
import {sampleWave} from './waves.js';

export function createSpray(scene) {
  const count = 384;
  const positions = new Float32Array(count * 3);
  const birth = new Float32Array(count).fill(-100);
  const velocities = new Float32Array(count * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aBirth', new THREE.BufferAttribute(birth, 1));
  geometry.setAttribute('aVelocity', new THREE.BufferAttribute(velocities, 3));
  const uniforms = {uTime: {value: 0}, uPixelRatio: {value: Math.min(devicePixelRatio, 1.75)}};
  const material = new THREE.ShaderMaterial({transparent: true, depthWrite: false, uniforms,
    vertexShader: `
      attribute float aBirth; attribute vec3 aVelocity;
      uniform float uTime; uniform float uPixelRatio;
      varying float vAlpha;
      void main() {
        float age = max(0.0, uTime - aBirth);
        vAlpha = (1.0 - smoothstep(0.1, 1.3, age)) * 0.55;
        vec3 point = position + aVelocity * min(age, 1.3);
        point.y -= 3.5 * min(age * age, 2.0);
        vec4 view = modelViewMatrix * vec4(point, 1.0);
        gl_Position = projectionMatrix * view;
        gl_PointSize = age > 1.3 ? 0.0 : clamp(220.0 * uPixelRatio / max(1.0, -view.z), 1.0, 15.0);
      }
    `,
    fragmentShader: `varying float vAlpha; void main() {
      float radius = length(gl_PointCoord - 0.5) * 2.0;
      float alpha = (1.0 - smoothstep(0.0, 1.0, radius)) * vAlpha;
      if (alpha < 0.01) discard;
      gl_FragColor = vec4(0.86, 0.97, 0.95, alpha);
    }`,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  scene.add(points);
  let cursor = 0;
  let accumulator = 0;
  let seed = 731;
  function random() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  return {
    reset() {birth.fill(-100); geometry.attributes.aBirth.needsUpdate = true; accumulator = 0; cursor = 0; seed = 731;},
    update(state, time, dt, swell) {
      uniforms.uTime.value = time;
      if (state.speed < 5 || state.airtime > 0.15) return;
      accumulator += dt * Math.min(130, state.speed * 4);
      while (accumulator >= 1) {
        accumulator--;
        const index = cursor++ % count;
        const side = index % 2 ? -1 : 1;
        const cosine = Math.cos(state.heading);
        const sine = Math.sin(state.heading);
        const x = state.x + sine * 2 + side * cosine * 1.2;
        const z = state.z + cosine * 2 - side * sine * 1.2;
        positions.set([x, sampleWave(x, z, time, swell).h + 0.15, z], index * 3);
        velocities.set([side * cosine * 3 + sine * 3, 1 + random() * 2.5, -side * sine * 3 + cosine * 3], index * 3);
        birth[index] = time;
      }
      for (const attribute of Object.values(geometry.attributes)) attribute.needsUpdate = true;
    },
  };
}
