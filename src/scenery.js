import * as THREE from 'three';
import {channel, chunkFeatures, chunkIndex, CHUNK_SIZE, CHUNK_COUNT, START_Z} from './world.js';
import {createWaterMaterial} from './water-material.js';

export function createWater(scene) {
  const uniforms = {uTime: {value: 0}, uSwell: {value: 1}, uFaceted: {value: 0}, uBoat: {value: new THREE.Vector2()}, uHeading: {value: 0}, uSpeed: {value: 0}};
  const material = createWaterMaterial(uniforms);
  const group = new THREE.Group();
  scene.add(group);
  let geometry = new THREE.BufferGeometry();
  let segments;
  let nearGeometry = new THREE.BufferGeometry();
  const tiles = [];
  const size = 256;
  for (let index = 0; index < 25; index++) {
    const tile = new THREE.Mesh(geometry, material);
    tile.frustumCulled = false;
    tiles.push(tile);
    group.add(tile);
  }
  function setDetail(value) {
    const next = [10, 18, 30, 46, 64][Math.min(4, Math.floor(value / 21))];
    if (next !== segments) {
      geometry?.dispose();
      nearGeometry.dispose();
      geometry = new THREE.PlaneGeometry(size, size, next, next);
      geometry.rotateX(-Math.PI / 2);
      nearGeometry = new THREE.PlaneGeometry(size, size, next * 2, next * 2);
      nearGeometry.rotateX(-Math.PI / 2);
      tiles.forEach((tile, index) => {tile.geometry = Math.abs(index % 5 - 2) <= 1 && Math.abs(Math.floor(index / 5) - 2) <= 1 ? nearGeometry : geometry;});
      segments = next;
    }
    const faceted = value < 55;
    uniforms.uFaceted.value = faceted ? 1 : 0;
    return `${faceted ? 'Faceted' : 'Smooth'} · ${52 * segments * segments * 2 / 1000}k triangles`;
  }
  setDetail(25);
  return {
    setDetail,
    update(x, z, time, swell, heading = 0, speed = 0) {
      uniforms.uTime.value = time;
      uniforms.uSwell.value = swell;
      uniforms.uBoat.value.set(x, z);
      uniforms.uHeading.value = heading;
      uniforms.uSpeed.value = speed;
      const originX = Math.round(x / size) * size;
      const originZ = Math.round(z / size) * size;
      tiles.forEach((tile, index) => tile.position.set(originX + (index % 5 - 2) * size, 0, originZ + (Math.floor(index / 5) - 2) * size));
    },
  };
}

export function createScenery(scene) {
  const grass = new THREE.MeshStandardMaterial({color: 0xffffff, vertexColors: true, roughness: 1, side: THREE.DoubleSide});
  const islandGrass = new THREE.MeshStandardMaterial({color: 0x56704b, roughness: 1});
  const sand = new THREE.MeshStandardMaterial({color: 0xecc787, roughness: 1, flatShading: true, side: THREE.DoubleSide});
  const rock = new THREE.MeshStandardMaterial({color: 0x60777d, roughness: 1, flatShading: true});
  const stone = new THREE.DodecahedronGeometry(1, 0);
  const cylinder = new THREE.CylinderGeometry(0.86, 1, 1, 12);
  const trunkGeometry = new THREE.CylinderGeometry(0.4, 0.7, 7, 5);
  const crownGeometry = new THREE.IcosahedronGeometry(1, 0);
  const trunkMaterial = new THREE.MeshStandardMaterial({color: 0x68553d, roughness: 1});
  const crownMaterial = new THREE.MeshStandardMaterial({color: 0x4a8551, roughness: 1, flatShading: true});
  const sharedGeometry = new Set([stone, cylinder, trunkGeometry, crownGeometry]);
  function elevation(x, z, distance) {
    return 1.1 + distance * 0.045 + Math.sin(x * 0.017) * Math.sin(z * 0.012) * Math.min(12, distance * 0.15);
  }
  const loaded = new Map();
  function strip(index, side, beach) {
    const positions = [];
    const indices = [];
    const colors = [];
    const columns = beach ? 1 : 10;
    for (let row = 0; row <= 20; row++) {
      const z = START_Z - index * CHUNK_SIZE - row * CHUNK_SIZE / 20;
      const banks = channel(z);
      const edge = side === -1 ? banks.left : banks.right;
      const inner = edge + side * (beach ? 0 : 9);
      const outer = edge + side * (beach ? 9 : 700);
      for (let column = 0; column <= columns; column++) {
        const fraction = column / columns;
        const x = inner + (outer - inner) * fraction;
        positions.push(x, beach ? -0.45 + fraction * 1.55 : elevation(x, z, fraction * 691), z);
        const shade = 0.85 + 0.15 * Math.sin(x * 0.023 + z * 0.011);
        colors.push(0.32 * shade, 0.55 * shade, 0.30 * shade);
      }
      if (row < 20) {
        for (let column = 0; column < columns; column++) {
          const base = row * (columns + 1) + column;
          indices.push(base, base + 1, base + columns + 1, base + 1, base + columns + 2, base + columns + 1);
        }
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return new THREE.Mesh(geometry, beach ? sand : grass);
  }
  function load(index) {
    const group = new THREE.Group();
    for (const side of [-1, 1]) group.add(strip(index, side, false), strip(index, side, true));
    const features = chunkFeatures(index);
    const trees = [];
    for (let tree = 0; tree < 48; tree++) {
      const z = START_Z - index * CHUNK_SIZE - (tree % 24 + 0.5) * CHUNK_SIZE / 24;
      const side = tree < 24 ? -1 : 1;
      const distance = 15 + (0.5 + 0.5 * Math.sin(tree * 52.3 + index * 7.4)) * 110;
      const banks = channel(z);
      const x = (side < 0 ? banks.left : banks.right) + side * (9 + distance);
      trees.push({x, z, y: elevation(x, z, distance), scale: 0.7 + 0.3 * Math.sin(tree * 3.9 + index)});
    }
    for (const feature of features) {
      const {x, z, radius, kind} = feature;
      if (kind === 'rock') {
        const mesh = new THREE.Mesh(stone, rock);
        mesh.position.set(x, 1.3, z);
        mesh.scale.set(radius, radius * 0.8, radius);
        group.add(mesh);
      } else {
        const rim = new THREE.Mesh(cylinder, sand);
        rim.position.set(x, 0.25, z);
        rim.scale.set(radius, 2, radius);
        group.add(rim);
        if (kind === 'island') {
          const top = new THREE.Mesh(cylinder, islandGrass);
          top.position.set(x, 2, z);
          top.scale.set(radius * 0.86, 3, radius * 0.86);
          group.add(top);
          const peak = new THREE.Mesh(stone, rock);
          peak.position.set(x, 6, z);
          peak.scale.set(radius * 0.3, 9, radius * 0.3);
          group.add(peak);
          for (let tree = 0; tree < 6; tree++) {
            const angle = tree * Math.PI / 3;
            trees.push({x: x + Math.cos(angle) * radius * 0.5, z: z + Math.sin(angle) * radius * 0.5, y: 3.3, scale: 0.8});
          }
        }
      }
    }
    const trunks = new THREE.InstancedMesh(trunkGeometry, trunkMaterial, trees.length);
    const crowns = new THREE.InstancedMesh(crownGeometry, crownMaterial, trees.length);
    const transform = new THREE.Object3D();
    trees.forEach((tree, treeIndex) => {
      transform.position.set(tree.x, tree.y + 3.5 * tree.scale, tree.z);
      transform.scale.setScalar(tree.scale);
      transform.updateMatrix();
      trunks.setMatrixAt(treeIndex, transform.matrix);
      transform.position.y = tree.y + 8 * tree.scale;
      transform.scale.set(4.5 * tree.scale, 6 * tree.scale, 4 * tree.scale);
      transform.rotation.y = treeIndex * 1.7;
      transform.updateMatrix();
      crowns.setMatrixAt(treeIndex, transform.matrix);
    });
    group.add(trunks, crowns);
    scene.add(group);
    loaded.set(index, group);
  }
  return {
    update(z) {
      const center = chunkIndex(z);
      const desired = new Set();
      for (let index = Math.max(0, center - 3); index <= Math.min(CHUNK_COUNT - 1, center + 3); index++) {
        desired.add(index);
        if (!loaded.has(index)) load(index);
      }
      for (const [index, group] of loaded) {
        if (desired.has(index)) continue;
        scene.remove(group);
        group.traverse((child) => {
          if (child.isMesh && !sharedGeometry.has(child.geometry)) child.geometry.dispose();
          if (child.isInstancedMesh) child.dispose();
        });
        loaded.delete(index);
      }
      return loaded.size;
    },
  };
}
