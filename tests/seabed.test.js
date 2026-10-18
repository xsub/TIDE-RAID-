import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createSeabed, seabedHeight} from '../src/seabed.js';
import {waterDepth} from '../src/depth.js';
import {createState} from '../src/physics.js';
import {cameraPose} from '../src/camera.js';
import {readPreferences} from '../src/preferences.js';

test('seabed uses depth geometry and fixed bounded batches, reusing buffers across movement', () => {
  const scene = new THREE.Scene(); const view = createSeabed(scene); const group = scene.children[0];
  const state = createState(); const camera = new THREE.PerspectiveCamera();
  view.update(state, camera, 0, 1, {sun: 1});
  assert.equal(group.children.length, 4);
  const [floor, rocks, rays] = group.children;
  const positions = floor.geometry.attributes.position.array;
  assert.equal(positions.length, 33 * 33 * 3); assert.ok(rocks.count <= 48);
  assert.equal(rays.geometry.attributes.position.count, 48);
  for (let index = 0; index < positions.length; index += 3) assert.equal(positions[index + 1], Math.fround(seabedHeight(positions[index], positions[index + 2])));
  const original = positions.slice();
  view.update({...state, x: state.x + 64}, camera, 2, 1, {sun: 0});
  assert.equal(floor.geometry.attributes.position.array, positions); assert.equal(rays.visible, false);
  view.update(state, camera, 3, 1, {sun: 1}); assert.deepEqual(positions, original);
  assert.ok([...floor.geometry.attributes.normal.array].every(Number.isFinite));
  view.update(state, camera, 4, 0, {sun: 1}); assert.equal(group.visible, false);
  assert.equal(seabedHeight(state.x, state.z), -Math.min(80, waterDepth(state.x, state.z)));
});

test('wreck camera orbits below the surface, ignores manual height and persists selection', () => {
  const state = {...createState(), y: -25};
  const rear = cameraPose(state, 'wreck', 0, 16 / 9);
  const front = cameraPose(state, 'wreck', 180, 16 / 9);
  assert.ok(rear.y < 0); assert.equal(rear.lookY, state.y + 0.3);
  assert.ok(Math.abs((rear.z + front.z) / 2 - state.z) < 1e-8);
  assert.deepEqual(rear, cameraPose(state, 'wreck', 0, 16 / 9, false, 400, 1, {height: 400, elevation: 10}));
  assert.equal(readPreferences({getItem: () => JSON.stringify({camera: 'wreck'})}).camera, 'wreck');
});

test('seabed reuses supplied photographic assets without changing shared texture settings', () => {
  const scene = new THREE.Scene(); const view = createSeabed(scene);
  const map = new THREE.Texture(); const rockGeometry = new THREE.IcosahedronGeometry(1, 0); const rockMaterial = new THREE.MeshStandardMaterial();
  view.setAssets({textures: {sand: {map}}, models: {rock: {far: [{geometry: rockGeometry, material: rockMaterial}]}}});
  const [floor, rocks] = scene.children[0].children;
  assert.equal(floor.material.map, map); assert.equal(rocks.geometry, rockGeometry); assert.equal(rocks.material, rockMaterial);
  assert.equal(map.repeat.x, 1); assert.equal(map.repeat.y, 1);
  view.update(createState(), new THREE.PerspectiveCamera(), 0, 1, {sun: 1});
  const version = floor.geometry.attributes.position.version;
  view.update(createState(), new THREE.PerspectiveCamera(), 100, 1, {sun: 0.5});
  assert.equal(floor.geometry.attributes.position.version, version);
  assert.ok(scene.children[0].children.every((child) => !child.castShadow && !child.isLight));
});
