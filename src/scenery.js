import * as THREE from 'three';
import {channel, chunkFeatures, chunkIndex, CHUNK_SIZE, CHUNK_COUNT, START_Z} from './world.js';
import {waveGLSL} from './waves.js';

export function createWater(scene) {
  const uniforms = {uTime: {value: 0}, uSwell: {value: 1}};
  const material = new THREE.MeshStandardMaterial({color: 0x147f91, roughness: 0.3, metalness: 0.15, flatShading: true});
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = `uniform float uTime; uniform float uSwell; ${waveGLSL}\n${shader.vertexShader}`;
    shader.vertexShader = shader.vertexShader.replace('#include <beginnormal_vertex>', `
      vec2 point = (modelMatrix * vec4(position, 1.0)).xz;
      float waveHeight;
      vec2 waveSlope;
      tideWave(point, uTime, uSwell, waveHeight, waveSlope);
      vec3 objectNormal = normalize(vec3(-waveSlope.x, 1.0, -waveSlope.y));
    `).replace('#include <begin_vertex>', 'vec3 transformed = vec3(position.x, waveHeight, position.z);');
  };
  const group = new THREE.Group();
  scene.add(group);
  let geometry = new THREE.BufferGeometry();
  let segments;
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
      geometry = new THREE.PlaneGeometry(size, size, next, next);
      geometry.rotateX(-Math.PI / 2);
      for (const tile of tiles) {
        tile.geometry = geometry;
      }
      segments = next;
    }
    const faceted = value < 55;
    if (material.flatShading !== faceted) {
      material.flatShading = faceted;
      material.needsUpdate = true;
    }
    return `${faceted ? 'Faceted' : 'Smooth'} · ${25 * segments * segments * 2 / 1000}k triangles`;
  }
  setDetail(25);
  return {
    setDetail,
    update(x, z, time, swell) {
      uniforms.uTime.value = time;
      uniforms.uSwell.value = swell;
      const originX = Math.round(x / size) * size;
      const originZ = Math.round(z / size) * size;
      tiles.forEach((tile, index) => tile.position.set(originX + (index % 5 - 2) * size, 0, originZ + (Math.floor(index / 5) - 2) * size));
    },
  };
}

export function createScenery(scene) {
  const grass = new THREE.MeshStandardMaterial({color: 0x537968, roughness: 1, side: THREE.DoubleSide});
  const sand = new THREE.MeshStandardMaterial({color: 0xdec58a, roughness: 1, side: THREE.DoubleSide});
  const rock = new THREE.MeshStandardMaterial({color: 0x60777d, roughness: 1, flatShading: true});
  const stone = new THREE.DodecahedronGeometry(1, 0);
  const cylinder = new THREE.CylinderGeometry(0.86, 1, 1, 12);
  const loaded = new Map();
  function strip(index, side, beach) {
    const positions = [];
    const indices = [];
    for (let row = 0; row <= 20; row++) {
      const z = START_Z - index * CHUNK_SIZE - row * CHUNK_SIZE / 20;
      const banks = channel(z);
      const edge = side === -1 ? banks.left : banks.right;
      const inner = edge + side * (beach ? 0 : 9);
      const outer = edge + side * (beach ? 9 : 700);
      positions.push(inner, beach ? -0.45 : 1.1, z, outer, beach ? 1.1 : 10, z);
      if (row < 20) {
        const base = row * 2;
        indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return new THREE.Mesh(geometry, beach ? sand : grass);
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
        rim.position.set(x, 0.25, z);
        rim.scale.set(radius, 2, radius);
        group.add(rim);
        if (kind === 'island') {
          const top = new THREE.Mesh(cylinder, grass);
          top.position.set(x, 2, z);
          top.scale.set(radius * 0.86, 3, radius * 0.86);
          group.add(top);
          const peak = new THREE.Mesh(stone, rock);
          peak.position.set(x, 6, z);
          peak.scale.set(radius * 0.3, 9, radius * 0.3);
          group.add(peak);
        }
      }
    }
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
          if (child.isMesh && child.geometry !== stone && child.geometry !== cylinder) child.geometry.dispose();
        });
        loaded.delete(index);
      }
      return loaded.size;
    },
  };
}
