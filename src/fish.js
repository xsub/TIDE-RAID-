import * as THREE from 'three';
import {waterDepth} from './depth.js';
import {sampleWave} from './waves.js';

export function createFish(group) {
  const body = new THREE.SphereGeometry(1, 8, 5).scale(0.11, 0.19, 0.43).toNonIndexed();
  const vertices = [...body.attributes.position.array, 0, 0, -0.34, 0, 0.23, -0.67, 0, -0.23, -0.67,
    0, 0.15, 0.1, 0, 0.32, -0.12, 0, 0.15, -0.25];
  body.dispose();
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geometry.computeVertexNormals();
  const clock = {value: 0};
  const material = new THREE.MeshStandardMaterial({color: 0xc2d6ca, metalness: 0.28, roughness: 0.45, side: THREE.DoubleSide});
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uFishTime = clock;
    shader.vertexShader = 'uniform float uFishTime;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      float phase=instanceMatrix[3].x*0.7+instanceMatrix[3].z*0.4;
      transformed.x+=sin(uFishTime*9.0+phase+position.z*4.0)*max(0.0,-position.z)*0.18;`);
  };
  material.customProgramCacheKey = () => 'school-fish-tail-v1';
  const mesh = new THREE.InstancedMesh(geometry, material, 48); mesh.name = 'Underwater fish schools'; mesh.count = 0; group.add(mesh);
  const transform = new THREE.Object3D(); const color = new THREE.Color(); let lastTick = '';
  return {update(state, camera, time) {
    clock.value = time;
    const cellX = Math.round(camera.position.x / 32); const cellZ = Math.round(camera.position.z / 32);
    const key = `${cellX}/${cellZ}/${state.depthScale ?? 1}/${Math.floor(time * 20)}`;
    if (key === lastTick) return;
    lastTick = key; let count = 0;
    for (let school = 0; school < 6; school++) {
      const anchorX = cellX * 32 + (school % 3 - 1) * 18;
      const anchorZ = cellZ * 32 + (Math.floor(school / 3) - 0.5) * 24;
      const phase = time * (0.18 + school * 0.012) + anchorX * 0.17 + anchorZ * 0.13;
      for (let member = 0; member < 8; member++) {
        const angle = phase + member * 0.055;
        const worldX = anchorX + Math.cos(angle) * 7 + (member % 3) * 0.8;
        const worldZ = anchorZ + Math.sin(angle) * 5 + Math.floor(member / 3) * 0.7;
        const depth = waterDepth(worldX, worldZ, state.depthScale);
        const surface = sampleWave(worldX, worldZ, time, state.roughness ?? 1).h;
        if (depth < 3 || surface + depth < 2) continue;
        const height = Math.min(surface - 0.8, Math.max(-depth + 0.8, -depth * (school % 2 ? 0.8 : 0.45) + Math.sin(phase + member) * 0.3));
        transform.position.set(worldX, height, worldZ);
        transform.rotation.set(0, Math.atan2(-7 * Math.sin(angle), 5 * Math.cos(angle)), 0);
        transform.scale.setScalar(0.65 + member * 0.045); transform.updateMatrix(); mesh.setMatrixAt(count, transform.matrix);
        color.setHSL(0.47 + school * 0.025, 0.15 + school * 0.02, 0.48 + member * 0.018); mesh.setColorAt(count++, color);
      }
    }
    mesh.count = count; mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }};
}
