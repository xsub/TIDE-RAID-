import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export function createCatamaran() {
  const group = new THREE.Group();
  group.name = 'Blackjack 42 reference catamaran · no antenna';
  const paint = new THREE.MeshPhysicalMaterial({color: 0x090c19, roughness: 0.32, metalness: 0.08, clearcoat: 0.65, clearcoatRoughness: 0.24});
  const orange = new THREE.MeshStandardMaterial({color: 0xff620b, roughness: 0.32, metalness: 0.15});
  const silver = new THREE.MeshStandardMaterial({color: 0xa8b9c7, roughness: 0.24, metalness: 0.85});
  const glass = new THREE.MeshPhysicalMaterial({color: 0x8299ae, roughness: 0.19, metalness: 0.65, clearcoat: 1});
  const batches = new Map();
  function part(geometry, material, position, scale = [1, 1, 1], rotation = [0, 0, 0]) {
    const matrix = new THREE.Matrix4().compose(new THREE.Vector3(...position), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)), new THREE.Vector3(...scale));
    const baked = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    baked.applyMatrix4(matrix);
    geometry.dispose();
    if (!batches.has(material)) batches.set(material, []);
    batches.get(material).push(baked);
  }
  function box(size, material, position, radius = 0.08) {
    part(new RoundedBoxGeometry(...size, 3, radius), material, position);
  }
  for (const side of [-1, 1]) {
    const outline = new THREE.Shape();
    outline.moveTo(0, -4.65);
    outline.bezierCurveTo(-0.3, -4.5, -0.56, -3.7, -0.57, -2.6);
    outline.lineTo(-0.57, 3.5);
    outline.quadraticCurveTo(0, 3.85, 0.57, 3.5);
    outline.lineTo(0.57, -2.6);
    outline.bezierCurveTo(0.56, -3.7, 0.3, -4.5, 0, -4.65);
    const hull = new THREE.ExtrudeGeometry(outline, {depth: 0.62, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.1, bevelThickness: 0.12, curveSegments: 24});
    hull.rotateX(Math.PI / 2);
    hull.computeVertexNormals();
    part(hull, paint, [side * 1.18, 0.48, 0]);
    box([0.045, 0.035, 6.3], orange, [side * 1.65, 0.57, 0.25], 0.012);
    box([0.025, 0.065, 5.6], orange, [side * 1.86, 0.13, 0.6], 0.01);
    part(new THREE.SphereGeometry(1, 24, 12), silver, [side * 0.7, 0.67, 2.2], [0.22, 0.13, 0.68]);
    for (const positionZ of [-1.2, 2.95]) part(new THREE.CylinderGeometry(0.055, 0.055, 0.05, 10), silver, [side * 0.91, 0.59, positionZ]);
    for (let stripe = 0; stripe < 7; stripe++) box([0.025, 0.013, 0.4], orange, [side * (1.05 + stripe * 0.075), 0.6, -2.7 + stripe * 0.1], 0.004);
  }
  box([2.4, 0.36, 6.45], paint, [0, 0.33, 0.3], 0.12);
  part(new THREE.SphereGeometry(1, 40, 20), glass, [0, 0.67, 0.65], [1.02, 0.68, 1.91]);
  part(new THREE.SphereGeometry(1, 40, 20), paint, [0, 0.8, 1.03], [0.94, 0.69, 1.56]);
  box([0.065, 0.58, 0.1], paint, [0, 0.96, -0.94], 0.02);
  part(new THREE.SphereGeometry(1, 24, 12), silver, [0, 1.45, 1.12], [0.33, 0.12, 0.8]);
  box([0.4, 0.24, 0.5], silver, [0, -0.1, 3.9]);
  part(new THREE.CylinderGeometry(0.055, 0.055, 0.9, 12), silver, [0, -0.28, 4.15], [1, 1, 1], [Math.PI / 2, 0, 0]);
  box([0.06, 0.76, 0.27], orange, [0.35, -0.25, 4.35], 0.025);
  for (const direction of [-1, 1]) part(new THREE.SphereGeometry(1, 12, 8), silver, [direction * 0.15, -0.28, 4.55], [0.21, 0.07, 0.06], [0, 0, direction * 0.45]);
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 256;
    const context = canvas.getContext('2d');
    context.fillStyle = '#0b0e19'; context.fillRect(0, 0, 1024, 256);
    context.fillStyle = '#ff690f'; context.font = 'italic bold 136px sans-serif';
    context.fillText('BLACKJACK', 24, 176);
    context.fillStyle = '#b6beca'; context.font = 'italic bold 100px sans-serif'; context.fillText('42', 866, 176);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    const decal = new THREE.MeshStandardMaterial({map: texture, roughness: 0.3, side: THREE.DoubleSide});
    for (const side of [-1, 1]) part(new THREE.PlaneGeometry(5.4, 0.65), decal, [side * 1.865, 0.16, 0.7], [1, 1, 1], [0, side * Math.PI / 2, 0]);
  }
  for (const [material, geometries] of batches) {
    const mesh = new THREE.Mesh(mergeGeometries(geometries), material);
    mesh.castShadow = true; mesh.receiveShadow = true;
    group.add(mesh);
    for (const geometry of geometries) geometry.dispose();
  }
  group.userData.style = 'catamaran';
  group.userData.helmEnclosed = true;
  return group;
}
