import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {natureLayout} from './nature.js';

export function createNature() {
  const material = (color, doubleSide = false) => new THREE.MeshStandardMaterial({color, roughness: 1, flatShading: true, side: doubleSide ? THREE.DoubleSide : THREE.FrontSide});
  const wood = material(0x65513a);
  const leaves = material(0x66834a);
  const pineLeaves = material(0x3e6650);
  const palmLeaves = material(0x74944e, true);
  const stone = material(0x8b9180);
  const grassMaterial = material(0x879d51, true);
  const flowerMaterial = material(0xffe2a4);
  const trunk = new THREE.CylinderGeometry(0.35, 0.65, 8, 5).translate(0, 4, 0);
  const pine = mergeGeometries([new THREE.ConeGeometry(5, 9, 7).translate(0, 8, 0), new THREE.ConeGeometry(4, 8, 7).translate(0, 12, 0), new THREE.ConeGeometry(2.7, 6, 7).translate(0, 16, 0)]);
  const broadleaf = mergeGeometries([new THREE.IcosahedronGeometry(4.3, 1).scale(1.1, 1.1, 1).translate(-2, 9, 0), new THREE.IcosahedronGeometry(4.5, 1).translate(1.5, 11, 0), new THREE.IcosahedronGeometry(3.7, 1).translate(0.2, 8, 2.4)]);
  const palmVertices = [];
  for (let leaf = 0; leaf < 7; leaf++) {
    const angle = leaf / 7 * Math.PI * 2;
    for (let section = 0; section < 4; section++) {
      const corners = [];
      for (const progress of [section / 4, (section + 1) / 4]) {
        const reach = progress * 7;
        const width = Math.sin(progress * Math.PI) * 0.95 + 0.04;
        const height = 13 + Math.sin(progress * Math.PI) * 1.8 - progress * 2;
        for (const side of [-1, 1]) corners.push([Math.cos(angle) * reach - Math.sin(angle) * width * side, height, Math.sin(angle) * reach + Math.cos(angle) * width * side]);
      }
      for (const vertex of [0, 2, 1, 1, 2, 3]) palmVertices.push(...corners[vertex]);
    }
  }
  const palm = new THREE.BufferGeometry();
  palm.setAttribute('position', new THREE.Float32BufferAttribute(palmVertices, 3));
  palm.computeVertexNormals();
  const shrub = new THREE.IcosahedronGeometry(1, 1);
  const rock = new THREE.DodecahedronGeometry(1, 0);
  const log = new THREE.CylinderGeometry(0.35, 0.45, 6, 7).rotateZ(Math.PI / 2);
  const blades = [];
  for (let blade = 0; blade < 5; blade++) {
    const angle = blade * 2.4;
    const x = Math.cos(angle) * 0.55;
    const z = Math.sin(angle) * 0.55;
    blades.push(x - 0.1, 0, z, x + 0.1, 0, z, x + Math.cos(angle) * 0.6, 1.2 + blade * 0.17, z + Math.sin(angle) * 0.6);
  }
  const reeds = new THREE.BufferGeometry();
  reeds.setAttribute('position', new THREE.Float32BufferAttribute(blades, 3));
  reeds.computeVertexNormals();
  const flower = new THREE.IcosahedronGeometry(0.35, 0).translate(0, 0.6, 0);
  const bird = new THREE.BufferGeometry();
  bird.setAttribute('position', new THREE.Float32BufferAttribute([0,0,0, -2,0.15,-0.3, -0.7,0,0.4, 0,0,0, 0.7,0,0.4, 2,0.15,-0.3], 3));
  bird.computeVertexNormals();
  const birdMaterial = material(0xe1e4d2, true);
  const time = {value: 0};
  birdMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.uNatureTime = time;
    shader.vertexShader = `uniform float uNatureTime;\n${shader.vertexShader}`;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
      vec3 transformed = position;
      transformed.y += sin(uNatureTime * 4.0 + instanceMatrix[3].z) * abs(position.x) * 0.5;
      transformed.x += sin(uNatureTime * 0.12 + instanceMatrix[3].x) * 16.0;
      transformed.z += cos(uNatureTime * 0.12 + instanceMatrix[3].x) * 16.0;
    `);
  };
  const shared = new Set([trunk, pine, broadleaf, palm, shrub, rock, log, reeds, flower, bird]);
  const transform = new THREE.Object3D();
  const color = new THREE.Color();
  function instances(group, geometry, surface, items, scaleFor) {
    if (items.length === 0) return;
    const mesh = new THREE.InstancedMesh(geometry, surface, items.length);
    items.forEach((item, index) => {
      transform.position.set(item.x, item.y, item.z);
      transform.rotation.set(0, item.rotation, 0);
      transform.scale.set(...scaleFor(item));
      transform.updateMatrix();
      mesh.setMatrixAt(index, transform.matrix);
      color.setRGB(0.78 + item.shade * 0.22, 0.85 + item.shade * 0.15, 0.73 + item.shade * 0.2);
      mesh.setColorAt(index, color);
    });
    if (geometry === bird) mesh.frustumCulled = false;
    group.add(mesh);
  }
  return {
    shared,
    update(value) {time.value = value;},
    add(group, index) {
      const layout = natureLayout(index);
      instances(group, trunk, wood, layout.trees, (item) => [item.scale, item.scale * (item.species === 'palm' ? 1.55 : 1), item.scale]);
      for (const [species, geometry, surface] of [['pine', pine, pineLeaves], ['broadleaf', broadleaf, leaves], ['palm', palm, palmLeaves]]) instances(group, geometry, surface, layout.trees.filter((item) => item.species === species), (item) => [item.scale, item.scale, item.scale]);
      instances(group, shrub, leaves, layout.shrubs, (item) => [item.scale * 2.4, item.scale * 1.8, item.scale * 2]);
      instances(group, rock, stone, layout.rocks, (item) => [item.scale * 1.6, item.scale, item.scale * 1.3]);
      instances(group, reeds, grassMaterial, layout.grass, (item) => [item.scale * 1.4, item.scale, item.scale * 1.4]);
      instances(group, log, wood, layout.logs, (item) => [item.scale, item.scale, item.scale]);
      instances(group, flower, flowerMaterial, layout.flowers, (item) => [item.scale, item.scale, item.scale]);
      instances(group, bird, birdMaterial, layout.birds, (item) => [item.scale, item.scale, item.scale]);
    },
  };
}
