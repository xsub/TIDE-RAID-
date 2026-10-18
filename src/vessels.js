import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export const VESSEL_STYLES = {'boat-speed-c': 'sport', 'boat-speed-a': 'runabout', 'boat-house-a': 'cruiser', 'boat-tug-a': 'sail', 'boat-speed-d': 'classic'};

export function createVessel(style = 'sport') {
  const group = new THREE.Group();
  group.name = `${style} coastal vessel`;
  const paint = new THREE.MeshPhysicalMaterial({color: 0xf1eee5, roughness: 0.23, metalness: 0.08, clearcoat: 1, clearcoatRoughness: 0.17});
  const accent = new THREE.MeshPhysicalMaterial({color: style === 'sport' ? 0xa8202d : style === 'classic' ? 0x87502d : 0x173b55, roughness: 0.28, clearcoat: 1});
  const glass = new THREE.MeshPhysicalMaterial({color: 0x163547, metalness: 0.4, roughness: 0.1, clearcoat: 1});
  const chrome = new THREE.MeshStandardMaterial({color: 0xb9c7cd, roughness: 0.18, metalness: 0.9});
  const teak = new THREE.MeshStandardMaterial({color: 0xa88858, roughness: 0.7});
  const dark = new THREE.MeshStandardMaterial({color: 0x182329, roughness: 0.7});
  const seat = new THREE.MeshStandardMaterial({color: 0xd5cbbb, roughness: 0.8});
  const fabric = new THREE.MeshStandardMaterial({color: 0xf1f0e7, roughness: 0.95, side: THREE.DoubleSide});
  const navigationRed = new THREE.MeshStandardMaterial({color: 0xde3725, emissive: 0xde3725, emissiveIntensity: 1});
  const navigationGreen = new THREE.MeshStandardMaterial({color: 0x3fad86, emissive: 0x3fad86, emissiveIntensity: 1});
  const stations = 32;
  const sections = [];
  for (let station = 0; station <= stations; station++) {
    const fraction = station / stations;
    const width = 1.48 * (0.025 + 0.975 * Math.pow(Math.sin(Math.min(1, fraction / 0.6) * Math.PI / 2), 0.7)) * (1 - fraction * 0.12);
    sections.push({z: -4.2 + fraction * 7.8, width, deck: 0.5 + 0.18 * (1 - fraction) ** 3, keel: -0.72 + 0.5 * (1 - fraction) ** 4});
  }
  const positions = [];
  const indices = [];
  const uv = [];
  for (const [station, section] of sections.entries()) {
    const {z, width, deck, keel} = section;
    for (const [lateral, height] of [[-1, deck], [-0.95, 0], [-0.65, keel + 0.1], [0, keel], [0.65, keel + 0.1], [0.95, 0], [1, deck]]) {
      positions.push(lateral * width, height, z); uv.push((lateral + 1) / 2, station / stations);
    }
    if (station === stations) continue;
    for (let edge = 0; edge < 6; edge++) {
      const base = station * 7 + edge;
      indices.push(base, base + 1, base + 7, base + 1, base + 8, base + 7);
    }
  }
  const stern = stations * 7;
  for (let edge = 1; edge < 6; edge++) indices.push(stern, stern + edge, stern + edge + 1);
  const hull = new THREE.BufferGeometry();
  hull.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  hull.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  hull.setIndex(indices); hull.computeVertexNormals();
  group.add(new THREE.Mesh(hull, style === 'cruiser' || style === 'sail' ? paint : accent));
  const deckPositions = [];
  const deckUv = [];
  const deckIndices = [];
  sections.forEach((section, station) => {
    deckPositions.push(-section.width, section.deck + 0.01, section.z, section.width, section.deck + 0.01, section.z);
    deckUv.push(0, station / stations, 1, station / stations);
    if (station < stations) {
      const base = station * 2;
      deckIndices.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
    }
  });
  const deck = new THREE.BufferGeometry();
  deck.setAttribute('position', new THREE.Float32BufferAttribute(deckPositions, 3));
  deck.setAttribute('uv', new THREE.Float32BufferAttribute(deckUv, 2));
  deck.setIndex(deckIndices); deck.computeVertexNormals();
  group.add(new THREE.Mesh(deck, paint));
  function part(geometry, material, position) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position); group.add(mesh); return mesh;
  }
  function box(size, material, position, radius = 0.08) {
    return part(new RoundedBoxGeometry(...size, 2, Math.min(radius, ...size.map((value) => value / 3))), material, position);
  }
  function rail(points, material = chrome, radius = 0.018) {
    const curve = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)));
    return part(new THREE.TubeGeometry(curve, 32, radius, 5, false), material, [0, 0, 0]);
  }
  for (const side of [-1, 1]) {
    rail(sections.map((section) => [side * section.width * 1.006, section.deck + 0.07, section.z]), dark, 0.025);
    rail(sections.filter((section, index) => index > 3 && index < 21).map((section) => [side * section.width * 0.95, section.deck + 0.58, section.z]));
    for (const station of [6, 12, 18]) {
      const section = sections[station];
      rail([[side * section.width * 0.95, section.deck, section.z], [side * section.width * 0.95, section.deck + 0.58, section.z]], chrome, 0.015);
    }
    for (const z of [-0.8, 0.2, 1.2]) {
      const window = part(new THREE.CylinderGeometry(0.13, 0.13, 0.025, 16).rotateZ(Math.PI / 2), glass, [side * 1.34, 0.22, z]);
      window.rotation.y = side * 0.05;
    }
    box([0.12, 0.08, 0.38], chrome, [side * 1.17, 0.58, 2.3]);
    part(new THREE.SphereGeometry(0.065, 8, 6), side < 0 ? navigationRed : navigationGreen, [side * 1.2, 0.77, -0.6]);
  }
  box([2.3, 0.07, 1.4], teak, [0, 0.58, 2.7]);
  for (let plank = 0; plank < 12; plank++) box([0.012, 0.012, 1.35], dark, [-1.06 + plank * 0.19, 0.625, 2.7], 0.002);
  box([1.9, 0.26, 0.6], seat, [0, 0.82, 2]);
  box([1.9, 0.48, 0.16], seat, [0, 1.08, 2.28]);
  if (style === 'cruiser' || style === 'sail') {
    box([2.25, 0.85, 3.1], paint, [0, 0.97, -0.1], 0.22);
    box([2.13, 0.62, 2.85], glass, [0, 1.63, -0.25], 0.18);
    box([2.33, 0.13, 3.1], paint, [0, 1.98, -0.25], 0.05);
    for (const side of [-1, 1]) box([0.06, 0.7, 0.08], paint, [side * 1.05, 1.64, -0.2], 0.01);
    if (style === 'cruiser') {
      box([1.8, 0.15, 1.7], teak, [0, 2.11, 0.2]);
      box([1.2, 0.43, 0.45], seat, [0, 2.42, 0.5]);
      box([1.65, 0.17, 1.5], paint, [0, 3.05, 0.1]);
      for (const side of [-1, 1]) rail([[side * 0.7, 2.1, -0.6], [side * 0.7, 3.0, -0.6]], chrome, 0.025);
      part(new THREE.SphereGeometry(0.22, 16, 8), paint, [0, 3.34, 0.25]);
      rail([[0, 3.1, 0.5], [0, 4, 0.6]], chrome, 0.012);
    }
  } else {
    box([2.0, 0.23, 0.5], paint, [0, 0.82, -0.65]);
    const windshield = box([1.95, 0.62, 0.055], glass, [0, 1.14, -0.84], 0.015);
    windshield.rotation.x = -0.45;
    rail([[-1.02, 0.85, -0.71], [-0.9, 1.44, -0.99], [0.9, 1.44, -0.99], [1.02, 0.85, -0.71]], chrome, 0.025);
    for (const side of [-1, 1]) {
      box([0.62, 0.2, 0.65], seat, [side * 0.57, 0.81, 0.7]);
      const back = box([0.65, 0.62, 0.16], seat, [side * 0.57, 1.1, 0.99]); back.rotation.x = -0.12;
      box([0.43, 0.8, 0.6], dark, [side * 0.64, 0.05, 3.86], 0.13);
      box([0.12, 0.65, 0.14], chrome, [side * 0.64, -0.52, 4], 0.03);
    }
    const wheel = part(new THREE.TorusGeometry(0.19, 0.02, 6, 20), dark, [-0.56, 1.04, -0.27]); wheel.rotation.x = -0.35;
    if (style === 'classic') box([1.6, 0.045, 1.5], teak, [0, 0.61, -2.3]);
  }
  if (style === 'sail') {
    part(new THREE.CylinderGeometry(0.035, 0.06, 13, 12), chrome, [0, 7.3, -0.8]);
    part(new THREE.CylinderGeometry(0.035, 0.035, 4.6, 8).rotateX(Math.PI / 2), chrome, [0, 2.8, 1.3]);
    function sail(forward) {
      const vertices = []; const coordinates = []; const faces = [];
      const resolution = 16;
      for (let row = 0; row <= resolution; row++) for (let column = 0; column <= resolution; column++) {
        const vertical = row / resolution; const lateral = column / resolution;
        vertices.push(Math.sin(lateral * Math.PI) * Math.sin(vertical * Math.PI) * 0.5,
          2.9 + vertical * (forward ? 10.1 : 10.6), -0.8 + (forward ? -3.1 : 4.3) * lateral * (1 - vertical));
        coordinates.push(lateral, vertical);
        if (row < resolution && column < resolution) {
          const base = row * (resolution + 1) + column;
          faces.push(base, base + 1, base + resolution + 1, base + 1, base + resolution + 2, base + resolution + 1);
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(coordinates, 2));
      geometry.setIndex(faces); geometry.computeVertexNormals();
      part(geometry, fabric, [0, 0, 0]);
    }
    sail(false); sail(true);
    rail([[0, 0.7, -3.8], [0, 13.7, -0.8], [0, 0.8, 3.3]], dark, 0.008);
    for (const side of [-1, 1]) rail([[side * 1.2, 0.6, 0], [0, 13.7, -0.8]], dark, 0.008);
  }
  group.updateMatrixWorld(true);
  const batches = new Map();
  for (const child of [...group.children]) {
    const geometry = child.geometry.index ? child.geometry.toNonIndexed() : child.geometry.clone();
    geometry.applyMatrix4(child.matrix);
    const list = batches.get(child.material) ?? [];
    list.push(geometry); batches.set(child.material, list);
    child.geometry.dispose(); group.remove(child);
  }
  for (const [material, geometries] of batches) {
    const geometry = mergeGeometries(geometries);
    for (const original of geometries) original.dispose();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true; mesh.receiveShadow = true;
    group.add(mesh);
  }
  group.userData.style = style;
  return group;
}
