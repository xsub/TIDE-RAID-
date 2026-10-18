import * as THREE from 'three';
import {CARGO, SLOTS, seaState, cargoBalance} from './cargo-model.js';

export const cargoColor = (id) => [0xe27842, 0x4fa4ae, 0xd8b857, 0x788ec6, 0x91b27d, 0xbb6678][id % 6];
export function createCargoView(host) {
  const renderer = new THREE.WebGLRenderer({antialias: true});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.setClearColor(0x9ab9c8);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; host.append(renderer.domElement);
  const scene = new THREE.Scene(); scene.fog = new THREE.Fog(0x9ab9c8, 180, 700);
  scene.add(new THREE.HemisphereLight(0xc5e3f5, 0x28383d, 2));
  const sun = new THREE.DirectionalLight(0xffe1b0, 3); sun.position.set(-40, 70, 20); scene.add(sun);
  const camera = new THREE.PerspectiveCamera(48, 1, 0.5, 1000);
  camera.position.set(68, 48, 65); camera.lookAt(0, 1, 0);
  const oceanGeometry = new THREE.PlaneGeometry(1500, 1500, 90, 90).rotateX(-Math.PI / 2);
  const ocean = new THREE.Mesh(oceanGeometry, new THREE.MeshStandardMaterial({color: 0x1d7189, roughness: 0.32, metalness: 0.25})); scene.add(ocean);
  const ship = new THREE.Group(); scene.add(ship);
  const shape = new THREE.Shape(); shape.moveTo(0, -37);
  shape.bezierCurveTo(-4, -34, -7.8, -29, -7.8, -20); shape.lineTo(-7.8, 32);
  shape.quadraticCurveTo(0, 35, 7.8, 32); shape.lineTo(7.8, -20); shape.bezierCurveTo(7.8, -29, 4, -34, 0, -37);
  const hull = new THREE.ExtrudeGeometry(shape, {depth: 4.8, bevelEnabled: true, bevelSegments: 2, bevelSize: 0.4, bevelThickness: 0.3, curveSegments: 18}).rotateX(Math.PI / 2);
  const hullMesh = new THREE.Mesh(hull, new THREE.MeshStandardMaterial({color: 0x23333c, roughness: 0.5})); hullMesh.position.y = 2.9; ship.add(hullMesh);
  const deckMaterial = new THREE.MeshStandardMaterial({color: 0xb5a786, roughness: 0.85});
  const white = new THREE.MeshStandardMaterial({color: 0xe1e7df, roughness: 0.6});
  const glass = new THREE.MeshStandardMaterial({color: 0x203b4c, metalness: 0.4, roughness: 0.2});
  function box(size, position, material) {const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material); mesh.position.set(...position); ship.add(mesh); return mesh;}
  box([14.8, 0.25, 58], [0, 3, -2], deckMaterial);
  box([12, 6, 8], [0, 5.9, 28], white); box([12.2, 1.6, 8.2], [0, 8.4, 28], glass); box([12.8, 0.4, 9], [0, 9.4, 28], white);
  box([1.2, 7, 1.2], [0, 12.8, 30], white);
  const cargoGeometry = new THREE.BoxGeometry(4.1, 2.05, 10.8);
  const meshes = CARGO.map((cargo) => {
    const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 128;
    const context = canvas.getContext('2d'); context.fillStyle = `#${cargoColor(cargo.id).toString(16).padStart(6, '0')}`; context.fillRect(0, 0, 256, 128);
    context.strokeStyle = '#0003'; context.lineWidth = 3;
    for (let rib = 8; rib < 256; rib += 16) {context.beginPath(); context.moveTo(rib, 0); context.lineTo(rib, 128); context.stroke();}
    context.fillStyle = '#fff'; context.font = 'bold 32px sans-serif'; context.fillText(`${String(cargo.id + 1).padStart(2, '0')} / ${cargo.tonnes}t`, 15, 76);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(cargoGeometry, new THREE.MeshStandardMaterial({map: texture, roughness: 0.7})); ship.add(mesh); return mesh;
  });
  let viewAngle = 0.8; let distance = 105;
  const observer = new ResizeObserver(() => {const width = host.clientWidth; const height = host.clientHeight; renderer.setSize(width, height); camera.aspect = width / Math.max(1, height); camera.updateProjectionMatrix();}); observer.observe(host);
  return {
    orbit(delta) {viewAngle += delta;}, zoom(delta) {distance = Math.max(65, Math.min(160, distance + delta));},
    update(game, selected) {
      const sea = seaState(game.time);
      const vertices = oceanGeometry.attributes.position;
      for (let index = 0; index < vertices.count; index++) {
        const x = vertices.getX(index); const z = vertices.getZ(index);
        vertices.setY(index, Math.sin(x * 0.045 + z * 0.07 - game.time * 0.8) * sea.amplitude * 6 + Math.sin(z * 0.12 + game.time * 1.37) * sea.amplitude * 2);
      }
      vertices.needsUpdate = true; oceanGeometry.computeVertexNormals();
      const loading = game.phase === 'loading' ? cargoBalance(game.board) : null;
      ship.rotation.set(loading ? loading.trim : game.pitch, 0, loading ? Math.max(-0.8, Math.min(0.8, loading.list)) : game.roll, 'YXZ'); ship.position.y = Math.sin(game.time * 0.8) * sea.amplitude * 2;
      meshes.forEach((mesh, id) => {
        const index = game.board.indexOf(id); mesh.visible = index >= 0;
        if (index < 0) return;
        const slot = SLOTS[index]; mesh.position.set(slot.x, slot.y, slot.z);
        mesh.material.emissive.setHex(selected === id ? 0x443300 : 0);
      });
      camera.position.set(Math.sin(viewAngle) * distance, distance * 0.57, Math.cos(viewAngle) * distance); camera.lookAt(0, 1, 0);
      renderer.render(scene, camera);
    },
  };
}
