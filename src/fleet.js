import * as THREE from 'three';
import {createVessel, VESSEL_STYLES} from './vessels.js';
import {TRAFFIC_TYPES} from './traffic.js';
import {sampleWave} from './waves.js';

export async function loadFleet() {
  const names = Object.keys(VESSEL_STYLES);
  const templates = new Map();
  for (const name of names) templates.set(name, createVessel(VESSEL_STYLES[name]));
  return (name, length) => {
    const model = templates.get(name).clone(true);
    const bounds = new THREE.Box3().setFromObject(model);
    const center = bounds.getCenter(new THREE.Vector3());
    const scale = length / (bounds.max.z - bounds.min.z);
    model.scale.setScalar(scale);
    model.position.set(-center.x * scale, -bounds.min.y * scale - 0.65, -center.z * scale);
    const group = new THREE.Group();
    group.add(model);
    return group;
  };
}

export function createTrafficView(scene, factory, traffic) {
  const meshes = traffic.boats.map((ship) => {
    const mesh = factory(ship.model, ship.length);
    scene.add(mesh);
    return mesh;
  });
  const wakeGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array(meshes.length * 12 * 3);
  wakeGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const wakes = new THREE.Mesh(wakeGeometry, new THREE.MeshBasicMaterial({color: 0xd4f5e9, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide}));
  wakes.frustumCulled = false;
  scene.add(wakes);
  return (current, time, swell) => {
    current.boats.forEach((ship, index) => {
      const mesh = meshes[index];
      mesh.visible = ship.active;
      const wave = sampleWave(ship.x, ship.z, time, swell);
      mesh.position.set(ship.x, wave.h + 0.5, ship.z);
      mesh.rotation.set(Math.atan(-wave.dx * Math.sin(ship.heading) - wave.dz * Math.cos(ship.heading)) * 0.5, ship.heading,
        Math.atan(wave.dx * Math.cos(ship.heading) - wave.dz * Math.sin(ship.heading)) * 0.5, 'YXZ');
      let vertex = index * 36;
      for (const side of [-1, 1]) {
        const corners = [[side * 1, 3], [side * 6, 24], [side * 6.7, 24], [side * 1, 3], [side * 6.7, 24], [side * 1.4, 3]];
        for (const [across, aft] of corners) {
          const x = ship.x + Math.cos(ship.heading) * across + Math.sin(ship.heading) * aft;
          const z = ship.z - Math.sin(ship.heading) * across + Math.cos(ship.heading) * aft;
          positions.set([x, ship.active ? sampleWave(x, z, time, swell).h + 0.08 : -100, z], vertex);
          vertex += 3;
        }
      }
    });
    wakeGeometry.attributes.position.needsUpdate = true;
  };
}
