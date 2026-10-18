import * as THREE from 'three';
import {SERVICE_STATIONS} from './voyage.js';

export function createServiceView(scene) {
  const group = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({color: 0x806c50, roughness: 0.8});
  const green = new THREE.MeshStandardMaterial({color: 0x40d7a0, emissive: 0x135c42, roughness: 0.5});
  const white = new THREE.MeshStandardMaterial({color: 0xe7eee4});
  const box = new THREE.BoxGeometry(1, 1, 1);
  for (const station of SERVICE_STATIONS) {
    const dock = new THREE.Group(); dock.position.set(station.x + 9, 0, station.z);
    for (const [material, position, scale] of [[wood, [0, 1.1, 0], [5, 0.5, 10]], [white, [0, 2.5, 0], [1.6, 2.5, 1.2]], [green, [0, 4, 0], [2, 0.7, 1.4]], [green, [0, 9, 0], [5, 0.4, 0.7]], [green, [0, 9, 0], [0.7, 0.4, 5]]]) {
      const mesh = new THREE.Mesh(box, material); mesh.position.set(...position); mesh.scale.set(...scale); dock.add(mesh);
    }
    group.add(dock);
  }
  scene.add(group);
  return {update(z, enabled) {group.visible = enabled; for (const dock of group.children) dock.visible = Math.abs(dock.position.z - z) < 1000;}};
}

export function createWearView(boat) {
  const positions = [];
  for (let scratch = 0; scratch < 40; scratch++) {
    const side = scratch % 2 ? 1 : -1;
    const height = 0.15 + (scratch % 5) * 0.06;
    const longitudinal = -0.3 + Math.floor(scratch / 2) / 20 * 0.65;
    positions.push(side * 0.5, height, longitudinal, side * 0.5, height + 0.04, longitudinal + 0.06);
  }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const scratches = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({color: 0xc8b8a0}));
  boat.add(scratches);
  const originals = new WeakMap();
  return {update(voyage, state, active) {
    if (scratches.parent !== boat) boat.add(scratches);
    scratches.visible = active;
    scratches.scale.set(state.beam, 1, state.length);
    geometry.setDrawRange(0, Math.floor((1 - voyage.hull) * 40) * 2);
    const damage = active ? Math.floor((1 - voyage.hull) * 20) / 20 : 0;
    boat.traverse((child) => {
      if (!child.isMesh) return;
      if (!originals.has(child)) {
        child.geometry = child.geometry.clone();
        originals.set(child, {positions: child.geometry.attributes.position.array.slice(), damage: -1});
      }
      const original = originals.get(child);
      if (original.damage === damage) return;
      original.damage = damage;
      const vertices = child.geometry.attributes.position;
      for (let index = 0; index < vertices.count; index++) {
        const offset = index * 3;
        const lateral = original.positions[offset];
        const height = original.positions[offset + 1];
        const longitudinal = original.positions[offset + 2];
        const dent = damage * Math.sin(longitudinal * 2.1) ** 8 * 0.18;
        vertices.setXYZ(index, lateral * (1 - dent), height - dent * Math.abs(lateral) * 0.25, longitudinal);
      }
      vertices.needsUpdate = true; child.geometry.computeVertexNormals(); child.geometry.computeBoundingSphere();
    });
  }};
}
