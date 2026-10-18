import * as THREE from 'three';
import {waterDepth} from './depth.js';

export function createSeagrass(group) {
  const geometry = new THREE.PlaneGeometry(0.16, 1, 1, 4).translate(0, 0.5, 0);
  const clock = {value: 0};
  const material = new THREE.MeshStandardMaterial({color: 0x688445, roughness: 0.92, side: THREE.DoubleSide});
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uGrassTime = clock;
    shader.vertexShader = 'uniform float uGrassTime;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vec3 root=(instanceMatrix*vec4(0.0,0.0,0.0,1.0)).xyz;
      transformed.x+=sin(uGrassTime*0.85+root.x*0.3+root.z*0.2+position.y*1.8)*position.y*position.y*0.16;
      transformed.x*=1.0-position.y*0.85;`);
  };
  material.customProgramCacheKey = () => 'seagrass-sway-v1';
  const mesh = new THREE.InstancedMesh(geometry, material, 1536); mesh.name = 'Seabed seagrass meadows'; mesh.count = 0; group.add(mesh);
  const transform = new THREE.Object3D(); const color = new THREE.Color();
  const hash = (seed) => {const value = Math.sin(seed * 127.1 + 31.7) * 43758.5453; return value - Math.floor(value);};
  return {animate(time) {clock.value = time;}, rebuild(cellX, cellZ, scale) {
    let count = 0;
    for (let row = -12; row <= 12 && count < 1536; row++) for (let column = -12; column <= 12 && count < 1536; column++) {
      const gridX = cellX * 8 + column; const gridZ = cellZ * 8 + row;
      const seed = gridX * 73 + gridZ * 199;
      if (hash(Math.floor(gridX / 4) * 71 + Math.floor(gridZ / 4) * 131) < 0.32) continue;
      const worldX = gridX * 4 + hash(seed) * 3; const worldZ = gridZ * 4 + hash(seed + 1) * 3;
      const depth = waterDepth(worldX, worldZ, scale);
      if (depth < 1 || depth > 38) continue;
      const height = (0.6 + hash(seed + 2) * 1.5) * Math.max(0.35, 1 - depth / 60);
      for (let blade = 0; blade < 3; blade++) {
        transform.position.set(worldX + blade * 0.14, -depth - 0.12, worldZ);
        transform.rotation.set(0, hash(seed + blade + 3) * Math.PI * 2, 0);
        transform.scale.set(0.8 + hash(seed + 7), height, 1); transform.updateMatrix();
        mesh.setMatrixAt(count, transform.matrix);
        color.setHSL(0.2 + hash(seed + 8) * 0.08, 0.25, 0.3 + hash(seed + 9) * 0.18); mesh.setColorAt(count++, color);
        if (count === 1536) break;
      }
      if (count === 1536) break;
    }
    mesh.count = count; mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }};
}
