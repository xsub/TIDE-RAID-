import * as THREE from 'three';
import {channel, chunkFeatures, chunkIndex, CHUNK_SIZE, CHUNK_COUNT, START_Z} from './world.js';
import {createWaterMaterial} from './water-material.js';
import {boundaryAtlas, BOUNDARY_WIDTH, BOUNDARY_HEIGHT} from './water-boundary.js';
import {createNature} from './nature-view.js';
import {createHarbors} from './harbors.js';
import {beachWidth, coastHeight, islandHeight} from './nature.js';
import {organicRock,sandyShore,naturalMaterial} from './natural-surfaces.js';

export function createWater(scene) {
  const boundary = new THREE.DataTexture(boundaryAtlas(), BOUNDARY_WIDTH, BOUNDARY_HEIGHT, THREE.RedFormat, THREE.UnsignedByteType);
  boundary.minFilter = THREE.NearestFilter; boundary.magFilter = THREE.NearestFilter;
  boundary.generateMipmaps = false; boundary.needsUpdate = true;
  const uniforms = {uTime: {value: 0}, uSwell: {value: 1}, uFaceted: {value: 0}, uBoat: {value: new THREE.Vector2()}, uHeading: {value: 0}, uSpeed: {value: 0}};
  uniforms.uBoundary = {value: boundary};
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
  const grass = naturalMaterial({color: 0xc7cbb8, vertexColors: true, roughness: 1, side: THREE.DoubleSide},0.9,'grass');
  const islandGrass = naturalMaterial({color: 0xa6b292, roughness: 1, side: THREE.DoubleSide},0.9,'grass');
  const sand = naturalMaterial({color: 0xffffff, roughness: 1, side: THREE.DoubleSide},2,'sand');
  const beachSand = sand.clone(); beachSand.vertexColors = true;
  beachSand.onBeforeCompile=sand.onBeforeCompile;beachSand.customProgramCacheKey=sand.customProgramCacheKey;
  const rock = naturalMaterial({color: 0xffffff, roughness: 0.95},1.8,'rock');
  const stone = organicRock(20,14);
  const cylinder = sandyShore();
  const nature = createNature();
  const harbors = createHarbors();
  const sharedGeometry = new Set([stone, cylinder, ...nature.shared, ...harbors.shared]);
  const loaded = new Map();
  function strip(index, side, beach) {
    const positions = [];
    const indices = [];
    const colors = [];
    const distances = beach ? [0,0.2,0.45,0.7,1] : [0,3,7,12,20,30,45,65,100,150,220,320,450,560,700];
    const columns = distances.length - 1;
    const rows = 64;
    for (let row = 0; row <= rows; row++) {
      const z = START_Z - index * CHUNK_SIZE - row * CHUNK_SIZE / rows;
      const banks = channel(z);
      const edge = side === -1 ? banks.left : banks.right;
      const beachSize = beachWidth(z, side);
      for (let column = 0; column <= columns; column++) {
        const distance = distances[column];
        const x = edge + side * (beach ? distance * beachSize : beachSize + distance);
        const height = beach ? -0.45 + distance * 1.55 : coastHeight(x, z, distance);
        positions.push(x, height, z);
        const shade = 0.82 + 0.18 * Math.sin(x * 0.023 + z * 0.011);
        const meadow = 0.5 + 0.5 * Math.sin(x * 0.015 + Math.sin(z * 0.013));
        if (beach) colors.push(0.64 + distance * 0.36, 0.68 + distance * 0.32, 0.66 + distance * 0.34);
        else colors.push((0.27 + meadow * 0.1) * shade, (0.43 + meadow * 0.08) * shade, (0.23 + meadow * 0.025) * shade);
      }
      if (row < rows) {
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
    return new THREE.Mesh(geometry, beach ? beachSand : grass);
  }
  function islandSurface(radius) {
    const positions = [];
    const indices = [];
    const segments = 64;
    const rings = [0,0.15,0.3,0.45,0.6,0.75,0.9,1];
    rings.forEach((fraction, ring) => {
      for (let angle = 0; angle < segments; angle++) {
        const phase = angle / segments * Math.PI * 2;
        positions.push(Math.cos(phase) * radius * fraction, islandHeight(fraction), Math.sin(phase) * radius * fraction);
        if (ring === rings.length - 1) continue;
        const inner = ring * segments + angle;
        const next = ring * segments + (angle + 1) % segments;
        indices.push(inner, next + segments, inner + segments, inner, next, next + segments);
      }
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return new THREE.Mesh(geometry, islandGrass);
  }
  function load(index) {
    const group = new THREE.Group();
    for (const side of [-1, 1]) group.add(strip(index, side, false), strip(index, side, true));
    const features = chunkFeatures(index);
    for (const feature of features) {
      const {x, z, radius, kind} = feature;
      if (kind === 'rock') {
        const mesh = new THREE.Mesh(stone, rock);
        mesh.position.set(x, 1.3, z);
        mesh.scale.set(radius, radius * 0.8, radius);
        group.add(mesh);
      } else {
        const rim = new THREE.Mesh(cylinder, sand);
        rim.position.set(x, 0, z);
        rim.scale.set(radius, 1, radius);
        group.add(rim);
        if (kind === 'island') {
          const top = islandSurface(radius * 0.86);
          top.position.set(x, 0, z);
          group.add(top);
          const peak = new THREE.Mesh(stone, rock);
          peak.position.set(x, 6, z);
          peak.scale.set(radius * 0.3, 9, radius * 0.3);
          group.add(peak);
        }
      }
    }
    nature.add(group, index);
    harbors.add(group, index);
    group.traverse((child) => {
      if (!child.isMesh || child.userData.beacon || child.userData.localMaterial) return;
      child.receiveShadow = true;
      if (!child.isInstancedMesh) child.castShadow = true;
    });
    scene.add(group);
    loaded.set(index, group);
  }
  return {
    update(z, time = 0) {
      nature.update(time);
      harbors.update(time);
      const center = chunkIndex(z);
      const desired = new Set();
      for (let index = Math.max(0, center - 3); index <= Math.min(CHUNK_COUNT - 1, center + 3); index++) {
        desired.add(index);
        if (!loaded.has(index)) load(index);
      }
      for (const [index, group] of loaded) {
        if (desired.has(index)) continue;
        scene.remove(group);
        harbors.forget(group);
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
