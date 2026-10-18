import * as THREE from 'three';
import {sampleWave} from './waves.js';

export function createSinkingBubbles(scene, capacity = 192) {
  const positions = new Float32Array(capacity * 3); const sizes = new Float32Array(capacity); const alpha = new Float32Array(capacity);
  const particles = Array.from({length: capacity}, () => ({active: false, x: 0, y: 0, z: 0, age: 0, surfaced: 0, radius: 0.1}));
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3)); geometry.setAttribute('bubbleSize', new THREE.BufferAttribute(sizes, 1)); geometry.setAttribute('bubbleAlpha', new THREE.BufferAttribute(alpha, 1));
  const material = new THREE.ShaderMaterial({transparent: true, depthWrite: false,
    vertexShader: 'attribute float bubbleSize; attribute float bubbleAlpha; varying float vAlpha; void main(){vAlpha=bubbleAlpha; vec4 point=modelViewMatrix*vec4(position,1.0); gl_Position=projectionMatrix*point; gl_PointSize=clamp(bubbleSize*700.0/max(1.0,-point.z),1.0,28.0);}',
    fragmentShader: 'varying float vAlpha; void main(){float radius=length(gl_PointCoord-0.5)*2.0; if(radius>1.0)discard; float rim=smoothstep(0.45,0.75,radius)*(1.0-smoothstep(0.8,1.0,radius)); gl_FragColor=vec4(0.7,0.92,1.0,vAlpha*(rim*0.8+0.1));}',
  });
  const points = new THREE.Points(geometry, material); points.frustumCulled = false; points.name = 'Escaping air and surface bubble rings'; scene.add(points);
  let seed = 591; let cursor = 0; let accumulator = 0;
  function random() {seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296;}
  return {
    reset() {for (const particle of particles) particle.active = false; positions.fill(0); sizes.fill(0); alpha.fill(0); seed = 591; cursor = 0; accumulator = 0; for (const attribute of Object.values(geometry.attributes)) attribute.needsUpdate = true;},
    update(state, voyage, dt, time, roughness, enabled) {
      points.visible = enabled;
      if (!enabled) return;
      const rate = voyage.flooding > 0.02 ? Math.min(12, voyage.flooding * 18) * (voyage.sinking?.air ?? 1) : 0;
      accumulator = Math.min(capacity, accumulator + rate * dt);
      while (accumulator >= 1) {
        accumulator--;
        const particle = particles[cursor]; cursor = (cursor + 1) % capacity;
        const across = (random() - 0.5) * state.beam * 0.7; const along = (random() - 0.5) * state.length * 0.65;
        particle.x = state.x + Math.cos(state.heading) * across + Math.sin(state.heading) * along;
        particle.z = state.z - Math.sin(state.heading) * across + Math.cos(state.heading) * along;
        const surface = sampleWave(particle.x, particle.z, time, roughness).h;
        particle.y = Math.min(surface - 0.15, state.y - 0.5); particle.age = 0; particle.surfaced = 0; particle.radius = 0.08 + random() * 0.12; particle.active = true;
      }
      for (let index = 0; index < capacity; index++) {
        const particle = particles[index]; alpha[index] = 0;
        if (!particle.active) continue;
        particle.age += dt;
        const surface = sampleWave(particle.x, particle.z, time, roughness).h;
        particle.y += dt * (0.65 + particle.radius * 3);
        particle.x += Math.sin(time * 2 + index) * dt * 0.06;
        if (particle.y >= surface) {particle.y = surface + 0.08; particle.surfaced += dt;}
        if (particle.age > 14 || particle.surfaced > 0.65) {particle.active = false; continue;}
        positions.set([particle.x, particle.y, particle.z], index * 3);
        sizes[index] = particle.radius * 2 + particle.surfaced * 1.3;
        alpha[index] = Math.min(1, particle.age * 5) * Math.max(0, 1 - particle.surfaced / 0.65);
      }
      for (const attribute of Object.values(geometry.attributes)) attribute.needsUpdate = true;
    },
  };
}
