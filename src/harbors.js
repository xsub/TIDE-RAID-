import * as THREE from 'three';
import {harborLayout} from './harbor-layout.js';
import {channel} from './world.js';
import {beachWidth, coastHeight} from './nature.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export function createHarbors(fade = null) {
  const surfaces = [0xe7dfc9, 0xd7ab84, 0xc3d5d0, 0xdcc98c].map((color) => new THREE.MeshStandardMaterial({color, roughness: 0.9}));
  const roof = new THREE.MeshStandardMaterial({color: 0x994f3b, roughness: 0.9});
  const wood = new THREE.MeshStandardMaterial({color: 0x806347, roughness: 0.95});
  const stone = new THREE.MeshStandardMaterial({color: 0x8d918b, roughness: 1});
  const glass = new THREE.MeshStandardMaterial({color: 0x193d4f, roughness: 0.23, metalness: 0.3});
  const white = surfaces[0];
  const red = new THREE.MeshStandardMaterial({color: 0xad4838, roughness: 0.7});
  const lantern = new THREE.MeshStandardMaterial({color: 0xffe8a0, emissive: 0xffc54b, emissiveIntensity: 2});
  const box = new THREE.BoxGeometry(1, 1, 1);
  const cylinder = new THREE.CylinderGeometry(1, 1, 1, 20);
  const cone = new THREE.ConeGeometry(1, 1, 20);
  const roofShape = new THREE.Shape();
  roofShape.moveTo(-0.5, 0); roofShape.lineTo(0.5, 0); roofShape.lineTo(0, 1); roofShape.closePath();
  const gable = new THREE.ExtrudeGeometry(roofShape, {depth: 1, bevelEnabled: false}).translate(0, 0, -0.5);
  const shared = new Set([box, cylinder, cone, gable]);
  const beams = new Set();
  function ground(x, z, side) {
    const banks = channel(z);
    const edge = side < 0 ? banks.left : banks.right;
    return coastHeight(x, z, Math.max(0, Math.abs(x - edge) - beachWidth(z, side)));
  }
  function part(group, geometry, material, position, scale, rotation = 0) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position); mesh.scale.set(...scale); mesh.rotation.y = rotation;
    mesh.userData.cameraFade = group.userData.cameraFade ? 1 : 0;
    group.add(mesh);
    return mesh;
  }
  function consolidate(group) {
    group.updateMatrixWorld(true);
    const batches = new Map();
    for (const child of [...group.children]) {
      if (!child.isMesh || child.userData.beacon) continue;
      const list = batches.get(child.material) ?? [];
      const geometry = child.geometry.index ? child.geometry.toNonIndexed() : child.geometry.clone();
      if (fade) geometry.setAttribute('cameraFade', new THREE.Float32BufferAttribute(new Float32Array(geometry.attributes.position.count).fill(child.userData.cameraFade), 1));
      list.push(geometry.applyMatrix4(child.matrix));
      batches.set(child.material, list);
      group.remove(child);
    }
    for (const [material, geometries] of batches) {
      const merged = mergeGeometries(geometries);
      for (const geometry of geometries) geometry.dispose();
      group.add(new THREE.Mesh(merged, fade ? fade.patch(material, true) : material));
    }
  }
  return {
    shared,
    update(time, night = 0) {
      lantern.emissiveIntensity = 0.5 + night * 5;
      for (const beam of beams) {
        beam.rotation.y = time * 0.3 + beam.position.z * 0.01;
        beam.children[0].material.opacity = 0.008 + night * 0.11;
      }
    },
    forget(group) {group.traverse((child) => {if (child.userData.beacon) beams.delete(child); if (child.userData.localMaterial) child.material.dispose();});},
    add(parent, index) {
      const layout = harborLayout(index);
      const group = new THREE.Group();
      group.name = `Coastal settlement ${index}`;
      group.userData.cameraFade = true;
      for (const house of layout.buildings) {
        const y = ground(house.x, house.z, house.side);
        part(group, box, stone, [house.x, y + 0.1, house.z], [house.width + 1, 1.8, house.depth + 1]);
        part(group, box, surfaces[house.style], [house.x, y + house.height / 2 + 0.8, house.z], [house.width, house.height, house.depth]);
        part(group, gable, roof, [house.x, y + house.height + 0.8, house.z], [house.width + 1.5, 3, house.depth + 1.5]);
        part(group, box, stone, [house.x + 2, y + house.height + 3.3, house.z + 2], [1.2, 3.5, 1.2]);
        const front = house.x - house.side * (house.width / 2 + 0.03);
        part(group, box, wood, [front, y + 2, house.z], [0.12, 2.7, 1.5]);
        for (const offset of [-3.1, 3.1]) {
          part(group, box, white, [front - house.side * 0.05, y + 3.5, house.z + offset], [0.15, 2.3, 1.8]);
          part(group, box, glass, [front - house.side * 0.14, y + 3.5, house.z + offset], [0.1, 1.8, 1.3]);
        }
        part(group, box, wood, [front - house.side * 2, y + 0.8, house.z], [3.5, 0.25, 5]);
      }
      group.userData.cameraFade = false;
      for (const dock of layout.docks) {
        const planks = Math.ceil(dock.width / 0.65);
        for (let plank = 0; plank < planks; plank++) part(group, box, wood, [dock.x - dock.width / 2 + (plank + 0.5) * dock.width / planks, 2.1, dock.z], [dock.width / planks - 0.04, 0.28, dock.depth]);
        for (const side of [-1, 1]) for (const end of [-1, 1]) {
          part(group, cylinder, wood, [dock.x + side * dock.width * 0.4, -0.2, dock.z + end * dock.depth * 0.4], [0.25, 6, 0.25]);
          part(group, box, stone, [dock.x + side * dock.width * 0.4, 2.4, dock.z + end * dock.depth * 0.4], [0.45, 0.45, 0.45]);
        }
      }
      for (const tower of layout.lighthouses) {
        const y = ground(tower.x, tower.z, tower.side);
        part(group, cylinder, stone, [tower.x, y + 0.5, tower.z], [6, 2, 6]);
        for (let band = 0; band < 6; band++) part(group, cylinder, band % 2 ? red : white, [tower.x, y + 2 + band * 3, tower.z], [3.7 - band * 0.25, 3, 3.7 - band * 0.25]);
        part(group, cylinder, stone, [tower.x, y + 18.8, tower.z], [4, 0.7, 4]);
        part(group, cylinder, glass, [tower.x, y + 20.5, tower.z], [2.6, 2.7, 2.6]);
        part(group, cone, roof, [tower.x, y + 22.8, tower.z], [4, 2.3, 4]);
        const light = part(group, new THREE.SphereGeometry(0.9, 8, 6), lantern, [tower.x, y + 20.5, tower.z], [1, 1, 1]);
        light.userData.beacon = true;
        const beam = new THREE.Group();
        beam.position.set(tower.x, y + 20.5, tower.z); beam.userData.beacon = true;
        const lens = new THREE.Mesh(new THREE.ConeGeometry(7, 90, 12, 1, true).rotateZ(Math.PI / 2).translate(45, 0, 0), new THREE.MeshBasicMaterial({color: 0xffefb1, transparent: true, opacity: 0.025, depthWrite: false, side: THREE.DoubleSide}));
        lens.userData.localMaterial = true;
        beam.add(lens); group.add(beam); beams.add(beam);
      }
      consolidate(group);
      parent.add(group);
    },
  };
}
