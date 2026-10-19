import * as THREE from 'three';
import {chunkIndex, CHUNK_COUNT} from './world.js';
import {mooredLayout, MOORED_TYPES} from './moored-boats.js';
import {sampleWave} from './waves.js';

export const MAX_MOORED_BOATS = 18;
export function createMooredView(scene) {
  const group = new THREE.Group(); group.name = 'Instanced harbor moorings'; group.visible = false; scene.add(group);
  const batches = new Map(); const visible = []; const transform = new THREE.Object3D(); const matrix = new THREE.Matrix4();
  const counts = new Map(); const buoyTransform = new THREE.Object3D();
  const buoys = new THREE.InstancedMesh(new THREE.ConeGeometry(0.3, 0.6, 8), new THREE.MeshStandardMaterial({color: 0xd4c39a, roughness: 0.8}), MAX_MOORED_BOATS); buoys.count = 0; buoys.frustumCulled = false; group.add(buoys);
  const ropePositions = new Float32Array(MAX_MOORED_BOATS * 6);
  const ropeGeometry = new THREE.BufferGeometry(); ropeGeometry.setAttribute('position', new THREE.BufferAttribute(ropePositions, 3));
  const ropes = new THREE.LineSegments(ropeGeometry, new THREE.LineBasicMaterial({color: 0x9b9984})); ropes.frustumCulled = false; group.add(ropes);
  let lastCell = '';
  return {setFactory(factory) {
    if (batches.size) return;
    for (const type of MOORED_TYPES) {
      const template = factory(type.model, type.length); template.updateMatrixWorld(true); const parts = [];
      template.traverse((part) => {
        if (!part.isMesh) return;
        const mesh = new THREE.InstancedMesh(part.geometry, part.material, 6); mesh.count = 0; mesh.frustumCulled = false; group.add(mesh);
        parts.push({mesh, local: part.matrixWorld.clone()});
      });
      batches.set(type.model, parts);
    }
  }, update(player, time, swell, enabled) {
    group.visible = Boolean(enabled && batches.size); if (!group.visible) return;
    const cell = `${Math.floor(player.x / 32)}/${Math.floor(player.z / 32)}`;
    if (cell !== lastCell) {
      lastCell = cell; visible.length = 0;
      const sector = chunkIndex(player.z); counts.clear();
      for (let index = Math.max(0, sector - 3); index <= Math.min(CHUNK_COUNT - 1, sector + 3); index++) for (const boat of mooredLayout(index)) {
        const count = counts.get(boat.model) ?? 0;
        if (count >= 6 || visible.length >= MAX_MOORED_BOATS || Math.hypot(player.x - boat.x, player.z - boat.z) > 500) continue;
        visible.push(boat); counts.set(boat.model, count + 1);
      }
    }
    counts.clear(); let buoyCount = 0;
    visible.forEach((boat, index) => {
      const instance = counts.get(boat.model) ?? 0; counts.set(boat.model, instance + 1);
      const wave = sampleWave(boat.x, boat.z, time, swell);
      const pitch = Math.max(-0.12, Math.min(0.12, -wave.dz * Math.cos(boat.heading) * 0.35));
      transform.position.set(boat.x, wave.h + 0.5, boat.z); transform.rotation.set(pitch, boat.heading + Math.sin(time * 0.35 + boat.id) * 0.015, Math.max(-0.1, Math.min(0.1, wave.dx * 0.3)), 'YXZ'); transform.updateMatrix();
      for (const part of batches.get(boat.model)) {matrix.multiplyMatrices(transform.matrix, part.local); part.mesh.setMatrixAt(instance, matrix);}
      let tetherHeight = 1.1;
      if (boat.buoy) {
        tetherHeight = sampleWave(boat.tetherX, boat.tetherZ, time, swell).h + 0.3;
        buoyTransform.position.set(boat.tetherX, tetherHeight, boat.tetherZ); buoyTransform.updateMatrix(); buoys.setMatrixAt(buoyCount++, buoyTransform.matrix);
      }
      ropePositions.set([boat.x + Math.sign(boat.tetherX - boat.x) * boat.beam * 0.45, wave.h + 0.9, boat.z, boat.tetherX, tetherHeight, boat.tetherZ], index * 6);
    });
    for (const [model, parts] of batches) for (const part of parts) {part.mesh.count = counts.get(model) ?? 0; part.mesh.instanceMatrix.needsUpdate = true;}
    ropeGeometry.setDrawRange(0, visible.length * 2); ropeGeometry.attributes.position.needsUpdate = true;
    buoys.count = buoyCount; buoys.instanceMatrix.needsUpdate = true;
  }};
}
