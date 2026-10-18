import * as THREE from 'three';

export function createBoat() {
  const boat = new THREE.Group();
  boat.name = 'TR-07 offshore racer';
  const paint = new THREE.MeshPhysicalMaterial({color: 0xf3eee0, roughness: 0.24, metalness: 0.15, clearcoat: 1});
  const orange = new THREE.MeshPhysicalMaterial({color: 0xfa5b2f, roughness: 0.23, clearcoat: 1});
  const navy = new THREE.MeshStandardMaterial({color: 0x102b3d, roughness: 0.28, metalness: 0.4});
  const chrome = new THREE.MeshStandardMaterial({color: 0xb4c5c5, roughness: 0.2, metalness: 0.85});
  const rubber = new THREE.MeshStandardMaterial({color: 0x18252b, roughness: 0.85});
  const glass = new THREE.MeshPhysicalMaterial({color: 0x54aebf, roughness: 0.08, metalness: 0.35, transparent: true, opacity: 0.67, side: THREE.DoubleSide, clearcoat: 1});
  const stations = [[-4.3, 0.035, 0.65, 0.05], [-3.2, 0.7, 0.6, -0.35], [-1.6, 1.22, 0.5, -0.68], [0.8, 1.3, 0.42, -0.72], [2.8, 1.12, 0.32, -0.5]];
  const vertices = [];
  const indices = [];
  for (const [z, width, top, keel] of stations) vertices.push(-width, top, z, width, top, z, width * 0.8, -0.08, z, 0, keel, z, -width * 0.8, -0.08, z);
  const geometry = new THREE.BufferGeometry();
  for (let station = 0; station < stations.length - 1; station++) {
    for (let side = 0; side < 5; side++) {
      const start = indices.length;
      const current = station * 5 + side;
      const next = station * 5 + (side + 1) % 5;
      indices.push(current, current + 5, next, next, current + 5, next + 5);
      geometry.addGroup(start, 6, side === 0 ? 0 : side === 1 || side === 4 ? 1 : 2);
    }
  }
  indices.push(20, 24, 23, 20, 23, 22, 20, 22, 21);
  geometry.addGroup(indices.length - 9, 9, 2);
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  boat.add(new THREE.Mesh(geometry, [paint, orange, navy]));
  function box(size, position, material, rotation = 0) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.position.set(...position);
    mesh.rotation.x = rotation;
    boat.add(mesh);
    return mesh;
  }
  function rail(points, radius, material) {
    const curve = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)));
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, radius, 6, false), material);
    boat.add(mesh);
  }
  for (const side of [-1, 1]) {
    rail(stations.map(([z, width, top]) => [side * width, top + 0.035, z]), 0.045, rubber);
    rail([[side * 0.45, 0.75, -3.4], [side * 0.75, 0.85, -2.7], [side * 1, 0.75, -1.9]], 0.025, chrome);
    box([0.32, 0.025, 2.3], [side * 0.45, 0.59, -2.1], orange, 0.045);
    box([0.12, 0.04, 0.8], [side * 1.15, 0.5, 1.5], chrome);
    box([0.68, 0.22, 0.75], [side * 0.56, 0.6, 0.7], rubber);
    box([0.68, 0.8, 0.18], [side * 0.56, 0.98, 1.05], orange, -0.12);
    box([0.4, 0.23, 0.18], [side * 0.56, 1.46, 1.08], rubber);
    box([0.56, 0.95, 0.85], [side * 0.64, 0.22, 3.12], navy);
    box([0.58, 0.09, 0.52], [side * 0.64, 0.71, 3.1], chrome);
    box([0.12, 0.65, 0.18], [side * 0.64, -0.49, 3.35], chrome);
  }
  box([1.95, 0.22, 0.5], [0, 0.76, -0.58], navy);
  box([1.95, 0.75, 0.06], [0, 1.15, -0.88], glass, -0.4);
  for (const side of [-1, 1]) rail([[side * 1.02, 0.75, -0.73], [side * 1.02, 1.5, -1.03]], 0.035, chrome);
  rail([[-1.02, 1.5, -1.03], [0, 1.55, -1.05], [1.02, 1.5, -1.03]], 0.035, chrome);
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 6, 20), rubber);
  wheel.position.set(-0.56, 1, -0.19);
  wheel.rotation.x = -0.35;
  boat.add(wheel);
  const driver = new THREE.Mesh(new THREE.CapsuleGeometry(0.21, 0.35, 4, 8), navy);
  driver.position.set(-0.56, 1.07, 0.48);
  boat.add(driver);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.23, 12, 8), paint);
  helmet.position.set(-0.56, 1.62, 0.35);
  boat.add(helmet);
  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.235, 12, 6, 0, Math.PI), navy);
  visor.rotation.y = Math.PI;
  visor.scale.y = 0.5;
  visor.position.copy(helmet.position);
  boat.add(visor);
  const deckCanvas = document.createElement('canvas');
  deckCanvas.width = 256;
  deckCanvas.height = 256;
  const context = deckCanvas.getContext('2d');
  context.fillStyle = '#efeee0'; context.fillRect(0, 0, 256, 256);
  context.fillStyle = '#152c3b'; context.textAlign = 'center'; context.font = 'bold 112px sans-serif'; context.fillText('07', 128, 152);
  context.font = 'bold 21px sans-serif'; context.fillText('TIDE RAID', 128, 200);
  const texture = new THREE.CanvasTexture(deckCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const badge = new THREE.Mesh(new THREE.PlaneGeometry(1, 1.25), new THREE.MeshStandardMaterial({map: texture, roughness: 0.4}));
  badge.rotation.x = -Math.PI / 2;
  badge.position.set(0, 0.55, -1.8);
  boat.add(badge);
  boat.traverse((child) => {if (child.isMesh) child.castShadow = true;});
  return boat;
}
